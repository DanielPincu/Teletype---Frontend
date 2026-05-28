import { safeSend } from './network.js'

let pc = null
let localStream = null
let peerId = null
let pendingCandidates = []
let chatChannel = null
let fileTransferChannel = null
let cameraTrack = null
let micAudioContext = null
let micGainNode = null
let processedMicTrack = null
let desiredMicGain = 1
let isScreenSharing = false
let connectTimeoutId = null
let rtcSessionId = 0
let reconnectAttempts = 0

let connectionMode = typeof window !== 'undefined' && window.localStorage.getItem('connectionMode') === 'relay' ? 'relay' : 'p2p'
const P2P_CONNECT_TIMEOUT_MS = 8000

export function setConnectionMode(mode) {
  connectionMode = mode === 'relay' ? 'relay' : 'p2p'
  window.localStorage.setItem('connectionMode', connectionMode)
}

export function getConnectionMode() {
  return connectionMode
}

function getStoredState(key, defaultValue = true) {
  const value = window.localStorage.getItem(key)
  if (value === null) return defaultValue
  return value === 'true'
}

function setStoredState(key, value) {
  window.localStorage.setItem(key, value ? 'true' : 'false')
}

function extractFingerprintLines(description) {
  const sdp = description?.sdp
  if (!sdp) return []

  return sdp
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith('a=fingerprint:'))
    .map((line) => line.toLowerCase())
}

async function generateSyncCode(fingerprints) {
  const payload = fingerprints
    .slice()
    .sort()
    .join('|')

  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload),
  )

  const bytes = new Uint8Array(digest)
  const value =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  const code = String(value % 1_000_000).padStart(6, '0')

  return `${code.slice(0, 3)}-${code.slice(3)}`
}

function getIceConfig() {
  if (connectionMode === 'relay') {
    const username = import.meta.env.VITE_TURN_USERNAME
    const credential = import.meta.env.VITE_TURN_PASSWORD

    if (!username || !credential) {
      console.warn('TURN relay mode is missing VITE_TURN_USERNAME or VITE_TURN_PASSWORD')

      return {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        iceTransportPolicy: 'all',
      }
    }

    return {
      iceServers: [
        {
          urls: ['turns:turn.radioteletype.net:5349?transport=tcp'],
          username,
          credential,
        },
      ],
      iceTransportPolicy: 'relay',
    }
  }

  return {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    iceTransportPolicy: 'all',
  }
}

function getCandidatePathLabel(localType, remoteType) {
  if (!localType && !remoteType) return 'SCANNING'
  if (localType === 'relay' && remoteType === 'relay') return 'RELAY'
  if (localType === 'relay' || remoteType === 'relay') return 'HYBRID'
  if (localType === 'srflx' || remoteType === 'srflx') return 'STUN'
  if (localType === 'host' && remoteType === 'host') return 'LOCAL'
  return `${localType || 'unknown'} / ${remoteType || 'unknown'}`.toUpperCase()
}

export const rtcHandlers = {
  onLocalStream: null,
  onRemoteStream: null,
  onConnected: null,
  onDisconnected: null,
  onMessage: null,
  onFileChannelOpen: null,
  onFileChannelClosed: null,
  onFileControlMessage: null,
  onFileData: null,
  onFileTransferReset: null,
  onScreenShareStopped: null,
  onConnectionFailed: null,
  onIceStateChange: null,
  onConnectionType: null,
  onSyncCode: null,
  sendMessage: null,
  sendFileControl: null,
  sendFileChunk: null,
}

export function getReconnectAttempts() {
  return reconnectAttempts
}

export function setMicrophoneGain(value) {
  desiredMicGain = Math.max(0.2, Math.min(3, value))

  if (!micGainNode) return
  micGainNode.gain.value = desiredMicGain
}

function createProcessedAudioTrack(stream) {
  const audioTrack = stream.getAudioTracks()[0]
  if (!audioTrack) return null

  try {
    micAudioContext = new (window.AudioContext || window.webkitAudioContext)()
    const source = micAudioContext.createMediaStreamSource(new MediaStream([audioTrack]))
    micGainNode = micAudioContext.createGain()
    micGainNode.gain.value = desiredMicGain

    const destination = micAudioContext.createMediaStreamDestination()
    source.connect(micGainNode)
    micGainNode.connect(destination)

    processedMicTrack = destination.stream.getAudioTracks()[0] || null
    if (processedMicTrack) processedMicTrack.enabled = audioTrack.enabled

    return processedMicTrack
  } catch (error) {
    console.warn('Failed to create microphone gain node', error)
    micAudioContext = null
    micGainNode = null
    processedMicTrack = null
    return null
  }
}

