let pc = null
let localStream = null
let peerId = null
let pendingCandidates = []

const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
}

export async function startPeer(isInitiator, target, send, onRemote) {
  peerId = target

  pc = new RTCPeerConnection(config)

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })

  onRemote.local(localStream)

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream)
  })

  pc.ontrack = (event) => {
    let stream = onRemote.remoteEl.srcObject

    if (!stream) {
      stream = new MediaStream()
      onRemote.remoteEl.srcObject = stream
    }

    stream.addTrack(event.track)
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      send({
        type: 'ice-candidate',
        target: peerId,
        candidate: event.candidate
      })
    }
  }

  if (isInitiator) {
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    send({
      type: 'offer',
      target: peerId,
      offer
    })
  }
}

export async function handleOffer(msg, send) {
  await pc.setRemoteDescription(msg.offer)

  for (const c of pendingCandidates) {
    await pc.addIceCandidate(c)
  }
  pendingCandidates = []

  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)

  send({
    type: 'answer',
    target: msg.from,
    answer
  })
}

export async function handleAnswer(msg) {
  await pc.setRemoteDescription(msg.answer)

  for (const c of pendingCandidates) {
    await pc.addIceCandidate(c)
  }
  pendingCandidates = []
}

export async function addIce(candidate) {
  if (!pc || !pc.remoteDescription) {
    pendingCandidates.push(candidate)
    return
  }

  await pc.addIceCandidate(candidate)
}

export function closePeer() {
  pc?.close()
  pc = null
}