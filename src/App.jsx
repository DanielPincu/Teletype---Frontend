import React, { useEffect } from 'react'
import Header from './components/Header.jsx'
import Dial from './components/Dial.jsx'
import Controls from './components/Controls.jsx'
import VideoPanel from './components/VideoPanel.jsx'
import Chat from './components/Chat.jsx'
import SMeter from './components/SMeter.jsx'
import TransferDrawer from './components/TransferDrawer.jsx'
import { useWebRTC } from './hooks/useWebRTC.js'
import { useAppStore } from './store/useAppStore.js'

export default function App() {
  const actions = useWebRTC()
  const connectionState = useAppStore((state) => state.connectionState)
  const localStream = useAppStore((state) => state.localStream)
  const remoteStream = useAppStore((state) => state.remoteStream)
  const messages = useAppStore((state) => state.messages)
  const fileTransfer = useAppStore((state) => state.fileTransfer)
  const dialValue = useAppStore((state) => state.dialValue)
  const transportMode = useAppStore((state) => state.transportMode)
  const isLocked = useAppStore((state) => state.isLocked)
  const joinError = useAppStore((state) => state.joinError)
  const micEnabled = useAppStore((state) => state.micEnabled)
  const camEnabled = useAppStore((state) => state.camEnabled)
  const isSharing = useAppStore((state) => state.isSharing)
  const statusText = useAppStore((state) => state.statusText)
  const statusColor = useAppStore((state) => state.statusColor)
  const statusBlink = useAppStore((state) => state.statusBlink)

  useEffect(() => {
    actions.syncTransportModeFromRtc()
    // sync once from the RTC module's persisted mode on initial mount
  }, [])

  return (
    <div className="max-w-7xl mx-auto pt-10">
      <div className="chassis p-4 md:px-8">
        <Header connectionState={connectionState} />

        <div className="bg-black/30 border border-amber-800/70 p-4 rounded-xl mb-4">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div className="flex items-center md:col-start-1 h-full">
              <Dial value={dialValue} disabled={isLocked} joinError={joinError} onChangeDigit={actions.updateDialDigit} />
              <div className="hidden md:flex items-center gap-2 text-xs font-mono text-green-300 bg-black/40 border-t border-r border-b border-green-700/60 px-3 py-1 rounded-r shadow-[inset_0_0_8px_rgba(0,255,100,0.2)]">
                <span className="text-green-400">PRIVATE CHANNEL SELECTOR</span>
              </div>
            </div>

            <Controls
              transportMode={transportMode}
              isLocked={isLocked}
              connectionState={connectionState}
              statusText={statusText}
              statusColor={statusColor}
              statusBlink={statusBlink}
              onConnect={actions.connect}
              onToggleTransportMode={() => actions.setTransportMode(transportMode === 'DIRECT' ? 'RELAY' : 'DIRECT')}
              onToggleLock={actions.toggleLock}
            >
              <SMeter micEnabled={micEnabled} />
            </Controls>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6 items-stretch">
          <VideoPanel
            localStream={localStream}
            remoteStream={remoteStream}
            connectionState={connectionState}
            micEnabled={micEnabled}
            camEnabled={camEnabled}
            isSharing={isSharing}
            onToggleMic={actions.toggleMic}
            onToggleCam={actions.toggleCam}
            onToggleScreenShare={actions.toggleScreenShare}
          />
          <Chat messages={messages} connected={connectionState === 'connected'} onSendMessage={actions.sendMessage} />
        </div>
      </div>

      <TransferDrawer
        fileTransfer={fileTransfer}
        onSendFile={actions.sendFile}
        onAccept={actions.acceptFile}
        onReject={actions.rejectFile}
        onCancel={actions.cancelTransfer}
        onOpenFile={actions.openReceivedFile}
        onDownloadFile={actions.downloadReceivedFile}
        onRemoveFile={actions.removeReceivedFile}
        onToggleDrawer={() => actions.setDrawerCollapsed(!fileTransfer.drawerCollapsed)}
      />
    </div>
  )
}
