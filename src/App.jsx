import React, { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Dial from './components/Dial.jsx'
import Controls from './components/Controls.jsx'
import VideoPanel from './components/VideoPanel.jsx'
import Chat from './components/Chat.jsx'
import SMeter, { SignalLedStrip } from './components/SMeter.jsx'
import TransferDrawer from './components/TransferDrawer.jsx'
import DiagnosticsDrawer from './components/DiagnosticsDrawer.jsx'
import { useWebRTC } from './hooks/useWebRTC.js'
import { useAppStore } from './store/useAppStore.js'

export default function App() {
  const [localMeterLevel, setLocalMeterLevel] = useState(0)
  const actions = useWebRTC()
  const connectionState = useAppStore((state) => state.connectionState)
  const localStream = useAppStore((state) => state.localStream)
  const remoteStream = useAppStore((state) => state.remoteStream)
  const messages = useAppStore((state) => state.messages)
  const fileTransfer = useAppStore((state) => state.fileTransfer)
  const diagnostics = useAppStore((state) => state.diagnostics)
  const dialValue = useAppStore((state) => state.dialValue)
  const transportMode = useAppStore((state) => state.transportMode)
  const isLocked = useAppStore((state) => state.isLocked)
  const joinError = useAppStore((state) => state.joinError)
  const micEnabled = useAppStore((state) => state.micEnabled)
  const camEnabled = useAppStore((state) => state.camEnabled)
  const isSharing = useAppStore((state) => state.isSharing)
  const syncCode = useAppStore((state) => state.syncCode)
  const statusText = useAppStore((state) => state.statusText)
  const statusColor = useAppStore((state) => state.statusColor)
  const statusBlink = useAppStore((state) => state.statusBlink)

  useEffect(() => {
    actions.syncTransportModeFromRtc()
    // sync once from the RTC module's persisted mode on initial mount
  }, [])

  return (
    <div className="app-shell">
      <div className="chassis p-3 md:px-5 md:py-3">
        <Header connectionState={connectionState} syncCode={syncCode} />

        <div className="main-control-panel bg-black/30 border border-amber-800/70 rounded-xl">
          <div className="grid md:grid-cols-2 gap-2 items-center">
            <div className="channel-control-panel md:col-start-1 h-full">
              <span className="panel-bolt panel-bolt-bottom-left" aria-hidden="true" />
              <span className="panel-bolt panel-bolt-bottom-right" aria-hidden="true" />
              <div className="channel-selector-label hidden md:flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-r">
                <span className="text-green-400">PRIVATE CHANNEL SELECTOR</span>
              </div>
              <Dial value={dialValue} disabled={isLocked} joinError={joinError} onChangeDigit={actions.updateDialDigit} />
              <div className={`channel-sync-display ${syncCode ? 'has-sync-code' : 'is-sync-idle'}`}>
                <span className="channel-sync-code" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {syncCode ? syncCode : 'System End-to-End Encrypted'}
                </span>
                {syncCode ? (
                  <span className="channel-sync-help status-indicator-blink" style={{ animationDuration: '2s' }}>
                    Share this security code with your peer
                  </span>
                ) : (
                  <span className="channel-sync-help channel-sync-help-placeholder">
                    Share this security code with your peer
                  </span>
                )}
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
              <div className="s-meter-bank">
                <div className="s-meter-gauges">
                  <SMeter
                    micEnabled={micEnabled}
                    showRightKnob={false}
                    showLedStrip={false}
                    onLevelChange={setLocalMeterLevel}
                  />
                  <SMeter
                    micEnabled={Boolean(remoteStream)}
                    sourceStream={remoteStream}
                    useOwnMic={false}
                    showLeftKnob={false}
                    showLedStrip={false}
                  />
                </div>
                <SignalLedStrip level={localMeterLevel} />
              </div>
            </Controls>
          </div>
        </div>

        <div className="main-media-grid grid md:grid-cols-3 gap-4 items-stretch">
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
      <DiagnosticsDrawer
        diagnostics={diagnostics}
        onToggleDrawer={() => actions.setDiagnosticsDrawerCollapsed(!diagnostics.drawerCollapsed)}
      />
    </div>
  )
}
