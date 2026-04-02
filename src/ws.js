let ws = null

export function connectWS(onMessage) {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${protocol}://${location.host}/ws`

  ws = new WebSocket(url)

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    onMessage(msg)
  }
}

export function sendWS(data) {
  ws?.send(JSON.stringify(data))
}