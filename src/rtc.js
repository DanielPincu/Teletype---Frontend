import { RTC_CONFIG } from './config'

let peerConnection = null
let dataChannel = null
let localStream = null

export function createPeer({ onRemote, onData, onIce, onState }, initiator) {
  peerConnection = new RTCPeerConnection(RTC_CONFIG)

  peerConnection.onicecandidate = (e) => {
    if (e.candidate) onIce(e.candidate)
  }

  peerConnection.ontrack = (e) => {
    onRemote(e.streams[0])
  }

  peerConnection.onconnectionstatechange = () => {
    onState(peerConnection.connectionState)
  }

  if (initiator) {
    dataChannel = peerConnection.createDataChannel('chat')
    bindDC(onData)
  } else {
    peerConnection.ondatachannel = (e) => {
      dataChannel = e.channel
      bindDC(onData)
    }
  }
}

function bindDC(onData) {
  if (!dataChannel) return

  dataChannel.onmessage = (e) => onData(e.data)
  dataChannel.onopen = () => console.log('DC open')
  dataChannel.onclose = () => console.log('DC closed')
}

export async function initMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  })

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream)
  })

  return localStream
}

export async function createOffer() {
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  return peerConnection.localDescription
}

export async function handleOffer(offer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)
  return peerConnection.localDescription
}

export async function handleAnswer(answer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
}

export async function addIce(candidate) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  } catch (err) {
    console.error('ICE error:', err)
  }
}

export function send(msg) {
  if (dataChannel?.readyState === 'open') {
    dataChannel.send(msg)
  }
}

export function close() {
  dataChannel?.close()
  localStream?.getTracks().forEach((t) => t.stop())
  peerConnection?.close()
}