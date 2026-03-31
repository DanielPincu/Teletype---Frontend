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
    sendMessage,
    terminate
  } = useStateless()

  const chatRef = React.useRef(null)

  React.useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono relative">

      {/* HEADER */}
      <header className="border-b-2 border-green-800 bg-black p-2 relative overflow-hidden">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-xl font-bold tracking-widest glow-text">
            RTTY-COMMAND-77
          </h1>
          <div className="text-xs text-green-700">
            STATUS: {status.toUpperCase()}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">

        {/* TOP BAR */}
        <div className="border border-green-800 p-3 flex justify-between text-xs">
          <div className="flex gap-6">
            <span>SIGNAL: <span className="text-green-400">{status}</span></span>
            <span>ENCRYPTION: AES-QUANTUM</span>
            <span>BUFFER: READY</span>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="border-2 border-green-800 p-4 flex flex-wrap gap-4 justify-center">

          <button
            onClick={startRandom}
            disabled={status === 'searching' || status === 'connecting'}
            className="border-2 border-green-600 px-6 py-3 hover:bg-green-800/30"
          >
            {status === 'searching' ? 'SCANNING...' : 'SCAN_BANDS'}
          </button>

          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="ROOM_ID"
            className="bg-black border border-green-700 px-3"
          />

          <button
            onClick={joinRoom}
            className="border-2 border-green-600 px-6 py-3 hover:bg-green-800/30"
          >
            JOIN_CHANNEL
          </button>

          <button
            onClick={terminate}
            className="border-2 border-red-800 px-6 py-3 text-red-400 hover:bg-red-900/30"
          >
            TERMINATE
          </button>
        </div>

        {/* VIDEO */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* LOCAL */}
          <div>
            <div className="border border-green-800 p-2 text-xs">
              LOCAL_STATION
            </div>

            <div className="border-2 border-green-800 aspect-video relative">
              <video ref={localRef} autoPlay muted className="w-full h-full object-cover" />
            </div>
          </div>

          {/* REMOTE */}
          <div>
            <div className="border border-green-800 p-2 text-xs">
              REMOTE_STATION
            </div>

            <div className="border-2 border-green-800 aspect-video relative">
              <video ref={remoteRef} autoPlay className="w-full h-full object-cover" />
              {status !== 'connected' && (
                <div className="absolute inset-0 flex items-center justify-center text-green-700">
                  AWAITING SIGNAL...
                </div>
              )}
            </div>
          </div>

        </div>

        {/* CHAT */}
        <div className="border-2 border-green-800">

          <div className="border-b border-green-800 p-2 text-sm">
            TELETYPE_INTERFACE
          </div>

          <div ref={chatRef} className="h-40 overflow-y-auto p-3 text-sm space-y-1">
            {messages.map((m, i) => {
              const time = new Date().toLocaleTimeString()

              let prefix = '[SYS]'
              let color = 'text-green-600'

              if (m.type === 'tx') {
                prefix = '[YOU]'
                color = 'text-green-300'
              }

              if (m.type === 'peer') {
                prefix = '[REMOTE]'
                color = 'text-green-400'
              }

              return (
                <div key={i} className={`flex gap-2 ${color}`}>
                  <span className="text-green-700">[{time}]</span>
                  <span>{prefix}</span>
                  <span>{m.text}</span>
                </div>
              )
            })}
          </div>

          <div className="border-t border-green-800 p-2 flex gap-2">
            <span className="animate-pulse">&gt;</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              placeholder="ENTER_MESSAGE..."
            />
            <button onClick={sendMessage} className="border px-4">
              XMT
            </button>
          </div>

        </div>

      </main>
    </div>
  )
}