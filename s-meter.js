// -------- S-METER ONLY --------

const meter = document.getElementById('s-meter-bar')
const leds = document.querySelectorAll('.s-led')

function isMicEnabled() {
  return localStorage.getItem('micEnabled') !== 'false'
}

function initMicMeter() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()

    analyser.fftSize = 256
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    source.connect(analyser)

    function updateMeter() {
      // if mic is OFF, reset meter and skip
      if (!isMicEnabled()) {
        if (meter) meter.style.width = '0%'
        leds.forEach(led => {
          led.style.background = 'transparent'
          led.style.boxShadow = ''
        })
        requestAnimationFrame(updateMeter)
        return
      }

      analyser.getByteFrequencyData(dataArray)

      let sum = 0
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
      const avg = sum / dataArray.length

      const level = Math.min(100, (avg / 255) * 260)

      if (meter) meter.style.width = level + '%'

      leds.forEach((led, i) => {
        const threshold = (i + 1) * (100 / leds.length)
        if (level > threshold) {
          led.style.background = '#00ff00'
          led.style.boxShadow = '0 0 6px #00ff00'
        } else {
          led.style.background = 'transparent'
          led.style.boxShadow = ''
        }
      })

      requestAnimationFrame(updateMeter)
    }

    updateMeter()
  })
}

// Start on first user interaction (browser policy)
document.addEventListener('click', () => {
  initMicMeter()
}, { once: true })
