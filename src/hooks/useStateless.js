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
  const [messages, setMessages] = useState([
    { text: 'TERMINAL ONLINE', type: 'system' }
  ])
  const [input, setInput] = useState('')
  const [roomId, setRoomId] = useState('')

  const log = (text, type = 'system') =>
    setMessages(prev => [...prev, { text, type }])

  useEffect(() => {

    connectWS(
      async (msg) => {
        switch (msg.type) {
          case 'peer-found': {
            log('PEER FOUND → ESTABLISHING SECURE LINK...')
            setStatus('connecting')

            createPeer({
              onRemote: (stream) => {
                if (remoteRef.current) {
                  remoteRef.current.srcObject = stream
                }
              },
              onData: (d) => log(d, 'peer'),
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
            log('INCOMING SIGNAL (OFFER RECEIVED)')
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
            log('LINK CONFIRMED (HANDSHAKE COMPLETE)')
            if (!msg.answer) return
            await handleAnswer(msg.answer)
            break
          }

          case 'ice-candidate': {
            if (!msg.candidate) return
            await addIce(msg.candidate)
            break
          }

          case 'waiting-in-room': {
            log('NO SIGNAL DETECTED → STANDING BY...')
            setStatus('waiting')
            break
          }

          case 'peer-left': {
            console.log('peer-left received')
            log('SIGNAL LOST (REMOTE UNIT DISCONNECTED)')
            setStatus('disconnected')
            close()
            break
          }
        }
      },
      () => {
        log('LINK TO COMMAND NODE ESTABLISHED')
        setStatus('connected')
      },
      () => {
        log('SIGNAL LOST (NETWORK FAILURE)')
        setStatus('lost')
      }
    )
  }, [])

  const startRandom = () => {
    log('SCANNING FREQUENCIES...')
    setStatus('searching')
    sendWS({ type: 'find-peer' })
  }

  const joinRoom = () => {
    if (!roomId) return
    log(`TUNING TO CHANNEL ${roomId}...`)
    setStatus('joining-room')
    sendWS({ type: 'join-room', roomId })
  }

  const sendMessage = () => {
    if (!input) return
    send(input)
    log(input, 'tx')
    setInput('')
  }

  const terminate = () => {
    log('CONNECTION TERMINATED BY OPERATOR')

    sendWS({ type: 'leave' })
    setStatus('idle')

    // delay close so React can render log first
    setTimeout(() => {
      close()
    }, 100)
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
    sendMessage,
    terminate,
  }
}