import React from 'react'

function Led({ active, signal = false }) {
  return <div className={`led ${active ? 'active' : ''} ${signal ? 'signal' : ''} w-2 h-5`} />
}

function SignalEye() {
  return (
    <div className="hidden md:flex items-center justify-center relative w-32 h-12 rounded-[999px] border border-cyan-700/40 bg-black/80 overflow-hidden shadow-[0_0_20px_rgba(0,180,255,0.12),inset_0_0_14px_rgba(0,180,255,0.08)]">
      <div className="absolute inset-2 rounded-[999px] border border-cyan-500/10" />

      <div className="absolute left-1/2 top-1/2 w-0 h-0 animate-[spin_3s_linear_infinite]">
        <div className="absolute left-1/2 top-1/2 w-[1px] h-10 origin-bottom -translate-x-1/2 -translate-y-full bg-gradient-to-t from-cyan-400/90 via-cyan-400/30 to-transparent shadow-[0_0_12px_rgba(0,220,255,0.9)]" />
      </div>

      <div className="absolute w-16 h-16 rounded-full bg-cyan-500/10 blur-xl animate-pulse" />

      <div className="absolute w-14 h-8 rounded-[999px] border border-cyan-400/30 bg-gradient-to-b from-cyan-400/10 to-black/50 shadow-[0_0_12px_rgba(0,180,255,0.15)]">
        <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-300/20 -translate-x-1/2" />

        <div className="absolute left-1/2 top-1/2 w-5 h-5 rounded-full bg-cyan-400/20 -translate-x-1/2 -translate-y-1/2 blur-md animate-pulse" />

        <div className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(0,220,255,1)] -translate-x-1/2 -translate-y-1/2" />

        <div className="absolute left-1/2 top-1/2 w-[2px] h-3 bg-cyan-100 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  )
}

export default function Header({ connectionState, syncCode }) {
  const syncActive = Boolean(syncCode)

  return (
    <div className="mb-1 grid grid-cols-[1fr_auto_1fr] items-center gap-4 w-full">
      <div className="flex items-center gap-8 justify-self-start">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-3">
            <span className="text-md hidden md:block md:text-3xl glow-text vt-font tracking-wider">
              RADIOTELETYPE DEEP SPACE NETWORK
            </span>
          </div>

          <span className="hidden md:block mt-[2px] text-[11px] tracking-[0.28em] text-amber-500 uppercase">
            Military-Grade Telecommunications System
          </span>
        </div>
      </div>

      <div className="justify-self-center flex flex-col items-center gap-[2px]">
        

        <SignalEye />
        <div className="text-[5px] tracking-[0.25em] text-green-500/60 uppercase font-mono select-none">
          WARNING: DO NOT OBSERVE THE QUANTUM WAVE COLLAPSER
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs font-mono text-amber-400 bg-black/40 border border-amber-800/60 px-3 py-2 rounded shadow-[inset_0_0_10px_rgba(255,140,0,0.2)] min-w-[200px] md:w-[24rem] justify-self-end">
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
      </div>
    </div>
  )
}
