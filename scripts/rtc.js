import { safeSend } from './network.js'

let pc = null
let localStream = null
let peerId = null
let pendingCandidates = []
let dataChannel = null
let cameraTrack = null
let isScreenSharing = false

let connectionMode = localStorage.getItem('connectionMode') || 'p2p' // 'p2p' or 'relay'

export function setConnectionMode(mode) {
  connectionMode = mode === 'relay' ? 'relay' : 'p2p'
  localStorage.setItem('connectionMode', connectionMode)
}

export function getConnectionMode() {
  return connectionMode
}

function getStoredState(key, defaultValue = true) {
  const val = localStorage.getItem(key)
  if (val === null) return defaultValue
  return val === 'true'
}

function setStoredState(key, value) {
  localStorage.setItem(key, value ? 'true' : 'false')
}

// strict modes. Either this or that. Punktum.
function getIceConfig() {
  if (connectionMode === 'relay') {
    return {
      iceServers: [
        {
          urls: ["turns:turn.radioteletype.net:5349?transport=tcp"],
          username: "teletype",
          credential: "StrongPassword123"
        }
      ],
      iceTransportPolicy: 'relay'
    }
  }

  // P2P ONLY (no TURN fallback)
  return {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ],
    iceTransportPolicy: 'all'
  }
}

export const rtcHandlers = {
  onLocalStream: null,
  onRemoteStream: null,
  onConnected: null,
  onDisconnected: null,
  onMessage: null,
  onScreenShareStopped: null,
  sendMessage: null,
}

export async function startPeer(isInitiator, id) {
  if (pc) return

  peerId = id
  pc = new RTCPeerConnection(getIceConfig())

  pc.onconnectionstatechange = () => {
    if (!pc) return
    if (['disconnected','failed','closed'].includes(pc.connectionState)) {
      resetPeer()
      rtcHandlers.onDisconnected?.()
    }
  }

  if (isInitiator) {
    dataChannel = pc.createDataChannel('chat')
    setupDataChannel()
  } else {
    pc.ondatachannel = (e) => {
      dataChannel = e.channel
      setupDataChannel()
    }
  }

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

  const micEnabled = getStoredState('micEnabled', true)
  const camEnabled = getStoredState('camEnabled', true)

  const audioTrack = localStream.getAudioTracks()[0]
  if (audioTrack) audioTrack.enabled = micEnabled

  const videoTrack = localStream.getVideoTracks()[0]
  if (videoTrack) videoTrack.enabled = camEnabled

  rtcHandlers.onLocalStream?.(localStream)

  cameraTrack = localStream.getVideoTracks()[0]

  localStream.getTracks().forEach(track => {
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

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      safeSend({ type: "ice-candidate", target: peerId, candidate: e.candidate })
    }
  }

  if (isInitiator) {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    safeSend({ type: "offer", target: peerId, sdp: offer })
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    rtcHandlers.onConnected?.()
    rtcHandlers.sendMessage = sendMessage
  }

  dataChannel.onmessage = (e) => {
    rtcHandlers.onMessage?.(e.data)
  }
}

export function sendMessage(text) {
  if (!dataChannel || dataChannel.readyState !== 'open') return false

  try {
    dataChannel.send(text)
    return true
  } catch {
    return false
  }
}

export async function handleSignal(msg) {
  if (msg.type === "peer-found") {
    if (!pc && msg.initiator) {
      await startPeer(true, msg.peerId)
    }
  }

  if (msg.type === "offer") {
    await startPeer(false, msg.from)
    await pc.setRemoteDescription(msg.sdp)

    for (const c of pendingCandidates) {
      try { await pc.addIceCandidate(c) } catch {}
    }
    pendingCandidates = []

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    safeSend({ type: "answer", target: msg.from, sdp: answer })
  }

  if (msg.type === "answer") {
    await pc.setRemoteDescription(msg.sdp)

    for (const c of pendingCandidates) {
      try { await pc.addIceCandidate(c) } catch {}
    }
    pendingCandidates = []
  }

  if (msg.type === "ice-candidate") {
    if (pc && msg.candidate) {
      if (pc.remoteDescription) {
        try { await pc.addIceCandidate(msg.candidate) } catch {}
      } else {
        pendingCandidates.push(msg.candidate)
      }
    }
  }
}

export function toggleMic() {
  if (!localStream) return false

  const track = localStream.getAudioTracks()[0]
  if (!track) return false

  track.enabled = !track.enabled
  setStoredState('micEnabled', track.enabled)

  return track.enabled
}

export function toggleCam() {
  if (!localStream) return false

  const track = localStream.getVideoTracks()[0]
  if (!track) return false

  track.enabled = !track.enabled
  setStoredState('camEnabled', track.enabled)

  return track.enabled
}

export async function toggleScreenShare() {
  if (!pc) return false

  try {
    const sender = pc.getSenders().find(s => s.track?.kind === 'video')

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
  if (dataChannel) {
    try { dataChannel.close() } catch {}
    dataChannel = null
  }

  if (pc) {
    try { pc.close() } catch {}
    pc = null
  }

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop())
    localStream = null
  }

  peerId = null
}