
let ws = null
let onMessage = null
let onOpen = null
let onClose = null

export function connectWS(handleMessage, handleOpen, handleClose) {
  if (ws && ws.readyState !== WebSocket.CLOSED) return

  onMessage = handleMessage
  onOpen = handleOpen
  onClose = handleClose

  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'

  let url

  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    url = `${protocol}://127.0.0.1:3000/ws`
  } else {
    url = `${protocol}://${location.host}/ws`
  }

  ws = new WebSocket(url)

  ws.onopen = () => {
    onOpen && onOpen()
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      onMessage && onMessage(msg)
    } catch (err) {
      console.error('WS parse error:', err)
    }
  }

  ws.onclose = () => {
    onClose && onClose()

    // auto reconnect after delay
    setTimeout(() => {
      connectWS(onMessage, onOpen, onClose)
    }, 2000)
  }

  ws.onerror = (err) => {
    console.error('WS error:', err)
  }
}

export function sendWS(data) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

export function closeWS() {
  ws?.close()
  ws = null
}