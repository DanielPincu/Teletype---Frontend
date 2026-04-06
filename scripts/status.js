let ledInterval = null

export function setStatus(text, color, blink = false) {
  const statusEl = document.getElementById('status')
  if (!statusEl) return

  statusEl.innerText = text

  const led = statusEl.nextElementSibling
  if (!led) return

  led.classList.remove(
    'bg-green-500',
    'bg-yellow-400',
    'bg-red-500',
    'opacity-100',
    'opacity-20'
  )

  if (ledInterval) {
    clearInterval(ledInterval)
    ledInterval = null
  }

  if (color === 'green') led.classList.add('bg-green-500')
  if (color === 'yellow') led.classList.add('bg-yellow-400')
  if (color === 'red') led.classList.add('bg-red-500')

  if (blink) {
    let visible = true
    const speed = color === 'red' ? 150 : 500

    ledInterval = setInterval(() => {
      visible = !visible
      led.classList.toggle('opacity-20', !visible)
    }, speed)
  }
}