import { useEffect, useRef, useState } from 'react'
import { connectWS, sendWS } from './ws'
import {
  createPeer,
  initMedia,
  createOffer,
  handleOffer,
  handleAnswer,
  addIce,
  send,
  close
} from './rtc'

export default function App() {
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
                remoteRef.current.srcObject = stream
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
            localRef.current.srcObject = stream

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

          case 'answer':
            if (!msg.answer) return
            await handleAnswer(msg.answer)
            break

          case 'ice-candidate':
            if (!msg.candidate) return
            await addIce(msg.candidate)
            break

          case 'peer-left':
            setStatus('disconnected')
            close()
            break
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

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col">

      {/* HEADER */}
      <div className="p-4 border-b border-green-800 flex justify-between">
        <h1>STATELESS</h1>
        <span>{status}</span>
      </div>

      {/* VIDEO */}
      <div className="flex flex-1 gap-4 p-4">
        <video ref={remoteRef} autoPlay className="flex-1 border border-green-800" />
        <video ref={localRef} autoPlay muted className="w-64 border border-green-800" />
      </div>

      {/* CONTROLS */}
      <div className="p-4 flex gap-2">
        <button onClick={startRandom} className="border px-4 py-2">
          Random
        </button>

        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Room ID"
          className="border px-2 bg-black"
        />

        <button onClick={joinRoom} className="border px-4 py-2">
          Join
        </button>
      </div>

      {/* CHAT */}
      <div className="p-4 max-h-40 overflow-y-auto">
        {messages.map((m, i) => <div key={i}>{m}</div>)}
      </div>

      {/* INPUT */}
      <div className="p-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-black border px-2"
        />
        <button onClick={sendMessage} className="border px-4">
          Send
        </button>
      </div>

    </div>
  )
}