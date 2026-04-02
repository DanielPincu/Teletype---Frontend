import { useEffect, useRef, useState } from 'react'
import { connectWS, sendWS } from '../ws'
import { startPeer, handleOffer, handleAnswer, addIce, closePeer } from '../rtc'

export function useStateless() {
  const localRef = useRef(null)
  const remoteRef = useRef(null)

  const [roomId, setRoomId] = useState('')

  useEffect(() => {
    connectWS(async (msg) => {
      if (msg.type === 'peer-found') {
        if (msg.initiator) {
          await startPeer(true, msg.peerId, sendWS, {
            local: (s) => (localRef.current.srcObject = s),
            remoteEl: remoteRef.current
          })
        }
      }

      if (msg.type === 'offer') {
        await startPeer(false, msg.from, sendWS, {
          local: (s) => (localRef.current.srcObject = s),
          remoteEl: remoteRef.current
        })

        await handleOffer(msg, sendWS)
      }

      if (msg.type === 'answer') {
        await handleAnswer(msg)
      }

      if (msg.type === 'ice-candidate') {
        await addIce(msg.candidate)
      }
    })
  }, [])

  const startRandom = () => {
    sendWS({ type: 'find-peer' })
  }

  const joinRoom = () => {
    sendWS({ type: 'join-room', roomId })
  }

  const terminate = () => {
    closePeer()
  }

  return {
    localRef,
    remoteRef,
    status,
    startRandom,
    joinRoom,
    roomId,
    setRoomId,
    terminate
  }
}