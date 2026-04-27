import React, { useEffect, useRef, useState } from 'react'

const ledClasses = Array.from({ length: 22 }, () => 'border-amber-950')

const LEVEL_ATTACK = 0.32
const LEVEL_RELEASE = 0.12
const NOISE_FLOOR = 0.012
const INPUT_GAIN = 3.8

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function getLedColor(index, rowSize) {
  if (index < 4) return '#ffff00'
  if (index >= rowSize - 6) return '#ff0000'
  return '#00ff00'
}

function computeRmsLevel(data) {
  let sumSquares = 0

  for (let index = 0; index < data.length; index += 1) {
    const normalized = (data[index] - 128) / 128
    sumSquares += normalized * normalized
  }

  const rms = Math.sqrt(sumSquares / data.length)
  const gated = Math.max(0, rms - NOISE_FLOOR)
  const normalized = clamp((gated * INPUT_GAIN) / (1 - NOISE_FLOOR), 0, 1)

  // Slight curve so low/mid voice activity still feels alive on the meter.
  return clamp(Math.pow(normalized, 0.72) * 100)
}

export default function SMeter({ micEnabled }) {
  const [level, setLevel] = useState(0)

  const micEnabledRef = useRef(micEnabled)
  const startedRef = useRef(false)
  const levelRef = useRef(0)

  useEffect(() => {
    micEnabledRef.current = micEnabled
  }, [micEnabled])

  useEffect(() => {
    let cancelled = false
    let frameId = null
    let audioContext = null
    let mediaStream = null
    let analyser = null
    let dataArray = null
    let resumeHandler = null

    const resetMeter = () => {
      levelRef.current = 0
      setLevel(0)
    }

    const tick = () => {
      if (cancelled) return

      if (!micEnabledRef.current) {
        resetMeter()
        frameId = window.requestAnimationFrame(tick)
        return
      }

      if (!analyser || !dataArray) {
        frameId = window.requestAnimationFrame(tick)
        return
      }

      analyser.getByteTimeDomainData(dataArray)
      const sampledLevel = computeRmsLevel(dataArray)

      const currentLevel = levelRef.current
      const levelBlend = sampledLevel >= currentLevel ? LEVEL_ATTACK : LEVEL_RELEASE
      const nextLevel = currentLevel + (sampledLevel - currentLevel) * levelBlend
      levelRef.current = clamp(nextLevel)

      setLevel(levelRef.current)

      frameId = window.requestAnimationFrame(tick)
    }

    const startMeter = async () => {
      if (startedRef.current || cancelled) return
      startedRef.current = true

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioContext = new (window.AudioContext || window.webkitAudioContext)()

        analyser = audioContext.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.08
        dataArray = new Uint8Array(analyser.fftSize)

        const source = audioContext.createMediaStreamSource(mediaStream)
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
      mediaStream?.getTracks().forEach((track) => track.stop())
      audioContext?.close().catch(() => {})
    }
  }, [])

  const rowSize = ledClasses.length
  const activeLedCount = Array.from({ length: rowSize }).filter((_, index) => {
    const threshold = ((index + 1) * 100) / rowSize
    return level > threshold
  }).length
  const barWidth = (activeLedCount / rowSize) * 100

  return (
    <div className="w-full pb-2">
      <label className="text-xs text-amber-600 block mb-2 text-center">PWR-Meter</label>
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
