export default function LeverSwitch({ label, isOn, onToggle }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs tracking-widest">{label}</span>

      <button
        onClick={onToggle}
        className="relative w-10 h-16 flex items-center justify-center active:scale-95"
      >
        {/* base */}
        <div className="
          absolute w-6 h-12 rounded-sm
          bg-linear-to-b from-zinc-900 via-black to-zinc-800
          border border-green-900
          shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),0_2px_6px_rgba(0,0,0,0.8)]
        " />

        {/* lever */}
        <div
          className={`
            absolute w-2 h-10 origin-bottom
            transition-all duration-150 ease-out
            ${isOn ? 'rotate-0' : '-rotate-40'}
            bg-linear-to-b from-green-200 via-green-400 to-green-800
            shadow-[0_3px_6px_rgba(0,0,0,0.9),0_0_6px_rgba(0,255,0,0.5)]
          `}
        />

        {/* knob */}
        <div
          className={`
            absolute bottom-1 w-4 h-4 rounded-full
            transition-all duration-150 ease-out
            ${isOn ? 'translate-y-0' : 'translate-y-2'}
            bg-linear-to-br from-zinc-200 via-green-300 to-green-800
            border border-green-600
            shadow-[0_3px_6px_rgba(0,0,0,0.9),inset_0_0_6px_rgba(255,255,255,0.25)]
          `}
        />
      </button>
    </div>
  )
}