import React from 'react'
import { useStateless } from './hooks/useStateless'

export default function App() {
  const {
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
  } = useStateless()

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