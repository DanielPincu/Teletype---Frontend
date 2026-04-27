import React, { useEffect, useRef } from 'react'
import { MaximizeIcon, MicIcon, MicOffIcon, RadioIcon, ScreenShareIcon, StopIcon, VideoIcon, VideoOffIcon } from './Icons.jsx'

function VideoScreen({
  title,
  stream,
  muted = false,
  badge,
  placeholderTitle,
  placeholderSubtitle,
  placeholderIcon,
  controls = null,
}) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null
      if (stream) {
        videoRef.current.play().catch(() => {})
      }
    }
  }, [stream])

  return (
    <div className="crt-container h-full flex flex-col">
      {controls ? (
        <div className="flex flex-col mb-2 gap-2">
          <span className="text-sm glow-text">{title}</span>
          {controls}
        </div>
      ) : (
        <div className="flex justify-between items-center mb-2 gap-3 flex-wrap">
          <span className="text-sm glow-text">{title}</span>
          {title.includes('REMOTE') ? (
            <button
              type="button"
              className="btn-retro px-2 py-1 text-xs rounded"
              onClick={() => videoRef.current?.requestFullscreen?.()}
            >
              <MaximizeIcon />
            </button>
          ) : null}
        </div>
      )}

      <div className="crt-screen aspect-video relative flex-1">
        <div className="scanline" />
        <div className={`static-overlay ${stream ? '' : 'active'}`} />
        <div className="video-tube flex items-center justify-center w-full h-full overflow-hidden">
          <video ref={videoRef} autoPlay muted={muted} playsInline className={`${stream ? '' : 'hidden-video'} w-full h-full object-cover relative z-10`} />
          {!stream ? (
            <div className="placeholder-panel absolute inset-0 flex flex-col items-center justify-center text-center z-0">
              {placeholderIcon}
              <p>{placeholderTitle}</p>
              <p className="text-xs mt-2">{placeholderSubtitle}</p>
            </div>
          ) : null}
        </div>
        <div className="absolute bottom-2 left-2 text-xs bg-black/70 px-2 py-1 border border-amber-800 z-6">{badge}</div>
      </div>
    </div>
  )
}

export default function VideoPanel({
  localStream,
  remoteStream,
  connectionState,
  micEnabled,
  camEnabled,
  isSharing,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
}) {
  const isConnected = connectionState === 'connected'

  return (
    <div className="md:col-span-2 grid md:grid-cols-2 gap-6 h-full">
      <VideoScreen
        title="LOCAL OSCILLOSCOPE [YOU]"
        stream={localStream}
        muted
        badge="CH A"
        placeholderTitle="NO SIGNAL DETECTED"
        placeholderSubtitle="CHECK CAMERA INPUT"
        placeholderIcon={<VideoOffIcon className="w-16 h-16 mx-auto mb-2" />}
        controls={
          <div className="grid grid-cols-3 gap-2 w-full">
            <button
              type="button"
              onClick={onToggleScreenShare}
              disabled={!isConnected}
              className="btn-retro w-full px-2 py-2 text-xs rounded hidden sm:inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSharing ? <StopIcon /> : <ScreenShareIcon />}
              <span>{isSharing ? 'SHARING' : 'SHARE'}</span>
            </button>
            <button
              type="button"
              onClick={onToggleMic}
              className={`btn-retro w-full px-2 py-2 text-xs rounded flex items-center justify-center gap-2 ${
                micEnabled ? 'bg-green-700' : ''
              }`}
            >
              {micEnabled ? <MicIcon /> : <MicOffIcon />}
              <span>{micEnabled ? 'MIC ON' : 'MIC OFF'}</span>
            </button>
            <button
              type="button"
              onClick={onToggleCam}
              className={`btn-retro w-full px-2 py-2 text-xs rounded flex items-center justify-center gap-2 ${
                camEnabled ? 'bg-green-700' : ''
              }`}
            >
              {camEnabled ? <VideoIcon /> : <VideoOffIcon />}
              <span>{camEnabled ? 'CAM ON' : 'CAM OFF'}</span>
            </button>
          </div>
        }
      />
      <VideoScreen
        title="REMOTE SIGNAL [INCOMING]"
        stream={remoteStream}
        badge="CH B"
        placeholderTitle="SCANNING BANDS..."
        placeholderSubtitle=""
        placeholderIcon={<RadioIcon className="w-16 h-16 mx-auto mb-2" />}
      />
    </div>
  )
}
