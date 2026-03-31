export default function Dial({
  roomId,
  setRoomId,
  status,
  joinError,
  setJoinError
}) {
  return (
    <div className={`flex justify-center items-center gap-4 bg-black/40 px-6 py-3 border border-green-900 rounded-md shadow-[0_0_10px_rgba(0,255,0,0.2)] ${status === 'connected' ? 'opacity-60' : ''}`}>
      {Array.from({ length: 9 }).map((_, i) => {
        const digit = parseInt(roomId[i] || '0', 10)

        const updateDigit = (val) => {
          const next = roomId.padEnd(9, '0').split('')
          next[i] = String((val + 10) % 10)
          setRoomId(next.join('').slice(0, 9))
          setJoinError(false)
        }

        return (
          <div key={i} className="flex flex-col items-center justify-center gap-0">
            <button
              onClick={() => updateDigit(digit - 1)}
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
              onClick={() => updateDigit(digit + 1)}
              disabled={status === 'connected'}
              className="w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >▼</button>
          </div>
        )
      })}
    </div>
  )
}