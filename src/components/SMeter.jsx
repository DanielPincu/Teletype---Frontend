import React, { useEffect, useRef, useState } from 'react'

const ledClasses = Array.from({ length: 22 }, () => 'border-amber-950')
const scaleMarks = [
  { label: '1', value: 8 },
  { label: '3', value: 28 },
  { label: '5', value: 48 },
  { label: '7', value: 66 },
  { label: '9', value: 80 },
  { label: '+20', value: 91, hot: true },
  { label: '+40', value: 100, hot: true },
]

const NOISE_FLOOR = 0.012
const DEFAULT_INPUT_GAIN = 0.95
const MIN_INPUT_GAIN = 0.35
const MAX_INPUT_GAIN = 2.4
const DEFAULT_OUTPUT_LEVEL = 0.82
const MIN_OUTPUT_LEVEL = 0.45
const MAX_OUTPUT_LEVEL = 1.35
const KNOB_STEP = 0.05
const MIN_DB = -48
const MAX_DB = -3
const NEEDLE_MIN_ANGLE = -112
const NEEDLE_MAX_ANGLE = 112
const KNOB_MIN_ANGLE = -132
const KNOB_MAX_ANGLE = 132
const KNOB_DEFAULT_ANGLE = -32
const DIAL_CENTER = 64
const DIAL_PIVOT_Y = 74
const DIAL_TICK_INNER = 42
const DIAL_TICK_OUTER = 52
const DIAL_LABEL_RADIUS = 32

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function getLedColor(index, rowSize) {
  if (index < 4) return '#ffff00'
  if (index >= rowSize - 6) return '#ff0000'
  return '#00ff00'
}

function computeRmsLevel(data, inputGain) {
  let sumSquares = 0

  for (let index = 0; index < data.length; index += 1) {
    const normalized = (data[index] - 128) / 128
    sumSquares += normalized * normalized
  }

  const rms = Math.sqrt(sumSquares / data.length)
  const gated = Math.max(0, rms - NOISE_FLOOR)
  const normalized = clamp((gated * inputGain) / (1 - NOISE_FLOOR), 0, 1)
  if (normalized <= 0) return 0

  const db = 20 * Math.log10(normalized)
  const scaled = clamp((db - MIN_DB) / (MAX_DB - MIN_DB), 0, 1)

  // S-meters and VU meters read logarithmically, then their mechanics soften the extremes.
  return clamp(Math.pow(scaled, 0.76) * 100)
}

function levelToAngle(value) {
  return NEEDLE_MIN_ANGLE + (clamp(value) / 100) * (NEEDLE_MAX_ANGLE - NEEDLE_MIN_ANGLE)
}

function valueToKnobAngle(value, min, max, nominal) {
  const clampedValue = clamp(value, min, max)

  if (clampedValue <= nominal) {
    const progress = (clampedValue - min) / (nominal - min)
    return KNOB_MIN_ANGLE + progress * (KNOB_DEFAULT_ANGLE - KNOB_MIN_ANGLE)
  }

  const progress = (clampedValue - nominal) / (max - nominal)
  return KNOB_DEFAULT_ANGLE + progress * (KNOB_MAX_ANGLE - KNOB_DEFAULT_ANGLE)
}

function polarPoint(angle, radius) {
  const radians = ((angle - 90) * Math.PI) / 180

  return {
    x: DIAL_CENTER + Math.cos(radians) * radius,
    y: DIAL_PIVOT_Y + Math.sin(radians) * radius,
  }
}

function DialTick({ mark }) {
  const angle = levelToAngle(mark.value)
  const inner = polarPoint(angle, DIAL_TICK_INNER)
  const outer = polarPoint(angle, DIAL_TICK_OUTER)
  const label = polarPoint(angle, mark.hot ? DIAL_LABEL_RADIUS - 8 : DIAL_LABEL_RADIUS)

  return (
    <g className={mark.hot ? 's-meter-svg-hot' : undefined}>
      <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
      <text x={label.x} y={label.y}>
        {mark.label}
      </text>
    </g>
  )
}