export async function getConnectionDiagnostics() {
  const base = {
    updatedAt: Date.now(),
    connected: Boolean(pc && pc.connectionState === 'connected'),
    connectionState: pc?.connectionState || 'idle',
    iceState: pc?.iceConnectionState || 'new',
    signalingState: pc?.signalingState || 'stable',
    connectionMode,
    pathLabel: 'OFFLINE',
    localCandidateType: null,
    remoteCandidateType: null,
    latencyMs: null,
    packetsLost: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    codec: 'N/A',
    reconnectAttempts,
  }

  if (!pc) return base

  try {
    const stats = await pc.getStats()
    let selectedPair = null
    const codecs = new Set()

    stats.forEach((report) => {
      if (report.type === 'transport' && report.selectedCandidatePairId) {
        selectedPair = stats.get(report.selectedCandidatePairId)
      }

      if ((report.type === 'inbound-rtp' || report.type === 'outbound-rtp') && !report.isRemote) {
        base.bytesSent += Number(report.bytesSent) || 0
        base.bytesReceived += Number(report.bytesReceived) || 0
        base.packetsLost += Number(report.packetsLost) || 0
        base.packetsReceived += Number(report.packetsReceived) || 0

        const codec = report.codecId ? stats.get(report.codecId) : null
        if (codec?.mimeType) {
          codecs.add(codec.mimeType.replace(/^audio\//, '').replace(/^video\//, '').toUpperCase())
        }
      }
    })

    if (selectedPair) {
      const local = stats.get(selectedPair.localCandidateId)
      const remote = stats.get(selectedPair.remoteCandidateId)
      base.localCandidateType = local?.candidateType || null
      base.remoteCandidateType = remote?.candidateType || null
      base.pathLabel = getCandidatePathLabel(base.localCandidateType, base.remoteCandidateType)
      base.latencyMs = Number.isFinite(selectedPair.currentRoundTripTime)
        ? Math.round(selectedPair.currentRoundTripTime * 1000)
        : null
    } else if (pc.connectionState === 'connected') {
      base.pathLabel = 'CONNECTED'
    }

    base.codec = codecs.size ? Array.from(codecs).join(' / ') : 'N/A'
  } catch (error) {
    console.warn('Diagnostics stats failed', error)
  }

  return base
}

async function maybeEmitSyncCode(sessionId) {
  if (!pc || sessionId !== rtcSessionId) return
  if (pc.connectionState !== 'connected') return

  const localFingerprints = extractFingerprintLines(pc.localDescription)
  const remoteFingerprints = extractFingerprintLines(pc.remoteDescription)

  if (!localFingerprints.length || !remoteFingerprints.length) return

  try {
    const code = await generateSyncCode([...localFingerprints, ...remoteFingerprints])
    if (!pc || sessionId !== rtcSessionId) return
    rtcHandlers.onSyncCode?.(code)
  } catch (error) {
    console.warn('Failed to generate sync code', error)
  }
}

export async function startPeer(isInitiator, id) {
  if (pc) return

  rtcSessionId += 1
  const sessionId = rtcSessionId
  peerId = id
  pc = new RTCPeerConnection(getIceConfig())

  const clearConnectTimeout = () => {
    if (connectTimeoutId) {
      window.clearTimeout(connectTimeoutId)
      connectTimeoutId = null
    }
  }

  pc.onconnectionstatechange = () => {
    if (!pc) return

    if (pc.connectionState === 'connected') {
      clearConnectTimeout()
      void maybeEmitSyncCode(sessionId)
    }

    if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
      clearConnectTimeout()
      resetPeer()
      rtcHandlers.onDisconnected?.()
    }
  }

  pc.oniceconnectionstatechange = () => {
    if (!pc) return

    rtcHandlers.onIceStateChange?.(pc.iceConnectionState)

    if (['connected', 'completed'].includes(pc.iceConnectionState)) {
      clearConnectTimeout()
      return
    }

    if (['failed', 'disconnected', 'closed'].includes(pc.iceConnectionState)) {
      clearConnectTimeout()
      if (pc.iceConnectionState !== 'closed') reconnectAttempts += 1
      resetPeer()
      rtcHandlers.onConnectionFailed?.(pc.iceConnectionState)
      rtcHandlers.onDisconnected?.()
    }
  }

  const detectConnectionType = async () => {
    if (!pc) return

    try {
      const stats = await pc.getStats()
      let selectedPair = null

      stats.forEach((report) => {
        if (report.type === 'transport' && report.selectedCandidatePairId) {
          selectedPair = stats.get(report.selectedCandidatePairId)
        }
      })

      if (!selectedPair) return

      const local = stats.get(selectedPair.localCandidateId)
      const remote = stats.get(selectedPair.remoteCandidateId)
      const localType = local?.candidateType
      const remoteType = remote?.candidateType

      let finalType = 'HYBRID'

      if (localType === 'relay' && remoteType === 'relay') {
        finalType = 'relay'
      } else if (
        (localType === 'relay' && (remoteType === 'srflx' || remoteType === 'host')) ||
        (remoteType === 'relay' && (localType === 'srflx' || localType === 'host'))
      ) {
        finalType = 'hybrid'
      } else if (localType === 'srflx' || remoteType === 'srflx') {
        finalType = 'srflx'
      } else if (localType === 'host' && remoteType === 'host') {
        finalType = 'host'
      }

      rtcHandlers.onConnectionType?.(finalType)
    } catch (error) {
      console.warn('getStats failed', error)
    }
  }

  pc.addEventListener('connectionstatechange', () => {
    if (pc?.connectionState === 'connected') {
      window.setTimeout(detectConnectionType, 500)
    }
  })

  if (isInitiator) {
    chatChannel = pc.createDataChannel('chat')
    setupChatChannel(chatChannel)

    fileTransferChannel = pc.createDataChannel('file-transfer', { ordered: true })
    setupFileTransferChannel(fileTransferChannel)
  } else {
    pc.ondatachannel = (event) => {
      if (event.channel.label === 'chat') {
        chatChannel = event.channel
        setupChatChannel(chatChannel)
        return
      }

      if (event.channel.label === 'file-transfer') {
        fileTransferChannel = event.channel
        setupFileTransferChannel(fileTransferChannel)
      }
    }
  }

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

  const micEnabled = getStoredState('micEnabled', true)
  const camEnabled = getStoredState('camEnabled', true)
  const audioTrack = localStream.getAudioTracks()[0]
  const videoTrack = localStream.getVideoTracks()[0]

  if (audioTrack) audioTrack.enabled = micEnabled
  if (videoTrack) videoTrack.enabled = camEnabled

  rtcHandlers.onLocalStream?.(localStream)
  cameraTrack = localStream.getVideoTracks()[0]

  const sendAudioTrack = createProcessedAudioTrack(localStream) || audioTrack
  if (sendAudioTrack) pc.addTrack(sendAudioTrack, localStream)
  if (videoTrack) pc.addTrack(videoTrack, localStream)

  pc.ontrack = (event) => {
    let stream = pc.remoteStream

    if (!stream) {
      stream = new MediaStream()
      pc.remoteStream = stream
      rtcHandlers.onRemoteStream?.(stream)
    }

    stream.addTrack(event.track)
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      safeSend({ type: 'ice-candidate', target: peerId, candidate: event.candidate })
    }
  }

  if (connectionMode === 'p2p') {
    connectTimeoutId = window.setTimeout(() => {
      if (!pc) return

      const iceState = pc.iceConnectionState
      const connState = pc.connectionState

      if (!['connected', 'completed'].includes(iceState) && connState !== 'connected') {
        reconnectAttempts += 1
        resetPeer()
        rtcHandlers.onConnectionFailed?.('timeout')
        rtcHandlers.onDisconnected?.()
      }
    }, P2P_CONNECT_TIMEOUT_MS)
  }

  if (isInitiator) {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    void maybeEmitSyncCode(sessionId)
    safeSend({ type: 'offer', target: peerId, sdp: offer })
  }
}

