const AudioContextCtor = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null
const audioCtx = AudioContextCtor ? new AudioContextCtor() : null

let rttyOsc = null
let rttyGain = null

function startRTTY() {
  if (!audioCtx || rttyOsc) return

  rttyOsc = audioCtx.createOscillator()
  rttyGain = audioCtx.createGain()

  rttyOsc.type = 'sine'
  rttyOsc.frequency.value = 2125
  rttyGain.gain.value = 0.03

  rttyOsc.connect(rttyGain)
  rttyGain.connect(audioCtx.destination)
  rttyOsc.start()
}

function stopRTTY(delay = 0.1) {
  if (!rttyOsc || !rttyGain || !audioCtx) return

  const now = audioCtx.currentTime
  rttyGain.gain.setTargetAtTime(0.0001, now, delay)

  window.setTimeout(() => {
    try {
      rttyOsc.stop()
    } catch {}
    rttyOsc.disconnect()
    rttyGain.disconnect()
    rttyOsc = null
    rttyGain = null
  }, delay * 1000 + 50)
}

export function sendRTTY(text = '') {
  if (!audioCtx) return

  const baud = 45.45
  const bitDuration = 1 / baud
  const MARK = 2125
  const SPACE = 2295

  startRTTY()

  let t = audioCtx.currentTime

  const shift = (freq, time) => {
    rttyOsc?.frequency.setValueAtTime(freq, time)
  }

  text.toUpperCase().split('').forEach(() => {
    shift(SPACE, t)
    t += bitDuration

    for (let index = 0; index < 5; index += 1) {
      shift(Math.random() > 0.5 ? MARK : SPACE, t)
      t += bitDuration
    }

    shift(MARK, t)
    t += bitDuration * 1.5
  })

  stopRTTY(t - audioCtx.currentTime + 0.05)
}
