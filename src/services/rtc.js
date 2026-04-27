import { safeSend } from './network.js'

let pc = null
let localStream = null
let peerId = null
let pendingCandidates = []
let chatChannel = null
let fileTransferChannel = null
let cameraTrack = null
let isScreenSharing = false
let connectTimeoutId = null

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

function getIceConfig() {
  if (connectionMode === 'relay') {
    return {
      iceServers: [
        {
          urls: ['turns:turn.radioteletype.net:5349?transport=tcp'],
          username: 'teletype',
          credential: 'StrongPassword123',
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
  sendMessage: null,
  sendFileControl: null,
  sendFileChunk: null,
}

export async function startPeer(isInitiator, id) {
  if (pc) return

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

  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream)
  })

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
        resetPeer()
        rtcHandlers.onConnectionFailed?.('timeout')
        rtcHandlers.onDisconnected?.()
      }
    }, P2P_CONNECT_TIMEOUT_MS)
  }

  if (isInitiator) {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
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

    for (const candidate of pendingCandidates) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {}
    }
    pendingCandidates = []

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    safeSend({ type: 'answer', target: msg.from, sdp: answer })
  }

  if (msg.type === 'answer') {
    await pc.setRemoteDescription(msg.sdp)

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

  pendingCandidates = []
  cameraTrack = null
  isScreenSharing = false

  rtcHandlers.sendMessage = null
  rtcHandlers.sendFileControl = null
  rtcHandlers.sendFileChunk = null
  rtcHandlers.onFileTransferReset?.()

  peerId = null
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    resetPeer()
  })
}
