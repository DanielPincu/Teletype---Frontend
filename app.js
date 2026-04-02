let socket
let sendQueue = []

function safeSend(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    sendQueue.push(data)
    return
  }
  socket.send(JSON.stringify(data))
}

let pc = null
let localStream = null
let peerId = null
let pendingCandidates = []

const statusEl = document.getElementById('status')
const localVideo = document.getElementById('local')
const remoteVideo = document.getElementById('remote')
const screenBtn = document.getElementById('shareScreen')

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
}

// ---------------- WS ----------------

function connectSocket() {
  const protocol = location.protocol === "https:" ? "wss" : "ws"

  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1'

  const host = isLocal
    ? 'localhost:3000'
    : location.host

  socket = new WebSocket(`${protocol}://${host}/ws`)

  socket.onopen = () => {
    console.log('WS connected')

    while (sendQueue.length > 0) {
      socket.send(JSON.stringify(sendQueue.shift()))
    }
  }

  socket.onmessage = async (event) => {
    const msg = JSON.parse(event.data)
    console.log("WS:", msg)

    if (msg.type === "peer-found") {
      if (pc) return

      peerId = msg.peerId

      if (msg.initiator) {
        await startPeer(true)
      }
    }

    if (msg.type === "offer") {
      if (pc) return

      peerId = msg.from

      await startPeer(false)
      await pc.setRemoteDescription(msg.sdp)

      flushIce()

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      safeSend({
        type: "answer",
        target: peerId,
        sdp: answer
      })
    }

    if (msg.type === "answer") {
      await pc.setRemoteDescription(msg.sdp)
      flushIce()
    }

    if (msg.type === "ice-candidate") {
      if (!pc || !pc.remoteDescription) {
        pendingCandidates.push(msg.candidate)
        return
      }

      await pc.addIceCandidate(msg.candidate)
    }

    if (msg.type === "error") {
      reset()
    }

    if (msg.type === "already-paired") {
      console.warn('Already paired, resetting state')
      reset()
      return
    }
  }
}

// ---------------- RTC ----------------

async function startPeer(isInitiator) {
  if (pc) return

  pc = new RTCPeerConnection(config)

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })

  localVideo.srcObject = localStream

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream)
  })

  pc.ontrack = (event) => {
    let stream = remoteVideo.srcObject

    if (!stream) {
      stream = new MediaStream()
      remoteVideo.srcObject = stream
    }

    stream.addTrack(event.track)
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      safeSend({
        type: "ice-candidate",
        target: peerId,
        candidate: event.candidate
      })
    }
  }

  if (isInitiator) {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    safeSend({
      type: "offer",
      target: peerId,
      sdp: offer
    })
  }
}

function flushIce() {
  pendingCandidates.forEach(c => pc.addIceCandidate(c))
  pendingCandidates = []
}

function reset() {
  pc?.close()
  pc = null

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop())
    localStream = null
  }

  localVideo.srcObject = null
  remoteVideo.srcObject = null
  peerId = null
  pendingCandidates = []

  statusEl.innerText = 'Idle'
}


// ---------------- SCREEN SHARE ----------------

if (screenBtn) {
  screenBtn.onclick = async () => {
    if (!pc) {
      console.warn('No active call')
      return
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      })

      const screenTrack = screenStream.getVideoTracks()[0]

      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')

      if (sender) {
        await sender.replaceTrack(screenTrack)
      }

      localVideo.srcObject = screenStream

      screenTrack.onended = async () => {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })

        const camTrack = camStream.getVideoTracks()[0]

        if (sender) {
          await sender.replaceTrack(camTrack)
        }

        localVideo.srcObject = camStream
      }

    } catch (err) {
      console.error('Screen share error:', err)
    }
  }
}

// ---------------- UI ----------------

document.getElementById('random').onclick = () => {
  statusEl.innerText = 'Searching...'
  safeSend({ type: "find-peer" })
}

document.getElementById('join').onclick = () => {
  const roomId = document.getElementById('roomInput').value

  safeSend({
    type: "join-room",
    roomId
  })
}

document.getElementById('disconnect').onclick = () => {
  safeSend({ type: 'leave' })
  reset()
}

// init
connectSocket()