import { connectSocket, safeSend } from './network.js'
import { rtcHandlers, handleSignal, resetPeer, setConnectionMode, getConnectionMode } from './rtc.js'
import { initChat } from './chat.js'
import { initDial, getRoomId, setJoinError as dialSetJoinError, setLocked as dialSetLocked } from './dial.js'
import { initControls } from './controls.js'
import { initConnection } from './connection.js'
import { setStatus } from './status.js'

const localVideo = document.getElementById('local')
const remoteVideo = document.getElementById('remote')

// ---- RTTY MODULE ----
import { sendRTTY } from './rtty.js'

const randomBtn = document.getElementById('random')
const chatBox = document.getElementById('chatBox')
const chatInput = document.getElementById('chatInput')

// Initially disable chat input until connected
if (chatInput) {
  chatInput.disabled = true
  chatInput.placeholder = 'DISCONNECTED'
}


const micBtn = document.getElementById('mic')
const camBtn = document.getElementById('cam')
const shareBtn = document.getElementById('share')
const fullscreenBtn = document.getElementById('fullscreenRemote')
const modeSwitch = document.getElementById('modeSwitch')
const modeKnob = document.getElementById('modeKnob')


const dialEl = document.getElementById('dial')
if (dialEl) {
  initDial({ dialEl })
}

initControls({
  micBtn,
  camBtn,
  shareBtn,
  fullscreenBtn,
  localVideo,
  remoteVideo
})

let isLocked = false

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
  setStatus('Connected', 'green')

  randomBtn.innerText = 'Disconnect'
  randomBtn.classList.remove('bg-gray-700')
  randomBtn.classList.add('bg-red-700')

  if (shareBtn) {
    shareBtn.disabled = false
    shareBtn.classList.remove('opacity-50', 'cursor-not-allowed')
  }

  if (chatInput) {
    chatInput.disabled = false
    chatInput.placeholder = 'ENTER to transmit...'
  }
}

rtcHandlers.onDisconnected = () => {
  setStatus('Idle', 'green')

  randomBtn.innerText = 'Connect'
  randomBtn.classList.remove('bg-red-700')
  randomBtn.classList.add('bg-gray-700')

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

  if (chatInput) {
    chatInput.disabled = true
    chatInput.placeholder = 'DISCONNECTED'
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

// ---- CHAT INPUT (ENTER TO SEND) ----
if (chatInput) {
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = chatInput.value.trim()
      if (!text) return
      // Chat logic is now handled via module.
    }
  })
}

// ---- INIT CHAT MODULE ----
if (chatBox && chatInput && rtcHandlers) {
  initChat({ chatBox, chatInput, rtcHandlers, sendRTTY })
}

// ---- MODE SWITCH ----
if (modeSwitch && modeKnob) {
  // prevent flicker on load by setting correct initial position BEFORE paint
  modeKnob.style.transition = 'none'

  const initialMode = getConnectionMode()
  modeKnob.style.transform = initialMode === 'relay'
    ? 'translateX(0px)'
    : 'translateX(28px)'

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

  // re-enable transition after initial paint
  setTimeout(() => {
    modeKnob.style.transition = ''
  }, 0)

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

// ---- LOCK SWITCH (OPEN / LOCK) ----
const lockSwitch = document.getElementById('lockSwitch')
const lockKnob = document.getElementById('lockKnob')

function updateLockUI() {
  if (!lockKnob || !lockSwitch) return

  if (isLocked) {
    // RIGHT = LOCK
    lockKnob.style.transform = 'translateX(28px)'

    lockSwitch.classList.remove('bg-gray-800')
    lockSwitch.classList.add('bg-red-900')
  } else {
    // LEFT = OPEN
    lockKnob.style.transform = 'translateX(0px)'

    lockSwitch.classList.remove('bg-red-900')
    lockSwitch.classList.add('bg-gray-800')
  }
}

if (lockSwitch) {
  updateLockUI()

  lockSwitch.onclick = () => {
    isLocked = !isLocked
    dialSetLocked(isLocked)
    updateLockUI()

    // optional visual feedback on dial
    if (dialEl) {
      dialEl.classList.toggle('ring-2', isLocked)
      dialEl.classList.toggle('ring-orange-500', isLocked)
    }
    // Removed renderDial()
  }
}

initConnection({
  randomBtn,
  rtcHandlers,
  safeSend,
  resetPeer,
  setStatus,
  getRoomId,
  dialSetJoinError
})