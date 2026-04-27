let socket = null
let sendQueue = []
let currentHandlers = {}

export function safeSend(data) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    sendQueue.push(data)
    return
  }

  socket.send(JSON.stringify(data))
}

export function connectSocket(handlers = {}) {
  currentHandlers = handlers

  if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) {
    return socket
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const host = isLocal ? 'localhost:3000' : window.location.host

  socket = new WebSocket(`${protocol}://${host}/ws`)

  socket.onopen = () => {
    while (sendQueue.length > 0) {
      socket.send(JSON.stringify(sendQueue.shift()))
    }
    currentHandlers.onOpen?.()
  }

  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data)
    await currentHandlers.onMessage?.(message)
  }

  socket.onclose = () => {
    currentHandlers.onClose?.()
  }

  socket.onerror = (error) => {
    currentHandlers.onError?.(error)
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
}
