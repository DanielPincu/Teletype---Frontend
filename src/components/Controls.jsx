import Dial from './Dial.jsx'
import LeverSwitch from './LeverSwitch.jsx'

export default function Controls(props) {
  const {
    status,
    startRandom,
    handleJoin,
    cancelJoin,
    isJoiningUI,
    joinError,
    setJoinError,
    roomId,
    setRoomId,
    terminate,
    toggleScreenShare,
    isSharingScreen,
    isCameraOn,
    isAudioOn,
    toggleCamera,
    toggleAudio
  } = props

  return (
    <div className="border-2 border-green-900 bg-linear-to-b from-black via-zinc-900 to-black p-6 flex flex-col items-start gap-6">

      <div className="grid grid-cols-[auto_1fr] items-start gap-8 bg-black/60 border border-green-900 p-4 rounded-md">

        <div className="flex flex-col items-start gap-4">

          <div className="flex flex-col items-start gap-3">
            <button
              onClick={startRandom}
              disabled={status === 'searching' || status === 'connecting' || status === 'connected'}
              className={`
                border-2 border-green-600 px-6 py-3 w-40 h-14
                flex items-center justify-center
                transition-all duration-300
                ${status === 'searching' ? 'bg-green-900/40 animate-pulse' : 'hover:bg-green-800/30'} disabled:opacity-40 disabled:cursor-not-allowed
                active:translate-y-0.5
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
          </div>

          <button
            onClick={terminate}
            disabled={status !== 'connected' && status !== 'searching'}
            className="
              self-start
              border-2 border-red-800 px-6 py-3 w-40 h-14
              flex items-center justify-center
              text-red-400 transition-all duration-300
              hover:bg-red-900/30
              disabled:opacity-40 disabled:cursor-not-allowed
              active:translate-y-0.5
            "
          >
            <span className="tracking-widest font-bold">
              {status === 'searching' ? 'STOP_SCAN' : 'TERMINATE'}
            </span>
          </button>

          <button
            onClick={toggleScreenShare}
            disabled={status !== 'connected'}
            className={`
              self-start
              border-2 px-6 py-3 w-40 h-14
              flex items-center justify-center
              transition-all duration-300
              ${isSharingScreen
                ? 'border-amber-600 text-amber-400 bg-amber-900/30 animate-pulse'
                : 'border-green-600 hover:bg-green-800/30'}
              disabled:opacity-40 disabled:cursor-not-allowed
              active:translate-y-0.5
            `}
          >
            <span className="tracking-widest font-bold">
              {isSharingScreen ? 'STOP_SHARE' : 'SHARE_SCREEN'}
            </span>
          </button>

          <div className="mt-2 w-40 flex justify-center gap-4 bg-black/60 border border-green-900 px-1 py-2 rounded-md">
            <LeverSwitch label="CAM" isOn={isCameraOn} onToggle={toggleCamera} />
            <LeverSwitch label="MIC" isOn={isAudioOn} onToggle={toggleAudio} />
          </div>

        </div>

        <div className="flex flex-col items-center gap-4">
          <span className="text-[10px] tracking-widest text-green-700">FREQUENCY</span>
          <div className="hidden md:block">
            <Dial
              roomId={roomId}
              setRoomId={setRoomId}
              status={status}
              joinError={joinError}
              setJoinError={setJoinError}
            />
          </div>

          <div className="hidden md:block">
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
                active:translate-y-0.5
              `}
            >
              <span className="tracking-widest font-bold">
                {(isJoiningUI || status === 'joining-room' || status === 'joining' || status === 'waiting')
                  ? 'CANCEL'
                  : status === 'connected'
                  ? 'CONNECTED'
                  : 'JOIN_CHANNEL'}
              </span>
            </button>
          </div>
        </div>

      </div>


    </div>
  )
}