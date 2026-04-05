import { connectSocket, safeSend } from './network.js'
import { rtcHandlers, handleSignal, resetPeer, setConnectionMode, getConnectionMode } from './rtc.js'
import { toggleMic, toggleCam, toggleScreenShare } from './rtc.js'

const localVideo = document.getElementById('local')
const remoteVideo = document.getElementById('remote')
const statusEl = document.getElementById('status')
const randomBtn = document.getElementById('random')
const chatBox = document.getElementById('chatBox')

const micBtn = document.getElementById('mic')
const camBtn = document.getElementById('cam')
const shareBtn = document.getElementById('share')
const fullscreenBtn = document.getElementById('fullscreenRemote')
const modeSwitch = document.getElementById('modeSwitch')
const modeKnob = document.getElementById('modeKnob')
const modeLabel = document.getElementById('modeLabel')

// Initially disable share button
if (shareBtn) {
  shareBtn.disabled = true
  shareBtn.classList.add('opacity-50', 'cursor-not-allowed')
}

let isSharing = false

rtcHandlers.onLocalStream = (stream) => {
  localVideo.srcObject = stream
  localVideo.classList.remove('hidden-video')
}

rtcHandlers.onRemoteStream = (stream) => {
  remoteVideo.srcObject = stream
  remoteVideo.classList.remove('hidden-video')
  remoteVideo.play().catch(()=>{})
}

rtcHandlers.onConnected = () => {
  statusEl.innerText = 'Connected'

  randomBtn.innerText = 'Disconnect'
  randomBtn.classList.remove('bg-gray-700')
  randomBtn.classList.add('bg-red-700')

  isConnected = true
  isSearching = false

  if (shareBtn) {
    shareBtn.disabled = false
    shareBtn.classList.remove('opacity-50', 'cursor-not-allowed')
  }
}

rtcHandlers.onDisconnected = () => {
  statusEl.innerText = 'Disconnected'

  randomBtn.innerText = 'Connect'
  randomBtn.classList.remove('bg-red-700')
  randomBtn.classList.add('bg-gray-700')

  isConnected = false
  isSearching = false

  // reset videos
  if (remoteVideo) {
    remoteVideo.srcObject = null
    remoteVideo.classList.add('hidden-video')
  }

  if (localVideo) {
    localVideo.classList.add('hidden-video')
  }

  if (shareBtn) {
    shareBtn.disabled = true
    shareBtn.classList.add('opacity-50', 'cursor-not-allowed')
    const shareText = document.getElementById('shareText')
    if (shareText) shareText.innerText = 'SHARE'

    // safely replace icon (handles svg already rendered by lucide)
    shareBtn.querySelector('svg')?.remove()
    shareBtn.insertAdjacentHTML('afterbegin', '<i data-lucide="screen-share" class="w-4 h-4"></i>')

    if (window.lucide) window.lucide.createIcons()
    isSharing = false
  }
}

rtcHandlers.onScreenShareStopped = () => {
  if (!shareBtn) return

  const shareText = document.getElementById('shareText')

  // reset icon properly
  shareBtn.querySelector('svg')?.remove()
  shareBtn.insertAdjacentHTML('afterbegin', '<i data-lucide="screen-share" class="w-4 h-4"></i>')

  shareText.innerText = 'SHARE'

  if (window.lucide) window.lucide.createIcons()

  shareBtn.classList.remove('bg-green-700')
  isSharing = false
}

// helper to force reset when user clicks disconnect
function forceDisconnect() {
  rtcHandlers.onDisconnected?.()
}

rtcHandlers.onMessage = (text) => {
  const line = document.createElement('div')
  line.textContent = '< ' + text
  chatBox.appendChild(line)
}

// ---- BUTTONS ----

if (micBtn) {
  micBtn.onclick = () => {
    let enabled = toggleMic()

    // if no stream yet, control via localStorage
    if (!localVideo.srcObject) {
      const current = localStorage.getItem('micEnabled') !== 'false'
      enabled = !current
      localStorage.setItem('micEnabled', enabled ? 'true' : 'false')
    }

    const micText = document.getElementById('micText')

    micText.innerText = enabled ? 'MIC ON' : 'MIC OFF'

    // replace icon safely
    micBtn.querySelector('svg')?.remove()
    micBtn.insertAdjacentHTML('afterbegin', `<i data-lucide="${enabled ? 'mic' : 'mic-off'}" class="w-4 h-4"></i>`)

    if (window.lucide) window.lucide.createIcons()
    micBtn.classList.toggle('bg-green-700', enabled)
  }
}

if (camBtn) {
  camBtn.onclick = () => {
    let enabled = toggleCam()

    // if no stream yet, control via localStorage
    if (!localVideo.srcObject) {
      const current = localStorage.getItem('camEnabled') !== 'false'
      enabled = !current
      localStorage.setItem('camEnabled', enabled ? 'true' : 'false')
    }

    const camText = document.getElementById('camText')

    camText.innerText = enabled ? 'CAM ON' : 'CAM OFF'

    camBtn.querySelector('svg')?.remove()
    camBtn.insertAdjacentHTML('afterbegin', `<i data-lucide="${enabled ? 'video' : 'video-off'}" class="w-4 h-4"></i>`)

    if (window.lucide) window.lucide.createIcons()
    camBtn.classList.toggle('bg-green-700', enabled)
  }
}

