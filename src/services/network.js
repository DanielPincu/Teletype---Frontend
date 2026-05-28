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
  if (Object.keys(handlers).length > 0) {
    currentHandlers = handlers
  }

  if (socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) {
    return socket
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const host = isLocal ? 'localhost:3000' : window.location.host

  const nextSocket = new WebSocket(`${protocol}://${host}/ws`)
  socket = nextSocket

  nextSocket.onopen = () => {
    while (sendQueue.length > 0) {
      nextSocket.send(JSON.stringify(sendQueue.shift()))
    }
    currentHandlers.onOpen?.()
  }

  nextSocket.onmessage = async (event) => {
    const message = JSON.parse(event.data)
    await currentHandlers.onMessage?.(message)
  }

  nextSocket.onclose = () => {
    if (socket === nextSocket) {
      socket = null
    }
    currentHandlers.onClose?.()
  }

  nextSocket.onerror = (error) => {
    currentHandlers.onError?.(error)
  }

  return nextSocket
}

export function disconnectSocket() {
  if (socket) {
    socket.close()
    socket = null
  }
}
