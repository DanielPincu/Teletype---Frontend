import React from 'react'
import { useStateless } from './hooks/useStateless'

import Controls from './components/Controls.jsx'
import VideoPanel from './components/VideoPanel.jsx'
import Chat from './components/Chat.jsx'

export default function App() {
  const state = useStateless()

  const {
    status,
    messages,
    input,
    setInput,
    roomId,
    setRoomId,
    joinRoom,
    cancelJoin
  } = state

  const chatRef = React.useRef(null)
  const remoteContainerRef = React.useRef(null)

  const [joinError, setJoinError] = React.useState(false)
  const [isJoiningUI, setIsJoiningUI] = React.useState(false)

  // auto scroll chat
  React.useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  // reset joining state
  React.useEffect(() => {
    if (status === 'connected' || status === 'idle') {
      setIsJoiningUI(false)
    }
  }, [status])

  // fullscreen toggle
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

  // join handler (preserved logic)
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
    <div className="min-h-screen bg-black text-green-500 font-mono">

      {/* HEADER */}
      <header className="border-b-2 border-green-800 p-2">
        <div className="flex justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold tracking-widest">
            RTTY-COMMAND-77
          </h1>
          <span className="text-xs">STATUS: {status.toUpperCase()}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid md:grid-cols-[1fr_350px] gap-4">

          {/* LEFT SIDE */}
          <div className="space-y-4">

            {/* CONTROLS */}
            <Controls
              {...state}
              handleJoin={handleJoin}
              cancelJoin={cancelJoin}
              isJoiningUI={isJoiningUI}
              joinError={joinError}
              setJoinError={setJoinError}
              roomId={roomId}
              setRoomId={setRoomId}
            />

            {/* VIDEO */}
            <VideoPanel
              {...state}
              goFullScreen={goFullScreen}
              remoteContainerRef={remoteContainerRef}
            />

          </div>

          {/* RIGHT SIDE */}
          <div className="border-2 border-green-800 h-full flex flex-col">

            <Chat
              messages={messages}
              input={input}
              setInput={setInput}
              sendMessage={state.sendMessage}
              chatRef={chatRef}
            />

          </div>

        </div>
      </main>
    </div>
  )
}