if (shareBtn) {
  shareBtn.onclick = async () => {
    // stop sharing
    if (isSharing) {
      const ok = await toggleScreenShare()
      if (!ok) return

      const shareText = document.getElementById('shareText')
      if (shareText) shareText.innerText = 'SHARE'

      // safely replace icon (handles svg already rendered by lucide)
      shareBtn.querySelector('svg')?.remove()
      shareBtn.insertAdjacentHTML('afterbegin', '<i data-lucide="screen-share" class="w-4 h-4"></i>')

      if (window.lucide) window.lucide.createIcons()

      shareBtn.classList.remove('bg-green-700')

      isSharing = false
      return
    }

    // start sharing
    const ok = await toggleScreenShare()
    if (!ok) return

    const shareText = document.getElementById('shareText')
    if (shareText) shareText.innerText = 'STOP'

    shareBtn.querySelector('svg')?.remove()
    shareBtn.insertAdjacentHTML('afterbegin', '<i data-lucide="square" class="w-4 h-4"></i>')

    if (window.lucide) window.lucide.createIcons()

    shareBtn.classList.add('bg-green-700')

    isSharing = true
  }
}

// ---- FULLSCREEN ----

if (fullscreenBtn && remoteVideo) {
  fullscreenBtn.onclick = () => {
    if (!document.fullscreenElement) {
      remoteVideo.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }
}


// ---- INITIAL STATE FROM STORAGE ----

const micEnabled = localStorage.getItem('micEnabled') !== 'false'
const camEnabled = localStorage.getItem('camEnabled') !== 'false'

if (micBtn) {
  const micTextInit = document.getElementById('micText')

  micTextInit.innerText = micEnabled ? 'MIC ON' : 'MIC OFF'

  micBtn.querySelector('svg')?.remove()
  micBtn.insertAdjacentHTML('afterbegin', `<i data-lucide="${micEnabled ? 'mic' : 'mic-off'}" class="w-4 h-4"></i>`)
}

if (camBtn) {
  const camTextInit = document.getElementById('camText')

  camTextInit.innerText = camEnabled ? 'CAM ON' : 'CAM OFF'

  camBtn.querySelector('svg')?.remove()
  camBtn.insertAdjacentHTML('afterbegin', `<i data-lucide="${camEnabled ? 'video' : 'video-off'}" class="w-4 h-4"></i>`)
}

if (window.lucide) window.lucide.createIcons()

connectSocket({
  onMessage: async (msg) => {
    await handleSignal(msg)
  }
})

let isSearching = false
let isConnected = false

randomBtn.onclick = () => {
  // If connected → disconnect
  if (isConnected) {
    safeSend({ type: 'leave' })
    resetPeer()
    forceDisconnect()
    return
  }

  // If searching → cancel
  if (isSearching) {
    safeSend({ type: 'leave' })
    statusEl.innerText = 'Idle'

    randomBtn.innerText = 'Connect'
    randomBtn.classList.remove('bg-red-700')
    randomBtn.classList.add('bg-gray-700')

    isSearching = false
    return
  }

  // Start searching
  safeSend({ type: 'find-peer' })
  statusEl.innerText = 'Searching...'

  randomBtn.innerText = 'Cancel'
  randomBtn.classList.remove('bg-gray-700')
  randomBtn.classList.add('bg-red-700')

  isSearching = true
}
// ---- MODE SWITCH ----
if (modeSwitch && modeKnob) {

  function updateModeUI() {
    const mode = getConnectionMode()

    if (mode === 'relay') {
      // LEFT position
      modeKnob.style.transform = 'translateX(0px)'
      modeSwitch.classList.add('bg-red-900')
    } else {
      // RIGHT position
      modeKnob.style.transform = 'translateX(28px)'
      modeSwitch.classList.remove('bg-red-900')
    }
  }

  updateModeUI()

  modeSwitch.onclick = () => {
    const current = getConnectionMode()
    const next = current === 'p2p' ? 'relay' : 'p2p'

    setConnectionMode(next)
    updateModeUI()

    // force reconnect if active
    if (isConnected || isSearching) {
      safeSend({ type: 'leave' })
      resetPeer()
      forceDisconnect()
    }
  }
}
// ---- DIAL ----

const dialEl = document.getElementById('dial')

let roomId = '0000000'
let joinError = false

function renderDial() {
  if (!dialEl) return

  dialEl.innerHTML = ''

  Array.from({ length: 7 }).forEach((_, i) => {
    const digit = parseInt(roomId[i] || '0', 10)

    const wrapper = document.createElement('div')
    wrapper.className = 'flex flex-col items-center justify-center gap-0'

    const upBtn = document.createElement('button')
    upBtn.innerText = '▲'
    upBtn.disabled = isConnected
    upBtn.className =
      'w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed'

    const downBtn = document.createElement('button')
    downBtn.innerText = '▼'
    downBtn.disabled = isConnected
    downBtn.className =
      'w-10 h-8 flex items-center justify-center text-2xl font-bold bg-black border border-green-700 text-green-400 hover:bg-green-900/30 hover:text-green-200 transition-all duration-150 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed'

    const display = document.createElement('div')
    display.className = `
      relative w-14 h-20 flex items-center justify-center
      bg-black border rounded-md overflow-hidden
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
      renderDial()
    }

    upBtn.onclick = () => updateDigit(digit - 1)
    downBtn.onclick = () => updateDigit(digit + 1)

    wrapper.appendChild(upBtn)
    wrapper.appendChild(display)
    wrapper.appendChild(downBtn)

    dialEl.appendChild(wrapper)
  })
}

// initial render
renderDial()

// expose for future use (connect button, etc.)
window.getDialRoomId = () => roomId
window.setDialRoomId = (val) => {
  roomId = val.padEnd(7, '0').slice(0, 7)
  renderDial()
}