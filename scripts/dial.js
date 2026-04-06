let dialElRef = null

let roomId = '0000000'
let joinError = false
let isLocked = false

export function initDial({ dialEl }) {
  dialElRef = dialEl
  render()
}

export function getRoomId() {
  return roomId
}

export function setRoomId(val) {
  roomId = val.padEnd(7, '0').slice(0, 7)
  render()
}

export function setJoinError(val) {
  joinError = val
  render()
}

export function setLocked(val) {
  isLocked = val
  render()
}

function render() {
  if (!dialElRef) return

  dialElRef.innerHTML = ''

  Array.from({ length: 7 }).forEach((_, i) => {
    const digit = parseInt(roomId[i] || '0', 10)

    const wrapper = document.createElement('div')
    wrapper.className = 'flex flex-col items-center justify-center gap-0'

    const upBtn = document.createElement('button')
    upBtn.innerText = '▲'
    upBtn.className =
      'w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90'
    upBtn.disabled = isLocked
    if (isLocked) upBtn.classList.add('opacity-30', 'cursor-not-allowed')

    const downBtn = document.createElement('button')
    downBtn.innerText = '▼'
    downBtn.className =
      'w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90'
    downBtn.disabled = isLocked
    if (isLocked) downBtn.classList.add('opacity-30', 'cursor-not-allowed')

    const display = document.createElement('div')
    display.className = `
      relative w-14 h-20 flex items-center justify-center
      bg-black border rounded-md overflow-hidden
      ${isLocked ? 'opacity-50' : ''}
      ${joinError
        ? 'border-orange-700 shadow-[0_0_10px_rgba(255,120,0,0.7)]'
        : 'border-orange-500 shadow-[0_0_12px_rgba(255,140,0,0.6)]'}
    `

    const stack = document.createElement('div')
    stack.className = 'relative flex flex-col items-center justify-center'

    Array.from({ length: 10 }).forEach((_, n) => {
      const span = document.createElement('span')
      span.innerText = n
      span.className = `
        absolute text-2xl font-bold transition-all duration-300
        ${n === digit
          ? 'text-orange-300 opacity-100 scale-110 drop-shadow-[0_0_8px_rgba(255,120,0,0.9)]'
          : 'text-orange-800 opacity-20 scale-90'}
      `
      span.style.transform = `translateY(${(n - digit) * 20}px)`
      stack.appendChild(span)
    })

    const glow = document.createElement('div')
    glow.className = 'absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,140,0,0.15),transparent_70%)]'

    const reflection = document.createElement('div')
    reflection.className = 'absolute inset-0 from-white/5 to-transparent opacity-40'

    display.appendChild(stack)
    display.appendChild(glow)
    display.appendChild(reflection)

    function updateDigit(val) {
      const next = roomId.padEnd(7, '0').split('')
      next[i] = String((val + 10) % 10)
      roomId = next.join('').slice(0, 7)
      joinError = false
      render()
    }

    upBtn.onclick = () => updateDigit(digit - 1)
    downBtn.onclick = () => updateDigit(digit + 1)

    wrapper.appendChild(upBtn)
    wrapper.appendChild(display)
    wrapper.appendChild(downBtn)

    dialElRef.appendChild(wrapper)
  })
}