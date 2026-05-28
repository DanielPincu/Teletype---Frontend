import React from 'react'

function Switch({ active, leftLabel, rightLabel, activeSide = 'right', onClick }) {
  const translate = activeSide === 'right' && active ? 'translateX(28px)' : 'translateX(0px)'

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs ${activeSide === 'left' && active ? 'text-red-400' : 'text-green-400'}`}>{leftLabel}</span>
      <button
        type="button"
        onClick={onClick}
        className={`relative w-14 h-7 border border-amber-700 rounded-full cursor-pointer transition ${
          active ? 'bg-red-900' : 'bg-gray-800'
        }`}
      >
        <div
          className="absolute top-1 left-1 w-5 h-5 bg-amber-500 rounded-full shadow transition"
          style={{ transform: translate }}
        />
      </button>
      <span className={`text-xs ${activeSide === 'right' && active ? 'text-green-400' : 'text-red-400'}`}>{rightLabel}</span>
    </div>
  )
}

export default function Controls({
  transportMode,
  isLocked,
  connectionState,
  statusText,
  statusColor,
  statusBlink,
  onConnect,
  onToggleTransportMode,
  onToggleLock,
  children,
}) {
  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting'
  const connectLabel = isConnected ? 'Disconnect' : isConnecting ? 'Cancel' : 'Connect'
  const isBusy = statusText === 'CHANNEL BUSY'
  const isIdle = connectionState === 'idle' && !statusBlink && !isBusy && statusText === 'Idle'
  const statusColorClass =
    isBusy || statusColor === 'red'
      ? 'bg-red-500'
      : isIdle
        ? 'bg-yellow-400'
        : statusColor === 'yellow'
          ? 'bg-yellow-400'
          : 'bg-green-500'
  const statusShadowClass =
    isBusy || statusColor === 'red'
      ? 'shadow-[0_0_8px_rgba(239,68,68,0.85)]'
      : isIdle || statusColor === 'yellow'
        ? 'shadow-[0_0_8px_rgba(250,204,21,0.85)]'
        : 'shadow-[0_0_8px_rgba(34,197,94,0.8)]'

  return (
    <div className="flex items-start justify-end md:col-start-2">
      <div className="radio-control-panel">
        <div className="radio-control-top">
          <div className="radio-switch-bank">
            <div className="flex flex-col items-center gap-2">
              <Switch
                active={transportMode === 'DIRECT'}
                leftLabel="RELAY"
                rightLabel="DIRECT"
                activeSide="right"
                onClick={onToggleTransportMode}
              />
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-green-400">RANDOM</span>
                <button
                  type="button"
                  onClick={onToggleLock}
                  className={`relative w-14 h-7 border border-amber-700 rounded-full cursor-pointer transition ${
                    isLocked ? 'bg-red-900' : 'bg-gray-800'
                  }`}
                >
                  <div
                    className="absolute top-1 left-1 w-5 h-5 bg-amber-500 rounded-full shadow transition"
                    style={{ transform: isLocked ? 'translateX(28px)' : 'translateX(0px)' }}
                  />
                </button>
                <span className="text-xs text-red-400">CHANNEL</span>
              </div>
            </div>
          </div>

          <div className="radio-status-bank">
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm text-amber-200">{statusText}</span>
              <div
                className={`w-32 h-5 rounded-full ${statusShadowClass} ${statusColorClass} ${
                  statusBlink ? 'status-indicator-blink' : ''
                }`}
                style={
                  statusBlink
                    ? { animationDuration: statusColor === 'red' ? '0.35s' : '1s' }
                    : undefined
                }
              />
            </div>
            <button
              type="button"
              onClick={onConnect}
              className={`btn-retro w-32 px-4 py-3 my-1 rounded font-bold text-sm flex items-center justify-center gap-2 ${
                isConnected || isConnecting ? 'bg-red-700' : 'bg-gray-700'
              }`}
            >
              <span>{connectLabel}</span>
            </button>
          </div>
        </div>

        {children ? <div className="radio-meter-section">{children}</div> : null}
      </div>
    </div>
  )
}
