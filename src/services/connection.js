export function requestConnection({ isLocked, dialValue }) {
  if (isLocked) {
    return { type: 'join-room', roomId: dialValue }
  }

  return { type: 'find-peer' }
}

export function isSocketConnectionActive(connectionState) {
  return connectionState === 'connecting' || connectionState === 'connected'
}
