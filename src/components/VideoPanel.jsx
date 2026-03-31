export default function VideoPanel({
  localRef,
  remoteRef,
  status,
  goFullScreen,
  remoteContainerRef
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">

      {/* LOCAL */}
      <div>
        <div className="border border-green-800 p-2 text-xs">
          LOCAL_STATION
        </div>

        <div className="border-2 border-green-800 aspect-video relative">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* REMOTE */}
      <div>
        <div className="border border-green-800 p-2 text-xs">
          REMOTE_STATION
        </div>

        <div
          ref={remoteContainerRef}
          className="border-2 border-green-800 aspect-video relative"
        >
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

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
  )
}