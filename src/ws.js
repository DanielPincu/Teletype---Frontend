import { WS_URL } from './config'

let ws = null
let onMessage = null
let onOpen = null
let onClose = null

export function connectWS(handleMessage, handleOpen, handleClose) {
  if (ws && ws.readyState !== WebSocket.CLOSED) return

  onMessage = handleMessage
  onOpen = handleOpen
  onClose = handleClose

  ws = new WebSocket(WS_URL)

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