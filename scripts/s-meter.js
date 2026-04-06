// -------- S-METER ONLY --------

const meter = document.getElementById('signal-meter')
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

      const rowSize = leds.length / 2

      leds.forEach((led, i) => {
        const localIndex = i % rowSize
        const threshold = (localIndex + 1) * (100 / rowSize)

        // decide color zone
        let color = '#00ff00' // default green
        if (localIndex < 4) {
          color = '#ffff00' // yellow (low)
        } else if (localIndex >= rowSize - 6) {
          color = '#ff0000' // red (high)
        }

        if (level > threshold) {
          led.style.background = color
          led.style.boxShadow = `0 0 6px ${color}`
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
