import { toggleMic, toggleCam, toggleScreenShare } from './rtc.js'

export function initControls({
  micBtn,
  camBtn,
  shareBtn,
  fullscreenBtn,
  localVideo,
  remoteVideo
}) {
  let isSharing = false

  // ---- INITIAL STATE ----
  const micEnabled = localStorage.getItem('micEnabled') !== 'false'
  const camEnabled = localStorage.getItem('camEnabled') !== 'false'

  if (micBtn) {
    const micText = document.getElementById('micText')
    micText.innerText = micEnabled ? 'MIC ON' : 'MIC OFF'

    micBtn.querySelector('svg')?.remove()
    micBtn.insertAdjacentHTML('afterbegin',
      `<i data-lucide="${micEnabled ? 'mic' : 'mic-off'}" class="w-4 h-4"></i>`
    )
  }

  if (camBtn) {
    const camText = document.getElementById('camText')
    camText.innerText = camEnabled ? 'CAM ON' : 'CAM OFF'

    camBtn.querySelector('svg')?.remove()
    camBtn.insertAdjacentHTML('afterbegin',
      `<i data-lucide="${camEnabled ? 'video' : 'video-off'}" class="w-4 h-4"></i>`
    )
  }

  if (window.lucide) window.lucide.createIcons()

  // ---- MIC ----
  if (micBtn) {
    micBtn.onclick = () => {
      let enabled = toggleMic()

      if (!localVideo.srcObject) {
        const current = localStorage.getItem('micEnabled') !== 'false'
        enabled = !current
        localStorage.setItem('micEnabled', enabled ? 'true' : 'false')
      }

      const micText = document.getElementById('micText')
      micText.innerText = enabled ? 'MIC ON' : 'MIC OFF'

      micBtn.querySelector('svg')?.remove()
      micBtn.insertAdjacentHTML('afterbegin',
        `<i data-lucide="${enabled ? 'mic' : 'mic-off'}" class="w-4 h-4"></i>`
      )

      if (window.lucide) window.lucide.createIcons()
      micBtn.classList.toggle('bg-green-700', enabled)
    }
  }

  // ---- CAM ----
  if (camBtn) {
    camBtn.onclick = () => {
      let enabled = toggleCam()

      if (!localVideo.srcObject) {
        const current = localStorage.getItem('camEnabled') !== 'false'
        enabled = !current
        localStorage.setItem('camEnabled', enabled ? 'true' : 'false')
      }

      const camText = document.getElementById('camText')
      camText.innerText = enabled ? 'CAM ON' : 'CAM OFF'

      camBtn.querySelector('svg')?.remove()
      camBtn.insertAdjacentHTML('afterbegin',
        `<i data-lucide="${enabled ? 'video' : 'video-off'}" class="w-4 h-4"></i>`
      )

      if (window.lucide) window.lucide.createIcons()
      camBtn.classList.toggle('bg-green-700', enabled)
    }
  }

  // ---- SHARE ----
  if (shareBtn) {
    // initial disabled state
    shareBtn.disabled = true
    shareBtn.classList.add('opacity-50', 'cursor-not-allowed')

    shareBtn.onclick = async () => {
      if (isSharing) {
        const ok = await toggleScreenShare()
        if (!ok) return

        const shareText = document.getElementById('shareText')
        if (shareText) shareText.innerText = 'SHARE'

        shareBtn.querySelector('svg')?.remove()
        shareBtn.insertAdjacentHTML('afterbegin',
          '<i data-lucide="screen-share" class="w-4 h-4"></i>'
        )

        if (window.lucide) window.lucide.createIcons()

        shareBtn.classList.remove('bg-green-700')
        isSharing = false
        return
      }

      const ok = await toggleScreenShare()
      if (!ok) return

      const shareText = document.getElementById('shareText')
      if (shareText) shareText.innerText = 'STOP'

      shareBtn.querySelector('svg')?.remove()
      shareBtn.insertAdjacentHTML('afterbegin',
        '<i data-lucide="square" class="w-4 h-4"></i>'
      )

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
}