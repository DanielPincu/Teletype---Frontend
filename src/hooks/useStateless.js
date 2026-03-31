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
  const isSearching = useRef(false)

  const log = (text, type = 'system') =>
    setMessages(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: new Date().toLocaleTimeString(),
        text,
        type
      }
    ])

  useEffect(() => {

    connectWS(
      async (msg) => {
        switch (msg.type) {
          case 'peer-found': {
            isSearching.current = false
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
              onState: (s) => {
                setStatus(s)

                if (s === 'connected' || s === 'connecting') return

                if (s === 'disconnected' || s === 'failed' || s === 'closed') {
                  log('SIGNAL LOST (LINK FAILURE)')

                  if (localRef.current) localRef.current.srcObject = null
                  if (remoteRef.current) remoteRef.current.srcObject = null

                  close()
                  setStatus('lost')
                }
              }
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
            isSearching.current = false

            log('REMOTE UNIT DISCONNECTED')
            setStatus('disconnected')

            if (localRef.current) localRef.current.srcObject = null
            if (remoteRef.current) remoteRef.current.srcObject = null

            close()
            break
          }
        }
      },
      () => {
        log('LINK TO COMMAND NODE ESTABLISHED')
        // keep UI in idle state; this is WS connected, not peer connected
        setStatus('idle')
      },
      () => {
        isSearching.current = false

        log('SIGNAL LOST (NETWORK FAILURE)')
        setStatus('lost')

        if (localRef.current) localRef.current.srcObject = null
        if (remoteRef.current) remoteRef.current.srcObject = null
      }
    )
  }, [])

  const startRandom = () => {
    if (isSearching.current) return

    isSearching.current = true

    // reset rtc immediately so new connection can form
    close()

    // notify backend after
    sendWS({ type: 'leave' })

    if (localRef.current) localRef.current.srcObject = null
    if (remoteRef.current) remoteRef.current.srcObject = null

    log('SCANNING FREQUENCIES...')
    setStatus('searching')

    setTimeout(() => {
      sendWS({ type: 'find-peer' })
    }, 100)
  }

  const joinRoom = () => {
    if (!roomId) return

    isSearching.current = false

    close()
    sendWS({ type: 'leave' })

    if (localRef.current) localRef.current.srcObject = null
    if (remoteRef.current) remoteRef.current.srcObject = null

    log(`TUNING TO CHANNEL ${roomId}...`)
    setStatus('joining-room')

    setTimeout(() => {
      sendWS({ type: 'join-room', roomId })
    }, 200)
  }

  const cancelJoin = () => {
    log('CANCELING CHANNEL TUNING...')

    // stop waiting state
    setStatus('idle')

    // notify backend to leave room queue
    sendWS({ type: 'leave' })

    // clear streams just in case
    if (localRef.current) localRef.current.srcObject = null
    if (remoteRef.current) remoteRef.current.srcObject = null

    close()
  }

  const sendMessage = () => {
    if (!input) return
    send(input)
    log(input, 'tx')
    setInput('')
  }

  const terminate = () => {
    isSearching.current = false

    log('CONNECTION TERMINATED BY OPERATOR')
    // send goodbye message to peer before disconnect
    send('BYE BYE - IM OUT')
    log('BYE BYE - IM OUT', 'tx')
    sendWS({ type: 'leave' })

    // give WS time to reach backend and notify peer
    setTimeout(() => {
      close()
      setStatus('idle')

      if (localRef.current) localRef.current.srcObject = null
      if (remoteRef.current) remoteRef.current.srcObject = null
    }, 600)
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
    cancelJoin,
    sendMessage,
    terminate
  }
}