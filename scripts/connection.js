import { connectSocket } from './network.js'
import { handleSignal } from './rtc.js'

export function initConnection({
  randomBtn,
  rtcHandlers,
  safeSend,
  resetPeer,
  setStatus,
  getRoomId,
  dialSetJoinError
}) {
  let isSearching = false
  let isConnected = false
  let isLocked = false

  // expose setter (used by lock switch if needed later, or else DELETE it :)) Never gonna happen )
  window.__setLockState = (val) => {
    isLocked = val
  }

  function forceDisconnect() {
    rtcHandlers.onDisconnected?.()
  }

  connectSocket({
    onMessage: async (msg) => {
      console.log('WS MSG:', msg)

      if (msg.type === 'peer-found') {
        await handleSignal(msg)
        return
      }

      if (msg.type === 'waiting-in-room') {
        setStatus('Tuning...', 'yellow', true)
        return
      }

      if (msg.type === 'room-busy') {
        setStatus('CHANNEL BUSY', 'red', true)
        dialSetJoinError(true)
        return
      }

      await handleSignal(msg)
    }
  })

  if (!randomBtn) return

  randomBtn.onclick = () => {
    // disconnect
    if (isConnected) {
      safeSend({ type: 'leave' })
      resetPeer()
      forceDisconnect()
      isConnected = false
      return
    }

    // cancel search
    if (isSearching) {
      safeSend({ type: 'leave' })

      setStatus('Idle', 'green')

      randomBtn.innerText = 'Connect'
      randomBtn.classList.remove('bg-red-700')
      randomBtn.classList.add('bg-gray-700')

      isSearching = false
      return
    }

    // join locked room
    if (isLocked) {
      const roomId = getRoomId()

      resetPeer()

      safeSend({
        type: 'join-room',
        roomId
      })

      setStatus('Tuning...', 'yellow', true)
      randomBtn.innerText = 'Cancel'
      randomBtn.classList.remove('bg-gray-700')
      randomBtn.classList.add('bg-red-700')

      isSearching = true
      return
    }

    // normal search
    safeSend({ type: 'find-peer' })

    setStatus('Searching...', 'yellow', true)
    randomBtn.innerText = 'Cancel'
    randomBtn.classList.remove('bg-gray-700')
    randomBtn.classList.add('bg-red-700')

    isSearching = true
  }

  // sync with RTC events
  rtcHandlers.onConnected = ((original) => () => {
    original?.()
    isConnected = true
    isSearching = false
  })(rtcHandlers.onConnected)

  rtcHandlers.onDisconnected = ((original) => () => {
    original?.()
    isConnected = false
    isSearching = false
  })(rtcHandlers.onDisconnected)
}