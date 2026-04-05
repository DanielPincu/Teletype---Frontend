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