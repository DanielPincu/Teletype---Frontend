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
  close,
  replaceVideoTrack
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
  const [isSharingScreen, setIsSharingScreen] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(() => {
    return localStorage.getItem('cameraOn') === 'true'
  })

  const [isAudioOn, setIsAudioOn] = useState(() => {
    return localStorage.getItem('audioOn') === 'true'
  })
  const cameraRefState = useRef(isCameraOn)
  const audioRefState = useRef(isAudioOn)
  const isSearching = useRef(false)

  useEffect(() => {
    cameraRefState.current = isCameraOn
  }, [isCameraOn])

  useEffect(() => {
    audioRefState.current = isAudioOn
  }, [isAudioOn])

  const toggleScreenShare = async () => {
    try {
      if (!isSharingScreen) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]

        replaceVideoTrack(screenTrack)

        if (localRef.current) {
          localRef.current.srcObject = screenStream
        }

        screenTrack.onended = async () => {
          const camStream = await initMedia()
          const camTrack = camStream.getVideoTracks()[0]

          replaceVideoTrack(camTrack)

          if (localRef.current) {
            localRef.current.srcObject = camStream
          }

          setIsSharingScreen(false)
        }

        setIsSharingScreen(true)
        log('SCREEN TRANSMISSION ENABLED')
      } else {
        const camStream = await initMedia()
        const camTrack = camStream.getVideoTracks()[0]

        replaceVideoTrack(camTrack)

        if (localRef.current) {
          localRef.current.srcObject = camStream
        }

        setIsSharingScreen(false)
        log('RETURNED TO CAMERA FEED')
      }
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      log('SCREEN SHARE FAILED')
    }
  }

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

  const playSwitchSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()

      const now = ctx.currentTime

      // first click (engage)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'square'
      osc1.frequency.setValueAtTime(900, now)
      gain1.gain.setValueAtTime(0.0001, now)
      gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.005)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.03)
      osc1.connect(gain1).connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.04)

      // tiny delay then second click (release) to simulate resistance
      const t2 = now + 0.06
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'square'
      osc2.frequency.setValueAtTime(700, t2)
      gain2.gain.setValueAtTime(0.0001, t2)
      gain2.gain.exponentialRampToValueAtTime(0.15, t2 + 0.005)
      gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.03)
      osc2.connect(gain2).connect(ctx.destination)
      osc2.start(t2)
      osc2.stop(t2 + 0.04)

      // close context shortly after
      setTimeout(() => ctx.close(), 200)
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      // ignore audio errors
    }
  }

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

            // apply initial mute states
            stream.getVideoTracks().forEach(t => t.enabled = cameraRefState.current)
            stream.getAudioTracks().forEach(t => t.enabled = audioRefState.current)

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

  const toggleCamera = () => {
    const stream = localRef.current?.srcObject

    playSwitchSound()

    setIsCameraOn(prev => {
      const next = !prev
      localStorage.setItem('cameraOn', next)

      if (stream) {
        stream.getVideoTracks().forEach(track => {
          track.enabled = next
        })
      }

      log(next ? 'CAMERA ON' : 'CAMERA OFF')
      return next
    })
  }

  const toggleAudio = () => {
    const stream = localRef.current?.srcObject

    playSwitchSound()

    setIsAudioOn(prev => {
      const next = !prev
      localStorage.setItem('audioOn', next)

      if (stream) {
        stream.getAudioTracks().forEach(track => {
          track.enabled = next
        })
      }

      log(next ? 'MIC ON' : 'MIC OFF')
      return next
    })
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
    terminate,
    isSharingScreen,
    toggleScreenShare,
    isCameraOn,
    isAudioOn,
    toggleCamera,
    toggleAudio,
  }
}