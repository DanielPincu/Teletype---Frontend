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
    cancelJoin,
    sendMessage,
    terminate,
    isSharingScreen,
    toggleScreenShare,
    isCameraOn,
    isAudioOn,
    toggleCamera,
    toggleAudio
  } = useStateless()

  const chatRef = React.useRef(null)
  const remoteContainerRef = React.useRef(null)
  const [joinError, setJoinError] = React.useState(false)
  const [isJoiningUI, setIsJoiningUI] = React.useState(false)

  React.useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  React.useEffect(() => {
    if (status === 'connected' || status === 'idle') {
      setIsJoiningUI(false)
    }
  }, [status])

  const goFullScreen = () => {
    const el = remoteContainerRef.current
    if (!el) return

    const isFullscreen =
      document.fullscreenElement === el ||
      document.webkitFullscreenElement === el ||
      document.msFullscreenElement === el

    if (isFullscreen) {
      if (document.exitFullscreen) document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      else if (document.msExitFullscreen) document.msExitFullscreen()
    } else {
      if (el.requestFullscreen) el.requestFullscreen()
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
      else if (el.msRequestFullscreen) el.msRequestFullscreen()
    }
  }

  const handleJoin = () => {
    if (!roomId || !roomId.trim()) {
      setJoinError(true)

      setTimeout(() => {
        setJoinError(false)
      }, 1500)

      return
    }
    setIsJoiningUI(true)
    joinRoom()
  }

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
        <div className="border-2 border-green-800 p-6 flex flex-col items-center gap-6">

          <div className="flex flex-wrap justify-center items-center gap-6">

            <button
              onClick={startRandom}
              disabled={status === 'searching' || status === 'connecting' || status === 'connected'}
              className={`
                border-2 border-green-600 px-6 py-3 w-56 h-14
                flex items-center justify-center
                transition-all duration-300
                ${status === 'searching' ? 'bg-green-900/40 animate-pulse' : 'hover:bg-green-800/30'} disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              <span className="tracking-widest font-bold">
                {status === 'searching'
                  ? 'SCANNING ▓▒░'
                  : status === 'connected'
                  ? 'LINK_LOCKED'
                  : 'SCAN_BANDS'}
              </span>
            </button>

            <div className={`flex justify-center items-center gap-4 bg-black/40 px-6 py-3 border border-green-900 rounded-md shadow-[0_0_10px_rgba(0,255,0,0.2)] ${status === 'connected' ? 'opacity-60' : ''}`}>
              {Array.from({ length: 4 }).map((_, i) => {
                const digit = parseInt(roomId[i] || '0', 10)

                const updateDigit = (val) => {
                  const next = roomId.padEnd(4, '0').split('')
                  next[i] = String((val + 10) % 10)
                  setRoomId(next.join('').slice(0, 4))
                  setJoinError(false)
                }

                return (
                  <div key={i} className="flex flex-col items-center justify-center gap-0">
                    <button
                      onClick={() => updateDigit(digit + 1)}
                      disabled={status === 'connected'}
                      className="w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    >▲</button>

                    <div
                      className={`
                        relative w-14 h-20 flex items-center justify-center
                        bg-black border rounded-md overflow-hidden
                        ${joinError
                          ? 'border-orange-700 shadow-[0_0_10px_rgba(255,120,0,0.7)]'
                          : 'border-orange-500 shadow-[0_0_12px_rgba(255,140,0,0.6)]'}
                      `}
                    >

                      {/* nixie stack */}
                      <div className="relative flex flex-col items-center justify-center">
                        {Array.from({ length: 10 }).map((_, n) => (
                          <span
                            key={n}
                            className={`
                              absolute text-2xl font-bold transition-all duration-300
                              ${n === digit
                                ? 'text-orange-300 opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(255,120,0,0.9)]'
                                : 'text-orange-800 opacity-20 scale-90'}
                            `}
                            style={{ transform: `translateY(${(n - digit) * 20}px)` }}
                          >
                            {n}
                          </span>
                        ))}
                      </div>

                      {/* glass glow */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,140,0,0.15),transparent_70%)]" />

                      {/* reflection */}
                      <div className="absolute inset-0 from-white/5 to-transparent opacity-40" />

                    </div>

                    <button
                      onClick={() => updateDigit(digit - 1)}
                      disabled={status === 'connected'}
                      className="w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                    >▼</button>
                  </div>
                )
              })}
            </div>

            <button
              onClick={(isJoiningUI || status === 'joining-room' || status === 'joining' || status === 'waiting') ? cancelJoin : handleJoin}
              disabled={status === 'searching' || status === 'connecting' || status === 'connected'}
              className={`
                border-2 px-6 py-3 w-40 h-14
                flex items-center justify-center
                transition-all duration-300
                ${joinError
                  ? 'border-red-600 text-red-400 bg-red-900/20'
                  : (isJoiningUI || status === 'joining-room' || status === 'joining' || status === 'waiting')
                  ? 'border-amber-600 text-amber-400 bg-amber-900/20 animate-pulse'
                  : 'border-green-600 hover:bg-green-800/30'}
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              <span className="tracking-widest font-bold">
                {(isJoiningUI || status === 'joining-room' || status === 'joining' || status === 'waiting')
                  ? 'CANCEL'
                  : status === 'connected'
                  ? 'CHANNEL_LOCKED'
                  : 'JOIN_CHANNEL'}
              </span>
            </button>

            <button
              onClick={terminate}
              disabled={status !== 'connected'}
              className="
                border-2 border-red-800 px-6 py-3 w-40 h-14
                flex items-center justify-center
                text-red-400 transition-all duration-300
                hover:bg-red-900/30
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              <span className="tracking-widest font-bold">TERMINATE</span>
            </button>

            <button
              onClick={toggleScreenShare}
              disabled={status !== 'connected'}
              className={`
                border-2 px-6 py-3 w-40 h-14
                flex items-center justify-center
                transition-all duration-300
                ${isSharingScreen
                  ? 'border-amber-600 text-amber-400 bg-amber-900/30 animate-pulse'
                  : 'border-green-600 hover:bg-green-800/30'}
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              <span className="tracking-widest font-bold">
                {isSharingScreen ? 'STOP_SHARE' : 'SHARE_SCREEN'}
              </span>
            </button>

          </div>

          <div className="flex gap-16 mt-6">

            {/* CAMERA LEVER */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs tracking-widest">CAM</span>
              <button
                onClick={toggleCamera}
                className="relative w-10 h-16 flex items-center justify-center"
              >
                {/* base */}
                <div className="absolute w-6 h-12 bg-black border border-green-800 rounded-sm" />

                {/* lever */}
                <div
                  className={`
                    absolute w-2 h-10 bg-green-400 origin-bottom transition-all duration-300
                    ${isCameraOn ? 'rotate-0' : '-rotate-40'}
                    shadow-[0_0_6px_rgba(0,255,0,0.6)]
                  `}
                />

                {/* knob */}
                <div
                  className={`
                    absolute bottom-1 w-4 h-4 rounded-full bg-green-300 border border-green-500
                    transition-all duration-300
                    ${isCameraOn ? 'translate-y-0' : 'translate-y-2'}
                  `}
                />
              </button>
            </div>

            {/* MIC LEVER */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs tracking-widest">MIC</span>
              <button
                onClick={toggleAudio}
                className="relative w-10 h-16 flex items-center justify-center"
              >
                {/* base */}
                <div className="absolute w-6 h-12 bg-black border border-green-800 rounded-sm" />

                {/* lever */}
                <div
                  className={`
                    absolute w-2 h-10 bg-green-400 origin-bottom transition-all duration-300
                    ${isAudioOn ? 'rotate-0' : '-rotate-40'}
                    shadow-[0_0_6px_rgba(0,255,0,0.6)]
                  `}
                />

                {/* knob */}
                <div
                  className={`
                    absolute bottom-1 w-4 h-4 rounded-full bg-green-300 border border-green-500
                    transition-all duration-300
                    ${isAudioOn ? 'translate-y-0' : 'translate-y-2'}
                  `}
                />
              </button>
            </div>

          </div>
        </div>

        {/* VIDEO */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* LOCAL */}
          <div>
            <div className="border border-green-800 p-2 text-xs">
              LOCAL_STATION
            </div>

            <div className="border-2 border-green-800 aspect-video relative">
              <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          </div>

          {/* REMOTE */}
          <div>
            <div className="border border-green-800 p-2 text-xs">
              REMOTE_STATION
            </div>

            <div ref={remoteContainerRef} className="border-2 border-green-800 aspect-video relative">
              <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" />
              <button
                onClick={goFullScreen}
                className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center border border-green-700 bg-black/70 hover:bg-green-900/40 transition"
              >
                <span className="text-green-400 text-lg leading-none">⛶</span>
              </button>
              {status !== 'connected' && (
                <div className="absolute inset-0 flex items-center justify-center text-green-700">
                  NO SIGNAL / AWAITING LINK
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