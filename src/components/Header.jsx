import React from 'react'

function Led({ active, signal = false }) {
  return <div className={`led ${active ? 'active' : ''} ${signal ? 'signal' : ''} w-2 h-5`} />
}

export default function Header({ connectionState }) {
  const active = connectionState !== 'idle'

  return (
    <div className="mb-4 flex items-center justify-between gap-4 flex-wrap w-full relative">
      <div className="absolute left-1/2 -translate-x-1/2 text-center flex flex-col leading-tight">
        <div className="flex items-center justify-center gap-3">
          <span className="text-lg hidden md:block md:text-6xl glow-text vt-font tracking-wider">RADIOTELETYPE</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-amber-400 bg-black/40 border border-amber-800/60 px-3 py-2 rounded shadow-[inset_0_0_10px_rgba(255,140,0,0.2)] min-w-[160px] ml-auto">
        <div className="flex items-center gap-2">
          <span>PWR</span>
          <Led active />
        </div>
        <div className="flex items-center gap-2">
          <span>ANT</span>
          <Led active={active} />
        </div>
        <div className="flex items-center gap-2">
          <span>GPS</span>
          <Led active={active} signal />
        </div>
      </div>
    </div>
  )
}
