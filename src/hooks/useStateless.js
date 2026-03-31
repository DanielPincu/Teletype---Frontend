import { useEffect, useRef, useState } from 'react'
import { connectWS, sendWS } from '../ws'
import {
  createPeer,
  initMedia,
  createOffer,
  handleOffer,
  handleAnswer,
  addIce,
  send,
  close
} from '../rtc'

export function useStateless() {
  const localRef = useRef(null)
  const remoteRef = useRef(null)

  const [status, setStatus] = useState('idle')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [roomId, setRoomId] = useState('')

  const log = (m) => setMessages(prev => [...prev, m])

  useEffect(() => {
    connectWS(
      async (msg) => {
        switch (msg.type) {
          case 'peer-found': {
            setStatus('connecting')

            createPeer({
              onRemote: (stream) => {
                if (remoteRef.current) {
                  remoteRef.current.srcObject = stream
                }
              },
              onData: (d) => log('Peer: ' + d),
              onIce: (c) => {
                sendWS({
                  type: 'ice-candidate',
                  target: msg.peerId,
                  candidate: c
                })
              },
              onState: (s) => setStatus(s)
            }, !!msg.initiator)

            const stream = await initMedia()

            if (localRef.current) {
              localRef.current.srcObject = stream
            }

            if (msg.initiator) {
              const offer = await createOffer()
              sendWS({
                type: 'offer',
                target: msg.peerId,
                offer
              })
            }

            break
          }

          case 'offer': {
            if (!msg.offer) return

            const answer = await handleOffer(msg.offer)

            sendWS({
              type: 'answer',
              target: msg.from,
              answer
            })

            break
          }

          case 'answer': {
            if (!msg.answer) return
            await handleAnswer(msg.answer)
            break
          }

          case 'ice-candidate': {
            if (!msg.candidate) return
            await addIce(msg.candidate)
            break
          }

          case 'peer-left': {
            setStatus('disconnected')
            close()
            break
          }
        }
      },
      () => setStatus('connected'),
      () => setStatus('lost')
    )
  }, [])

  const startRandom = () => {
    setStatus('searching')
    sendWS({ type: 'find-peer' })
  }

  const joinRoom = () => {
    if (!roomId) return
    setStatus('joining-room')
    sendWS({ type: 'join-room', roomId })
  }

  const sendMessage = () => {
    if (!input) return
    send(input)
    log('Me: ' + input)
    setInput('')
  }

  return {
    localRef,
    remoteRef,
    status,
    messages,
    input,
    setInput,
    roomId,
    setRoomId,
    startRandom,
    joinRoom,
    sendMessage
  }
}