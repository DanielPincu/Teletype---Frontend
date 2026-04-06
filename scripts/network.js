let socket
let sendQueue = []

export function safeSend(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    sendQueue.push(data)
    return
  }
  socket.send(JSON.stringify(data))
}

export function connectSocket(handlers) {
  const protocol = location.protocol === "https:" ? "wss" : "ws"
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  const host = isLocal ? 'localhost:3000' : location.host

  socket = new WebSocket(`${protocol}://${host}/ws`)

  socket.onopen = () => {
    console.log('WS connected')
    while (sendQueue.length > 0) {
      socket.send(JSON.stringify(sendQueue.shift()))
    }
  }

  socket.onmessage = async (event) => {
    const msg = JSON.parse(event.data)

    if (handlers.onMessage) {
      handlers.onMessage(msg)
    }
  }
}