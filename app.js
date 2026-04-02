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
let dataChannel = null
let isSearching = false
let isScreenSharing = false
let cameraTrack = null

const statusEl = document.getElementById('status')
const localVideo = document.getElementById('local')
const remoteVideo = document.getElementById('remote')

const chatInput = document.getElementById('chatInput')
const chatBox = document.getElementById('chatBox')
const disconnectBtn = document.getElementById('disconnect')
const randomBtn = document.getElementById('random')
const shareBtn = document.getElementById('share')
const micBtn = document.getElementById('mic')
const camBtn = document.getElementById('cam')
if (shareBtn) {
  shareBtn.classList.add('hidden')
  shareBtn.disabled = true
}

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
}

let micEnabled = localStorage.getItem('micEnabled') !== 'false'
let camEnabled = localStorage.getItem('camEnabled') !== 'false'

function appendMessage(sender, text) {
  if (!chatBox) return

  const div = document.createElement('div')
  div.innerText = `${sender}: ${text}`
  chatBox.appendChild(div)
  chatBox.scrollTop = chatBox.scrollHeight
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
  pc.onconnectionstatechange = () => {
    if (
      pc.connectionState === 'disconnected' ||
      pc.connectionState === 'failed' ||
      pc.connectionState === 'closed'
    ) {
      console.log('Connection lost, resetting')
      reset()
    }
  }

  if (isInitiator) {
    dataChannel = pc.createDataChannel('chat')
    setupDataChannel()
  } else {
    pc.ondatachannel = (event) => {
      dataChannel = event.channel
      setupDataChannel()
    }
  }

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })

  // Apply saved preferences (default OFF)
  localStream.getAudioTracks().forEach(t => t.enabled = micEnabled)
  localStream.getVideoTracks().forEach(t => t.enabled = camEnabled)

  updateMediaButtons()

  localVideo.srcObject = localStream
  cameraTrack = localStream.getVideoTracks()[0]

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

function setupDataChannel() {
  if (!dataChannel) return

  dataChannel.onopen = () => {
    console.log('Chat channel open')
    statusEl.innerText = 'Connected'
    if (randomBtn) {
      randomBtn.innerText = 'Disconnect'
      randomBtn.classList.add('bg-red-700')
      randomBtn.classList.remove('bg-gray-700', 'bg-green-700')
    }
    if (shareBtn) {
      shareBtn.classList.remove('hidden')
      shareBtn.disabled = false
    }
  }

  dataChannel.onmessage = (event) => {
    appendMessage('Peer', event.data)
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
  isSearching = false
  if (chatBox) chatBox.innerHTML = ''
  if (randomBtn) {
    randomBtn.innerText = 'Start Random Match'
    randomBtn.classList.remove('bg-red-700')
    randomBtn.classList.add('bg-green-700')
  }
  isScreenSharing = false

  if (shareBtn) {
    shareBtn.classList.add('hidden')
    shareBtn.disabled = true
    shareBtn.innerText = 'Share Screen'
  }
  updateMediaButtons()
}

function updateMediaButtons() {
  if (micBtn) {
    micBtn.innerText = micEnabled ? 'ON' : 'OFF'

    micBtn.classList.toggle('bg-green-700', micEnabled)
    micBtn.classList.toggle('bg-gray-700', !micEnabled)
  }

  if (camBtn) {
    camBtn.innerText = camEnabled ? 'ON' : 'OFF'

    camBtn.classList.toggle('bg-green-700', camEnabled)
    camBtn.classList.toggle('bg-gray-700', !camEnabled)
  }
}


// ---------------- UI ----------------

randomBtn.onclick = () => {
  // If connected → disconnect
  if (pc) {
    safeSend({ type: 'leave' })
    reset()
    randomBtn.classList.remove('bg-red-700')
    randomBtn.classList.add('bg-gray-700')
    return
  }

  // If searching → abort search
  if (isSearching) {
    safeSend({ type: 'leave' })
    reset()
    randomBtn.classList.remove('bg-red-700')
    randomBtn.classList.add('bg-gray-700')
    return
  }

  // Start searching
  isSearching = true
  statusEl.innerText = 'Searching...'
  randomBtn.innerText = 'Abort'
  randomBtn.classList.add('bg-red-700')
  randomBtn.classList.remove('bg-gray-700', 'bg-green-700')
  safeSend({ type: "find-peer" })
}

if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && dataChannel && dataChannel.readyState === 'open') {
      e.preventDefault()

      const text = chatInput.value.trim()
      if (!text) return

      appendMessage('You', text)
      dataChannel.send(text)
      chatInput.value = ''
    }
  })
}

if (disconnectBtn) {
  disconnectBtn.onclick = () => {
    safeSend({ type: 'leave' })
    reset()
    if (randomBtn) {
      randomBtn.classList.remove('bg-red-700')
      randomBtn.classList.add('bg-gray-700')
    }
  }
}

async function toggleScreenShare() {
  if (!pc) return

  const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
  if (!sender) return

  // Stop sharing
  if (isScreenSharing) {
    await sender.replaceTrack(cameraTrack)
    localVideo.srcObject = localStream
    isScreenSharing = false

    if (shareBtn) shareBtn.innerText = 'Share Screen'
    return
  }

  // Start screen share
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const screenTrack = stream.getVideoTracks()[0]

    await sender.replaceTrack(screenTrack)
    localVideo.srcObject = stream

    isScreenSharing = true

    if (shareBtn) shareBtn.innerText = 'Stop Sharing'

    screenTrack.onended = async () => {
      await sender.replaceTrack(cameraTrack)
      localVideo.srcObject = localStream
      isScreenSharing = false

      if (shareBtn) shareBtn.innerText = 'Share Screen'
    }
  } catch (e) {
    console.error('Screen share failed', e)
  }
}

if (shareBtn) {
  shareBtn.onclick = toggleScreenShare
}

if (micBtn) {
  micBtn.onclick = () => {
    micEnabled = !micEnabled
    localStorage.setItem('micEnabled', micEnabled)

    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = micEnabled)
    }

    updateMediaButtons()
  }
}

if (camBtn) {
  camBtn.onclick = () => {
    camEnabled = !camEnabled
    localStorage.setItem('camEnabled', camEnabled)

    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = camEnabled)
    }

    updateMediaButtons()
  }
}

updateMediaButtons()

// init
connectSocket()