function setupChatChannel(channel) {
  channel.onopen = () => {
    rtcHandlers.onConnected?.()
    rtcHandlers.sendMessage = sendMessage
  }

  channel.onmessage = (event) => {
    rtcHandlers.onMessage?.(event.data)
  }
}

function setupFileTransferChannel(channel) {
  rtcHandlers.sendFileControl = sendFileControl
  rtcHandlers.sendFileChunk = sendFileChunk

  channel.onopen = () => {
    rtcHandlers.onFileChannelOpen?.(channel)
  }

  channel.onclose = () => {
    rtcHandlers.onFileChannelClosed?.()
  }

  channel.onerror = () => {
    rtcHandlers.onFileChannelClosed?.()
  }

  channel.onmessage = (event) => {
    if (typeof event.data === 'string') {
      try {
        const payload = JSON.parse(event.data)
        rtcHandlers.onFileControlMessage?.(payload)
      } catch (error) {
        console.warn('Invalid file control message', error)
      }
      return
    }

    if (event.data instanceof ArrayBuffer) {
      rtcHandlers.onFileData?.(event.data)
      return
    }

    if (event.data?.arrayBuffer) {
      event.data
        .arrayBuffer()
        .then((buffer) => rtcHandlers.onFileData?.(buffer))
        .catch((error) => console.warn('Failed to read file chunk', error))
    }
  }
}

