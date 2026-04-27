import React from 'react'

export default function Dial({ value, disabled, joinError, onChangeDigit }) {
  return (
    <div
      className={`hidden md:flex justify-start items-center gap-4 bg-black/40 px-6 py-3 border border-green-900 rounded-md shadow-[0_0_10px_rgba(0,255,0,0.2)] ${
        disabled ? 'ring-2 ring-orange-500' : ''
      }`}
    >
      {Array.from({ length: 7 }).map((_, index) => {
        const digit = Number.parseInt(value[index] || '0', 10)

        return (
          <div key={index} className="flex flex-col items-center justify-center gap-0">
            <button
              type="button"
              className="w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={disabled}
              onClick={() => onChangeDigit(index, -1)}
            >
              ▲
            </button>
            <div
              className={`relative w-14 h-20 flex items-center justify-center bg-black border rounded-md overflow-hidden ${
                disabled ? 'opacity-50' : ''
              } ${
                joinError
                  ? 'border-orange-700 shadow-[0_0_10px_rgba(255,120,0,0.7)]'
                  : 'border-orange-500 shadow-[0_0_12px_rgba(255,140,0,0.6)]'
              }`}
            >
              <div className="relative flex flex-col items-center justify-center">
                {Array.from({ length: 10 }).map((__, number) => (
                  <span
                    key={number}
                    className={`absolute text-2xl font-bold transition-all duration-300 ${
                      number === digit
                        ? 'text-orange-300 opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(255,120,0,0.9)]'
                        : 'text-orange-800 opacity-20 scale-90'
                    }`}
                    style={{ transform: `translateY(${(number - digit) * 20}px)` }}
                  >
                    {number}
                  </span>
                ))}
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,140,0,0.15),transparent_70%)]" />
              <div className="absolute inset-0 from-white/5 to-transparent opacity-40" />
            </div>
            <button
              type="button"
              className="w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={disabled}
              onClick={() => onChangeDigit(index, 1)}
            >
              ▼
            </button>
          </div>
        )
      })}
    </div>
  )
}
