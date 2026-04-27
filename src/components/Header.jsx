import React from 'react'

function Led({ active, signal = false }) {
  return <div className={`led ${active ? 'active' : ''} ${signal ? 'signal' : ''} w-2 h-5`} />
}

export default function Header({ connectionState, syncCode }) {
  const syncActive = Boolean(syncCode)

  return (
    <div className="mb-4 flex items-center justify-between gap-4 flex-wrap w-full">
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-3">
          <span className="text-lg hidden md:block md:text-6xl glow-text vt-font tracking-wider">RADIOTELETYPE</span>
        </div>
        <span className="hidden md:block mt-1 text-[11px] tracking-[0.28em] text-amber-500 uppercase">
          Military-Grade Telecommunications System
        </span>
      </div>

      <div className="flex flex-col gap-2 text-xs font-mono text-amber-400 bg-black/40 border border-amber-800/60 px-3 py-2 rounded shadow-[inset_0_0_10px_rgba(255,140,0,0.2)] min-w-[200px] md:w-[44rem] ml-auto">
        <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span>PWR</span>
          <Led active />
        </div>
        <div className="flex items-center gap-2">
          <span>ANT</span>
          <Led active />
        </div>
        <div className="flex items-center gap-2">
          <span>SYNC</span>
          <Led active={syncActive} signal={!syncActive} />
        </div>
        </div>
        <div className="hidden md:flex min-h-[5rem] flex-col border-t border-amber-900/70 pt-2 text-[10px] tracking-[0.18em] text-amber-600 uppercase">
          <span
            className="relative inline-flex text-3xl text-amber-300 vt-font tracking-[0.24em] leading-none"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            <span className="opacity-0 select-none">--- ---</span>
            <span className="absolute inset-0 text-left">{syncCode ? syncCode : 'System End-to-End Encrypted'}</span>
          </span>
          {syncCode ? (
            <span
              className="mt-1 text-lg text-amber-700 tracking-[0.16em] status-indicator-blink"
              style={{ animationDuration: '2s' }}
            >
              Confirm the code with your peer
            </span>
          ) : <span className="mt-1 text-[9px] opacity-0 select-none">Confirm the code with your peer</span>}
        </div>
      </div>
    </div>
  )
}