export function sendMessage(text) {
  if (!chatChannel || chatChannel.readyState !== 'open') return false

  try {
    chatChannel.send(text)
    return true
  } catch {
    return false
  }
}

export function getFileTransferChannel() {
  return fileTransferChannel
}

export function sendFileControl(payload) {
  if (!fileTransferChannel || fileTransferChannel.readyState !== 'open') return false

  try {
    fileTransferChannel.send(JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function sendFileChunk(chunk) {
  if (!fileTransferChannel || fileTransferChannel.readyState !== 'open') return false

  try {
    fileTransferChannel.send(chunk)
    return true
  } catch {
    return false
  }
}

export async function handleSignal(msg) {
  if (msg.type === 'peer-found') {
    if (!pc && msg.initiator) {
      await startPeer(true, msg.peerId)
    }
  }

  if (msg.type === 'offer') {
    await startPeer(false, msg.from)
    await pc.setRemoteDescription(msg.sdp)
    void maybeEmitSyncCode(rtcSessionId)

    for (const candidate of pendingCandidates) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {}
    }
    pendingCandidates = []

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    void maybeEmitSyncCode(rtcSessionId)
    safeSend({ type: 'answer', target: msg.from, sdp: answer })
  }

  if (msg.type === 'answer') {
    await pc.setRemoteDescription(msg.sdp)
    void maybeEmitSyncCode(rtcSessionId)

    for (const candidate of pendingCandidates) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {}
    }
    pendingCandidates = []
  }

  if (msg.type === 'ice-candidate') {
    if (pc && msg.candidate) {
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(msg.candidate)
        } catch {}
      } else {
        pendingCandidates.push(msg.candidate)
      }
    }
  }
}

export function toggleMic() {
  if (!localStream) return null

  const track = localStream.getAudioTracks()[0]
  if (!track) return null

  track.enabled = !track.enabled
  if (processedMicTrack) processedMicTrack.enabled = track.enabled
  setStoredState('micEnabled', track.enabled)
  return track.enabled
}

export function toggleCam() {
  if (!localStream) return null

  const track = localStream.getVideoTracks()[0]
  if (!track) return null

  track.enabled = !track.enabled
  setStoredState('camEnabled', track.enabled)
  return track.enabled
}

export function getScreenShareState() {
  return isScreenSharing
}

export async function toggleScreenShare() {
  if (!pc) return false

  try {
    const sender = pc.getSenders().find((entry) => entry.track?.kind === 'video')

    if (isScreenSharing) {
      const camTrack = cameraTrack || localStream?.getVideoTracks()[0]
      if (sender && camTrack) sender.replaceTrack(camTrack)

      if (localStream) {
        rtcHandlers.onLocalStream?.(localStream)
      }

      isScreenSharing = false
      rtcHandlers.onScreenShareStopped?.()
      return true
    }

    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const screenTrack = screenStream.getVideoTracks()[0]

    if (sender) sender.replaceTrack(screenTrack)
    rtcHandlers.onLocalStream?.(screenStream)

    screenTrack.onended = () => {
      const camTrack = cameraTrack || localStream?.getVideoTracks()[0]
      if (sender && camTrack) sender.replaceTrack(camTrack)

      if (localStream) {
        rtcHandlers.onLocalStream?.(localStream)
      }

      isScreenSharing = false
      rtcHandlers.onScreenShareStopped?.()
    }

    isScreenSharing = true
    return true
  } catch {
    return false
  }
}

export function resetPeer() {
  if (connectTimeoutId) {
    window.clearTimeout(connectTimeoutId)
    connectTimeoutId = null
  }

  if (chatChannel) {
    try {
      chatChannel.close()
    } catch {}
    chatChannel = null
  }

  if (fileTransferChannel) {
    try {
      fileTransferChannel.close()
    } catch {}
    fileTransferChannel = null
  }

  if (pc) {
    try {
      pc.close()
    } catch {}
    pc = null
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }

  if (processedMicTrack) {
    try {
      processedMicTrack.stop()
    } catch {}
    processedMicTrack = null
  }

  if (micAudioContext) {
    micAudioContext.close().catch(() => {})
    micAudioContext = null
  }

  micGainNode = null

  pendingCandidates = []
  cameraTrack = null
  isScreenSharing = false
  rtcSessionId += 1

  rtcHandlers.sendMessage = null
  rtcHandlers.sendFileControl = null
  rtcHandlers.sendFileChunk = null
  rtcHandlers.onFileTransferReset?.()
  rtcHandlers.onSyncCode?.(null)

  peerId = null
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    resetPeer()
  })
}
