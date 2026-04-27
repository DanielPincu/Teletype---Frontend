import { getFileTransferChannel, rtcHandlers } from './rtc.js'

const CHUNK_SIZE = 32 * 1024
const BUFFERED_AMOUNT_LOW_THRESHOLD = CHUNK_SIZE * 4
const MAX_BUFFERED_AMOUNT = CHUNK_SIZE * 8

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const precision = value >= 100 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(precision)} ${units[unitIndex]}`
}

function formatSpeed(bytes, startedAt) {
  if (!startedAt || bytes <= 0) return '0 B/s'
  const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.1)
  return `${formatBytes(bytes / elapsedSeconds)}/s`
}

function isViewableFile(mime) {
  if (!mime) return false

  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    mime === 'application/pdf'
  )
}

function makeToast(title, body) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    body,
  }
}

export function createFileTransferManager({ store, notifyWithRTTY }) {
  let senderTransfer = null
  let receiverTransfer = null
  let transferGeneration = 0
  let channelReady = false

  const setFileTransfer = (updater) => store.getState().updateFileTransfer(updater)

  const pushToast = (title, body) => {
    const toast = makeToast(title, body)
    setFileTransfer((state) => ({ ...state, toasts: [...state.toasts, toast] }))
    notifyWithRTTY?.('FILE')
    window.setTimeout(() => {
      setFileTransfer((state) => ({
        ...state,
        toasts: state.toasts.filter((entry) => entry.id !== toast.id),
      }))
    }, 2800)
  }

  const updateFileButtonState = () => {
    const busy = Boolean(senderTransfer || receiverTransfer)
    setFileTransfer((state) => ({
      ...state,
      fileButtonEnabled: channelReady && !busy,
    }))
  }

  const syncPanelVisibility = () => {
    setFileTransfer((state) => ({
      ...state,
      panelVisible: Boolean(senderTransfer || receiverTransfer || state.receivedFiles.length),
    }))
  }

  const setPanelState = ({
    panelState = 'idle',
    title = 'File Transfer',
    meta = 'Choose a file to send once the peer is connected.',
    status = channelReady ? 'Standing by for transfer.' : 'Waiting for file channel.',
    progressPercent = 0,
    speed = '0 B/s',
    primaryAction = null,
    secondaryAction = null,
    cancelVisible = false,
  }) => {
    setFileTransfer((state) => ({
      ...state,
      panelState,
      title,
      meta,
      status,
      progressPercent,
      speed,
      primaryAction,
      secondaryAction,
      cancelVisible,
    }))
    updateFileButtonState()
    syncPanelVisibility()
  }

  const showIdleState = () => {
    setPanelState({})
  }

  const showSenderState = () => {
    if (!senderTransfer) {
      showIdleState()
      return
    }

    const progressPercent = senderTransfer.file.size
      ? Math.round((senderTransfer.bytesSent / senderTransfer.file.size) * 100)
      : 0

    let status = 'Waiting for receiver to accept.'
    if (senderTransfer.status === 'sending') {
      status = `Sending ${formatBytes(senderTransfer.bytesSent)} of ${formatBytes(senderTransfer.file.size)}`
    } else if (senderTransfer.status === 'completed') {
      status = 'Transfer complete.'
    } else if (senderTransfer.status === 'rejected') {
      status = 'Receiver rejected the file.'
    } else if (senderTransfer.status === 'canceled') {
      status = senderTransfer.canceledByRemote ? 'Transfer canceled by receiver.' : 'Transfer canceled.'
    }

    setPanelState({
      panelState: senderTransfer.status,
      title: senderTransfer.file.name,
      meta: `${formatBytes(senderTransfer.file.size)} • ${senderTransfer.file.type || 'application/octet-stream'}`,
      status,
      progressPercent,
      speed: formatSpeed(senderTransfer.bytesSent, senderTransfer.startedAt),
      cancelVisible: ['offered', 'sending'].includes(senderTransfer.status),
    })
  }

  const showReceiverState = () => {
    if (!receiverTransfer) {
      showIdleState()
      return
    }

    const progressPercent = receiverTransfer.meta.size
      ? Math.round((receiverTransfer.bytesReceived / receiverTransfer.meta.size) * 100)
      : 0

    if (receiverTransfer.status === 'incoming') {
      setPanelState({
        panelState: 'incoming',
        title: receiverTransfer.meta.name,
        meta: `${formatBytes(receiverTransfer.meta.size)} • ${receiverTransfer.meta.mime || 'application/octet-stream'}`,
        status: 'Incoming file offer.',
        progressPercent: 0,
        speed: '0 B/s',
        primaryAction: { label: 'Accept', action: 'accept' },
        secondaryAction: { label: 'Reject', action: 'reject' },
      })
      return
    }

    let status = 'File ready to open or download.'
    if (receiverTransfer.status === 'receiving') {
      status = `Receiving ${formatBytes(receiverTransfer.bytesReceived)} of ${formatBytes(receiverTransfer.meta.size)}`
    } else if (receiverTransfer.status === 'rejected') {
      status = 'File offer rejected.'
    } else if (receiverTransfer.status === 'canceled') {
      status = receiverTransfer.canceledByRemote ? 'Transfer canceled by sender.' : 'Transfer canceled.'
    }

    setPanelState({
      panelState: receiverTransfer.status,
      title: receiverTransfer.meta.name,
      meta: `${formatBytes(receiverTransfer.meta.size)} • ${receiverTransfer.meta.mime || 'application/octet-stream'}`,
      status,
      progressPercent,
      speed: receiverTransfer.status === 'rejected' ? '0 B/s' : formatSpeed(receiverTransfer.bytesReceived, receiverTransfer.startedAt),
      cancelVisible: receiverTransfer.status === 'receiving',
    })
  }

  const clearSenderState = () => {
    senderTransfer = null
    updateFileButtonState()
  }

  const clearReceiverState = () => {
    receiverTransfer = null
    updateFileButtonState()
  }

  const finalizeAndReset = (resetFn, renderFn, delay = 2200) => {
    const generation = ++transferGeneration
    window.setTimeout(() => {
      if (generation !== transferGeneration) return
      resetFn()
      renderFn()
    }, delay)
  }

  const cancelSender = (sendSignal, canceledByRemote = false) => {
    if (!senderTransfer) return

    const activeState = senderTransfer.status
    senderTransfer.status = 'canceled'
    senderTransfer.canceledByRemote = canceledByRemote

    if (sendSignal && ['offered', 'sending'].includes(activeState)) {
      rtcHandlers.sendFileControl?.({ type: 'file-cancel' })
    }

    showSenderState()
    finalizeAndReset(clearSenderState, showIdleState)
  }

  const cancelReceiver = (sendSignal, canceledByRemote = false) => {
    if (!receiverTransfer) return

    const activeState = receiverTransfer.status
    receiverTransfer.status = 'canceled'
    receiverTransfer.canceledByRemote = canceledByRemote
    receiverTransfer.chunks = []

    if (sendSignal && ['incoming', 'receiving'].includes(activeState)) {
      rtcHandlers.sendFileControl?.({ type: 'file-cancel' })
    }

    showReceiverState()
    finalizeAndReset(clearReceiverState, showIdleState)
  }

  const storeReceivedFile = (meta, chunks) => {
    const blob = new Blob(chunks, { type: meta.mime || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      blob,
      url,
      name: meta.name,
      size: meta.size,
      mime: meta.mime || 'application/octet-stream',
    }

    setFileTransfer((state) => ({
      ...state,
      drawerCollapsed: false,
      receivedFiles: [entry, ...state.receivedFiles],
    }))

    pushToast('File Received', `${meta.name} is ready to open or download.`)
    syncPanelVisibility()
  }

  const waitForBufferDrain = async (channel) => {
    if (channel.bufferedAmount <= MAX_BUFFERED_AMOUNT) return

    await new Promise((resolve, reject) => {
      const handleLow = () => {
        cleanup()
        resolve()
      }

      const handleClose = () => {
        cleanup()
        reject(new Error('file channel closed'))
      }

      const cleanup = () => {
        channel.removeEventListener('bufferedamountlow', handleLow)
        channel.removeEventListener('close', handleClose)
      }

      channel.addEventListener('bufferedamountlow', handleLow, { once: true })
      channel.addEventListener('close', handleClose, { once: true })
    })
  }

  const sendFileData = async (transferRef, generation) => {
    const channel = getFileTransferChannel()
    if (!channel || channel.readyState !== 'open') {
      cancelSender(false, true)
      return
    }

    channel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD

    try {
      transferRef.status = 'sending'
      transferRef.startedAt = Date.now()
      showSenderState()

      let offset = 0

      while (offset < transferRef.file.size) {
        if (generation !== transferGeneration || senderTransfer !== transferRef) return

        await waitForBufferDrain(channel)

        const chunk = transferRef.file.slice(offset, offset + CHUNK_SIZE)
        const buffer = await chunk.arrayBuffer()

        if (!rtcHandlers.sendFileChunk?.(buffer)) {
          throw new Error('failed to send file chunk')
        }

        offset += buffer.byteLength
        transferRef.bytesSent = offset
        showSenderState()
      }

      if (!rtcHandlers.sendFileControl?.({ type: 'file-end' })) {
        throw new Error('failed to send file end')
      }

      transferRef.status = 'completed'
      showSenderState()
      finalizeAndReset(clearSenderState, showIdleState)
    } catch (error) {
      console.warn('File send failed', error)
      cancelSender(false, true)
    }
  }

  const handleIncomingFileOffer = (message) => {
    if (senderTransfer || receiverTransfer) {
      rtcHandlers.sendFileControl?.({ type: 'file-reject' })
      return
    }

    receiverTransfer = {
      meta: {
        name: message.name || 'download',
        size: Number(message.size) || 0,
        mime: message.mime || 'application/octet-stream',
      },
      status: 'incoming',
      chunks: [],
      bytesReceived: 0,
      startedAt: null,
      canceledByRemote: false,
    }

    showReceiverState()
    setFileTransfer((state) => ({ ...state, drawerCollapsed: false }))
    pushToast('Incoming File Request', `${receiverTransfer.meta.name} wants permission to transfer.`)
  }

  const handleFileControlMessage = async (message) => {
    if (!message?.type) return

    if (message.type === 'file-offer') {
      handleIncomingFileOffer(message)
      return
    }

    if (message.type === 'file-accept') {
      if (!senderTransfer || senderTransfer.status !== 'offered') return
      const generation = ++transferGeneration
      void sendFileData(senderTransfer, generation)
      return
    }

    if (message.type === 'file-reject') {
      if (!senderTransfer) return
      senderTransfer.status = 'rejected'
      showSenderState()
      finalizeAndReset(clearSenderState, showIdleState)
      return
    }

    if (message.type === 'file-cancel') {
      if (senderTransfer) cancelSender(false, true)
      if (receiverTransfer) cancelReceiver(false, true)
      return
    }

    if (message.type === 'file-end') {
      if (!receiverTransfer || receiverTransfer.status !== 'receiving') return
      receiverTransfer.status = 'completed'
      receiverTransfer.bytesReceived = receiverTransfer.chunks.reduce((total, chunk) => total + chunk.size, 0)
      showReceiverState()
      storeReceivedFile(receiverTransfer.meta, receiverTransfer.chunks)
      finalizeAndReset(clearReceiverState, showIdleState)
    }
  }

  const handleFileData = (buffer) => {
    if (!receiverTransfer || receiverTransfer.status !== 'receiving') return
    const chunk = new Blob([buffer])
    receiverTransfer.chunks.push(chunk)
    receiverTransfer.bytesReceived += buffer.byteLength
    showReceiverState()
  }

  const queueFileOffer = async (file) => {
    if (!channelReady || senderTransfer || receiverTransfer) return false

    senderTransfer = {
      file,
      status: 'offered',
      bytesSent: 0,
      startedAt: null,
      canceledByRemote: false,
    }

    const sent = rtcHandlers.sendFileControl?.({
      type: 'file-offer',
      name: file.name,
      size: file.size,
      mime: file.type || 'application/octet-stream',
    })

    if (!sent) {
      senderTransfer = null
      showIdleState()
      return false
    }

    showSenderState()
    pushToast('File Request Sent', `Waiting for acceptance for ${file.name}.`)
    return true
  }

  const acceptIncomingTransfer = () => {
    if (!receiverTransfer || receiverTransfer.status !== 'incoming') return

    receiverTransfer.status = 'receiving'
    receiverTransfer.startedAt = Date.now()
    receiverTransfer.chunks = []
    receiverTransfer.bytesReceived = 0

    if (!rtcHandlers.sendFileControl?.({ type: 'file-accept' })) {
      cancelReceiver(false, true)
      return
    }

    showReceiverState()
  }

  const rejectIncomingTransfer = () => {
    if (!receiverTransfer || receiverTransfer.status !== 'incoming') return

    rtcHandlers.sendFileControl?.({ type: 'file-reject' })
    receiverTransfer.status = 'rejected'
    receiverTransfer.canceledByRemote = false
    showReceiverState()
    finalizeAndReset(clearReceiverState, showIdleState)
  }

  const cancelTransfer = () => {
    if (senderTransfer) {
      cancelSender(true, false)
      return
    }

    if (receiverTransfer) {
      cancelReceiver(true, false)
    }
  }

  const removeReceivedFile = (id) => {
    setFileTransfer((state) => {
      const entry = state.receivedFiles.find((file) => file.id === id)
      if (entry) URL.revokeObjectURL(entry.url)
      return {
        ...state,
        receivedFiles: state.receivedFiles.filter((file) => file.id !== id),
      }
    })
    syncPanelVisibility()
  }

  const openReceivedFile = (entry) => {
    if (!entry) return
    if (isViewableFile(entry.mime)) {
      window.open(entry.url, '_blank', 'noopener')
      return
    }

    downloadReceivedFile(entry)
  }

  const downloadReceivedFile = (entry) => {
    if (!entry) return
    const link = document.createElement('a')
    link.href = entry.url
    link.download = entry.name
    link.rel = 'noopener'
    link.click()
  }

  const revokeAllReceivedFiles = () => {
    const files = store.getState().fileTransfer.receivedFiles
    files.forEach((entry) => URL.revokeObjectURL(entry.url))
  }

  rtcHandlers.onFileControlMessage = handleFileControlMessage
  rtcHandlers.onFileData = handleFileData
  rtcHandlers.onFileChannelOpen = () => {
    channelReady = true
    showIdleState()
  }
  rtcHandlers.onFileChannelClosed = () => {
    channelReady = false

    if (senderTransfer) {
      cancelSender(false, true)
      return
    }

    if (receiverTransfer) {
      cancelReceiver(false, true)
      return
    }

    showIdleState()
  }
  rtcHandlers.onFileTransferReset = () => {
    channelReady = false
    senderTransfer = null
    receiverTransfer = null
    transferGeneration += 1
    showIdleState()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('unload', revokeAllReceivedFiles)
  }

  showIdleState()

  return {
    queueFileOffer,
    acceptIncomingTransfer,
    rejectIncomingTransfer,
    cancelTransfer,
    removeReceivedFile,
    openReceivedFile,
    downloadReceivedFile,
    setDrawerCollapsed: (collapsed) => setFileTransfer((state) => ({ ...state, drawerCollapsed: collapsed })),
    dispose: () => {
      revokeAllReceivedFiles()
      if (typeof window !== 'undefined') {
        window.removeEventListener('unload', revokeAllReceivedFiles)
      }
    },
  }
}