function RotaryKnob({ label, value, min, max, step, nominalValue, onChange }) {
  const dragStartRef = useRef(null)
  const angle = valueToKnobAngle(value, min, max, nominalValue)

  const setClampedValue = (nextValue) => {
    onChange(clamp(nextValue, min, max))
  }

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = {
      y: event.clientY,
      value,
    }
  }

  const handlePointerMove = (event) => {
    if (!dragStartRef.current) return

    const deltaSteps = (dragStartRef.current.y - event.clientY) / 12
    setClampedValue(dragStartRef.current.value + deltaSteps * step)
  }

  const handlePointerUp = (event) => {
    dragStartRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const handleWheel = (event) => {
    event.preventDefault()
    setClampedValue(value + (event.deltaY < 0 ? step : -step))
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      setClampedValue(value + step)
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      setClampedValue(value - step)
    }
  }

  return (
    <div className="s-meter-knob-stack">
      <button
        type="button"
        className="s-meter-knob"
        aria-label={`${label} control`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
      >
        <span className="s-meter-knob-indicator" style={{ transform: `rotate(${angle}deg)` }} />
      </button>
      <span>{label}</span>
    </div>
  )
}

function SignalLedStrip({ level }) {
  const rowSize = ledClasses.length
  const activeLedCount = Array.from({ length: rowSize }).filter((_, index) => {
    const threshold = ((index + 1) * 100) / rowSize
    return level > threshold
  }).length
  const barWidth = (activeLedCount / rowSize) * 100

  return (
    <div className="s-meter-led-strip">
      <div className="flex flex-col gap-1 mb-1">
        {[0, 1].map((row) => (
          <div key={row} className="flex w-full gap-1">
            {ledClasses.map((borderClass, index) => {
              const threshold = (index + 1) * (100 / rowSize)
              const color = getLedColor(index, rowSize)
              const active = level > threshold

              return (
                <div
                  key={`${row}-${index}`}
                  className={`s-led h-2 flex-1 rounded-full border ${borderClass}`}
                  style={{
                    background: active
                      ? `linear-gradient(180deg, ${color}, ${color})`
                      : 'linear-gradient(180deg, rgba(29, 18, 6, 0.96), rgba(7, 4, 1, 0.98))',
                    boxShadow: active
                      ? `0 0 6px ${color}, inset 0 0 4px rgba(255,255,255,0.12)`
                      : 'inset 0 0 5px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  )
}

export default function SMeter({
  micEnabled,
  sourceStream = null,
  useOwnMic = true,
  showLeftKnob = true,
  showRightKnob = true,
  showLedStrip = true,
  onLevelChange = null,
}) {
  const [level, setLevel] = useState(0)
  const [inputGain, setInputGain] = useState(DEFAULT_INPUT_GAIN)
  const [outputLevel, setOutputLevel] = useState(DEFAULT_OUTPUT_LEVEL)

  const micEnabledRef = useRef(micEnabled)
  const inputGainRef = useRef(inputGain)
  const outputLevelRef = useRef(outputLevel)
  const startedRef = useRef(false)
  const levelRef = useRef(0)
  const velocityRef = useRef(0)
  const lastFrameRef = useRef(0)

  useEffect(() => {
    micEnabledRef.current = micEnabled
  }, [micEnabled])

  useEffect(() => {
    inputGainRef.current = inputGain
  }, [inputGain])

  useEffect(() => {
    outputLevelRef.current = outputLevel
  }, [outputLevel])

  useEffect(() => {
    let cancelled = false
    let frameId = null
    let audioContext = null
    let ownedMediaStream = null
    let analyser = null
    let dataArray = null
    let resumeHandler = null

    const resetMeter = () => {
      levelRef.current = 0
      velocityRef.current = 0
      lastFrameRef.current = 0
      setLevel(0)
    }

    const tick = (timestamp) => {
      if (cancelled) return

      if (!micEnabledRef.current || (sourceStream && sourceStream.getAudioTracks().length === 0)) {
        resetMeter()
        frameId = window.requestAnimationFrame(tick)
        return
      }

      if (!analyser || !dataArray) {
        frameId = window.requestAnimationFrame(tick)
        return
      }

      analyser.getByteTimeDomainData(dataArray)
      const sampledLevel = clamp(computeRmsLevel(dataArray, inputGainRef.current) * outputLevelRef.current)
      const lastFrame = lastFrameRef.current || timestamp
      const deltaSeconds = Math.min(0.05, Math.max(0.001, (timestamp - lastFrame) / 1000))
      lastFrameRef.current = timestamp

      const currentLevel = levelRef.current
      const meterFlutter =
        sampledLevel > 4
          ? Math.sin(timestamp * 0.025) * 0.45 + Math.sin(timestamp * 0.071) * 0.22
          : 0
      const targetLevel = clamp(sampledLevel + meterFlutter)
      const rising = targetLevel > currentLevel
      const stiffness = rising ? 170 : 44
      const damping = rising ? 20 : 10.5
      const acceleration = (targetLevel - currentLevel) * stiffness

      velocityRef.current += acceleration * deltaSeconds
      velocityRef.current *= Math.exp(-damping * deltaSeconds)

      const nextLevel = currentLevel + velocityRef.current * deltaSeconds
      levelRef.current = clamp(nextLevel)

      setLevel(levelRef.current)
      onLevelChange?.(levelRef.current)

      frameId = window.requestAnimationFrame(tick)
    }

    const startMeter = async () => {
      if (startedRef.current || cancelled) return
      startedRef.current = true

      try {
        if (!sourceStream && !useOwnMic) {
          resetMeter()
          return
        }

        const analysisStream = sourceStream || (await navigator.mediaDevices.getUserMedia({ audio: true }))
        if (!sourceStream) ownedMediaStream = analysisStream

        audioContext = new (window.AudioContext || window.webkitAudioContext)()

        analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        analyser.smoothingTimeConstant = 0
        dataArray = new Uint8Array(analyser.fftSize)

        const source = audioContext.createMediaStreamSource(analysisStream)
        source.connect(analyser)

        const ensureResumed = () => {
          if (audioContext?.state === 'suspended') {
            audioContext.resume().catch(() => {})
          }
        }

        resumeHandler = () => {
          ensureResumed()
        }

        window.addEventListener('pointerdown', resumeHandler)
        window.addEventListener('keydown', resumeHandler)
        ensureResumed()

        frameId = window.requestAnimationFrame(tick)
      } catch {
        startedRef.current = false
        resetMeter()
      }
    }

    const handleInitialInteraction = () => {
      window.removeEventListener('pointerdown', handleInitialInteraction)
      window.removeEventListener('keydown', handleInitialInteraction)
      void startMeter()
    }

    void startMeter()
    window.addEventListener('pointerdown', handleInitialInteraction, { once: true })
    window.addEventListener('keydown', handleInitialInteraction, { once: true })

    return () => {
      cancelled = true
      startedRef.current = false
      window.removeEventListener('pointerdown', handleInitialInteraction)
      window.removeEventListener('keydown', handleInitialInteraction)
      if (resumeHandler) {
        window.removeEventListener('pointerdown', resumeHandler)
        window.removeEventListener('keydown', resumeHandler)
      }
      if (frameId) window.cancelAnimationFrame(frameId)
      ownedMediaStream?.getTracks().forEach((track) => track.stop())
      audioContext?.close().catch(() => {})
    }
  }, [sourceStream, useOwnMic])

  const needleAngle = levelToAngle(level)
  const readout =
    level >= 82
      ? `S9+${Math.round((level - 82) * 2.2)}`
      : `S${level < 4 ? 0 : Math.max(1, Math.round((level / 82) * 9))}`

  return (
    <div className="s-meter w-full pb-2">
      <div
        className={`s-meter-dial-row ${showLeftKnob ? 'has-left-knob' : ''} ${
          showRightKnob ? 'has-right-knob' : ''
        }`}
      >
        {showLeftKnob ? (
          <RotaryKnob
            label="VOL"
            value={outputLevel}
            min={MIN_OUTPUT_LEVEL}
            max={MAX_OUTPUT_LEVEL}
            step={KNOB_STEP}
            nominalValue={DEFAULT_OUTPUT_LEVEL}
            onChange={setOutputLevel}
          />
        ) : null}

        <div className="s-meter-face" aria-label={`Signal meter reading ${readout}`}>
          <div className="s-meter-vacuum-tube">
            <div
              className="s-meter-vacuum-glow"
              style={{
                opacity: Math.max(0.18, level / 100),
                transform: `scale(${0.92 + level / 650})`,
              }}
            />
            <div className="s-meter-vacuum-core" />
            <div className="s-meter-vacuum-highlight" />
          </div>

          <svg className="s-meter-scale" viewBox="0 0 128 128" aria-hidden="true">
            {scaleMarks.map((mark) => (
              <DialTick key={mark.label} mark={mark} />
            ))}
            <text className="s-meter-signal-label" x="64" y="103">
              SIGNAL
            </text>
          </svg>

          <div className="s-meter-needle" style={{ transform: `rotate(${needleAngle}deg)` }} />
          <div className="s-meter-pivot" />
        </div>

        {showRightKnob ? (
          <RotaryKnob
            label="GAIN"
            value={inputGain}
            min={MIN_INPUT_GAIN}
            max={MAX_INPUT_GAIN}
            step={KNOB_STEP}
            nominalValue={DEFAULT_INPUT_GAIN}
            onChange={setInputGain}
          />
        ) : null}
      </div>
      {showLedStrip ? <SignalLedStrip level={level} /> : null}
    </div>
  )
}

export { SignalLedStrip }
