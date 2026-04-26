import { getFileTransferChannel } from './rtc.js'

const CHUNK_SIZE = 32 * 1024
const BUFFERED_AMOUNT_LOW_THRESHOLD = CHUNK_SIZE * 4
const MAX_BUFFERED_AMOUNT = CHUNK_SIZE * 8

export function initFileTransfer({
  rtcHandlers,
  fileInput,
  fileButton,
  transferPanel,
  transferTitle,
  transferMeta,
  transferStatus,
  transferProgressBar,
  transferProgressText,
  transferSpeed,
  transferActionPrimary,
  transferActionSecondary,
  transferCancelBtn,
  receivedFilesList,
  receivedFilesEmpty,
  receivedFilesCount,
  fileToastRegion,
  notifyWithRTTY,
  requestDrawerOpen,
}) {
  if (
    !rtcHandlers ||
    !fileInput ||
    !fileButton ||
    !transferPanel ||
    !transferTitle ||
    !transferMeta ||
    !transferStatus ||
    !transferProgressBar ||
    !transferProgressText ||
    !transferSpeed ||
    !transferActionPrimary ||
    !transferActionSecondary ||
    !transferCancelBtn ||
    !receivedFilesList ||
    !receivedFilesEmpty ||
    !receivedFilesCount ||
    !fileToastRegion
  ) {
    return
  }

  let senderTransfer = null
  let receiverTransfer = null
  let transferGeneration = 0
  let channelReady = false
  const receivedFiles = []

  function showToast(title, body) {
    const toast = document.createElement('div')
    toast.className = 'file-toast'

    const titleEl = document.createElement('div')
    titleEl.className = 'file-toast-title'
    titleEl.textContent = title

    const bodyEl = document.createElement('div')
    bodyEl.className = 'file-toast-body'
    bodyEl.textContent = body

    toast.appendChild(titleEl)
    toast.appendChild(bodyEl)
    fileToastRegion.appendChild(toast)

    notifyWithRTTY?.('FILE')

    window.setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateX(16px)'
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease'

      window.setTimeout(() => {
        toast.remove()
      }, 220)
    }, 2600)
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB']
    let value = bytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex++
    }

    const precision = value >= 100 || unitIndex === 0 ? 0 : 1
    return `${value.toFixed(precision)} ${units[unitIndex]}`
  }

  function formatSpeed(bytes, startedAt) {
    if (!startedAt || bytes <= 0) return '0 B/s'

    const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.1)
    return `${formatBytes(bytes / elapsedSeconds)}/s`
  }

  function formatMegabytes(bytes) {
    return `${Math.round((bytes || 0) / (1024 * 1024))} MB`
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

  function triggerDownload(url, filename) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function scheduleUrlRevoke(url, delay = 60_000) {
    window.setTimeout(() => {
      URL.revokeObjectURL(url)
    }, delay)
  }

  function createSessionUrl(entry) {
    const url = URL.createObjectURL(entry.blob)
    scheduleUrlRevoke(url)
    return url
  }

  function updateReceivedFilesSummary() {
    receivedFilesCount.textContent = String(receivedFiles.length)
    receivedFilesEmpty.hidden = receivedFiles.length > 0
  }

  function syncPanelVisibility() {
    transferPanel.hidden = !senderTransfer && !receiverTransfer
    transferPanel.setAttribute('aria-hidden', transferPanel.hidden ? 'true' : 'false')

    const hasReceivedFiles = receivedFiles.length > 0
    const receivedFilesPanel = receivedFilesList.closest('.received-files-panel')
    if (receivedFilesPanel) {
      receivedFilesPanel.hidden = !hasReceivedFiles
      receivedFilesPanel.setAttribute('aria-hidden', receivedFilesPanel.hidden ? 'true' : 'false')
    }
  }

  function removeReceivedFile(id) {
    const index = receivedFiles.findIndex((entry) => entry.id === id)
    if (index === -1) return

    const [entry] = receivedFiles.splice(index, 1)
    URL.revokeObjectURL(entry.url)
    renderReceivedFiles()
  }

  function renderReceivedFiles() {
    receivedFilesList.innerHTML = ''

    receivedFiles.forEach((entry) => {
      const item = document.createElement('div')
      item.className = 'received-file-item'

      const info = document.createElement('div')
      info.className = 'min-w-0'

      const name = document.createElement('div')
      name.className = 'received-file-name text-sm text-amber-200'
      name.textContent = entry.name

      const meta = document.createElement('div')
      meta.className = 'mt-1 text-xs text-amber-600'
      meta.textContent = formatMegabytes(entry.size)

      const actions = document.createElement('div')
      actions.className = 'received-file-actions mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2'

      const openButton = document.createElement('button')
      openButton.className = 'btn-retro w-full px-3 py-2 text-xs rounded'
      openButton.type = 'button'
      openButton.textContent = 'OPEN'
      openButton.addEventListener('click', () => {
        const url = createSessionUrl(entry)

        if (isViewableFile(entry.mime)) {
          window.open(url, '_blank', 'noopener')
          return
        }

        triggerDownload(url, entry.name)
      })

      const downloadButton = document.createElement('button')
      downloadButton.className = 'btn-retro w-full px-3 py-2 text-xs rounded'
      downloadButton.type = 'button'
      downloadButton.textContent = 'DOWNLOAD'
      downloadButton.addEventListener('click', () => {
        const url = createSessionUrl(entry)
        triggerDownload(url, entry.name)
      })

      const removeButton = document.createElement('button')
      removeButton.className = 'btn-retro w-full px-3 py-2 text-xs rounded'
      removeButton.type = 'button'
      removeButton.textContent = 'REMOVE'
      removeButton.addEventListener('click', () => {
        removeReceivedFile(entry.id)
      })

      info.appendChild(name)
      info.appendChild(meta)
      actions.appendChild(openButton)
      actions.appendChild(downloadButton)
      actions.appendChild(removeButton)
      item.appendChild(info)
      item.appendChild(actions)
      receivedFilesList.appendChild(item)
    })

    updateReceivedFilesSummary()
    syncPanelVisibility()
  }

  function revokeAllReceivedFiles() {
    receivedFiles.forEach((entry) => URL.revokeObjectURL(entry.url))
    receivedFiles.length = 0
  }

  function setProgress(current, total) {
    const safeTotal = total > 0 ? total : 1
    const ratio = Math.max(0, Math.min(current / safeTotal, 1))
    const percent = Math.round(ratio * 100)

    transferProgressBar.style.width = `${percent}%`
    transferProgressText.textContent = `${percent}%`
  }

  function setActions({
    primaryLabel = '',
    secondaryLabel = '',
    primaryHidden = true,
    secondaryHidden = true,
    cancelHidden = true,
    primaryDisabled = false,
    secondaryDisabled = false,
  } = {}) {
    transferActionPrimary.textContent = primaryLabel
    transferActionSecondary.textContent = secondaryLabel
    transferActionPrimary.hidden = primaryHidden
    transferActionSecondary.hidden = secondaryHidden
    transferCancelBtn.hidden = cancelHidden
    transferActionPrimary.disabled = primaryDisabled
    transferActionSecondary.disabled = secondaryDisabled
  }

  function updateFileButtonState() {
    const busy = Boolean(senderTransfer || receiverTransfer)
    fileButton.disabled = !channelReady || busy
  }

  function showIdleState() {
    transferPanel.dataset.state = 'idle'
    transferTitle.textContent = 'File Transfer'
    transferMeta.textContent = 'Choose a file to send once the peer is connected.'
    transferStatus.textContent = channelReady
      ? 'Standing by for transfer.'
      : 'Waiting for file channel.'
    transferSpeed.textContent = '0 B/s'
    setProgress(0, 1)
    setActions()
    updateFileButtonState()
    syncPanelVisibility()
  }

  function showSenderState() {
    if (!senderTransfer) {
      showIdleState()
      return
    }

    transferPanel.dataset.state = senderTransfer.status
    transferTitle.textContent = senderTransfer.file.name
    transferMeta.textContent = `${formatBytes(senderTransfer.file.size)} • ${senderTransfer.file.type || 'application/octet-stream'}`

    if (senderTransfer.status === 'offered') {
      transferStatus.textContent = 'Waiting for receiver to accept.'
    } else if (senderTransfer.status === 'sending') {
      transferStatus.textContent = `Sending ${formatBytes(senderTransfer.bytesSent)} of ${formatBytes(senderTransfer.file.size)}`
    } else if (senderTransfer.status === 'completed') {
      transferStatus.textContent = 'Transfer complete.'
    } else if (senderTransfer.status === 'rejected') {
      transferStatus.textContent = 'Receiver rejected the file.'
    } else if (senderTransfer.status === 'canceled') {
      transferStatus.textContent = senderTransfer.canceledByRemote
        ? 'Transfer canceled by receiver.'
        : 'Transfer canceled.'
    }

    transferSpeed.textContent = formatSpeed(senderTransfer.bytesSent, senderTransfer.startedAt)
    setProgress(senderTransfer.bytesSent, senderTransfer.file.size)
    setActions({
      cancelHidden: !['offered', 'sending'].includes(senderTransfer.status),
    })
    updateFileButtonState()
    syncPanelVisibility()
  }

  function showReceiverState() {
    if (!receiverTransfer) {
      showIdleState()
      return
    }

    transferPanel.dataset.state = receiverTransfer.status
    transferTitle.textContent = receiverTransfer.meta.name
    transferMeta.textContent = `${formatBytes(receiverTransfer.meta.size)} • ${receiverTransfer.meta.mime || 'application/octet-stream'}`

    if (receiverTransfer.status === 'incoming') {
      transferStatus.textContent = 'Incoming file offer.'
      transferSpeed.textContent = '0 B/s'
      setProgress(0, receiverTransfer.meta.size)
      setActions({
        primaryLabel: 'Accept',
        secondaryLabel: 'Reject',
        primaryHidden: false,
        secondaryHidden: false,
        cancelHidden: true,
      })
      updateFileButtonState()
      syncPanelVisibility()
      return
    }

    if (receiverTransfer.status === 'receiving') {
      transferStatus.textContent = `Receiving ${formatBytes(receiverTransfer.bytesReceived)} of ${formatBytes(receiverTransfer.meta.size)}`
      transferSpeed.textContent = formatSpeed(receiverTransfer.bytesReceived, receiverTransfer.startedAt)
      setProgress(receiverTransfer.bytesReceived, receiverTransfer.meta.size)
      setActions({
        cancelHidden: false,
      })
      updateFileButtonState()
      syncPanelVisibility()
      return
    }

    if (receiverTransfer.status === 'completed') {
      transferStatus.textContent = 'File ready to open or download.'
      transferSpeed.textContent = formatSpeed(receiverTransfer.bytesReceived, receiverTransfer.startedAt)
      setProgress(receiverTransfer.bytesReceived, receiverTransfer.meta.size)
      setActions()
      updateFileButtonState()
      syncPanelVisibility()
      return
    }

    if (receiverTransfer.status === 'rejected') {
      transferStatus.textContent = 'File offer rejected.'
      transferSpeed.textContent = '0 B/s'
      setProgress(0, receiverTransfer.meta.size)
      setActions()
    }

    if (receiverTransfer.status === 'canceled') {
      transferStatus.textContent = receiverTransfer.canceledByRemote
        ? 'Transfer canceled by sender.'
        : 'Transfer canceled.'
      transferSpeed.textContent = formatSpeed(receiverTransfer.bytesReceived, receiverTransfer.startedAt)
      setProgress(receiverTransfer.bytesReceived, receiverTransfer.meta.size)
      setActions()
    }

    updateFileButtonState()
    syncPanelVisibility()
  }

  function clearSenderState() {
    senderTransfer = null
    updateFileButtonState()
  }

  function clearReceiverState() {
    receiverTransfer = null
    updateFileButtonState()
  }

  function finalizeAndReset(resetFn, renderFn, delay = 2200) {
    const generation = ++transferGeneration
    window.setTimeout(() => {
      if (generation !== transferGeneration) return
      resetFn()
      renderFn()
    }, delay)
  }

  function cancelSender(sendSignal, canceledByRemote = false) {
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

  function cancelReceiver(sendSignal, canceledByRemote = false) {
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

  function storeReceivedFile(meta, chunks) {
    const blob = new Blob(chunks, { type: meta.mime || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    receivedFiles.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      blob,
      name: meta.name,
      size: meta.size,
      mime: meta.mime || 'application/octet-stream',
      url,
    })
    renderReceivedFiles()
    showToast('File Received', `${meta.name} is ready to open or download.`)
    requestDrawerOpen?.()
  }

  async function waitForBufferDrain(channel) {
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

  async function sendFileData(transferRef, generation) {
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
        if (generation !== transferGeneration || senderTransfer !== transferRef) {
          return
        }

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

  function handleIncomingFileOffer(message) {
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
    showToast('Incoming File Request', `${receiverTransfer.meta.name} wants permission to transfer.`)
    requestDrawerOpen?.()
  }

  async function handleFileControlMessage(message) {
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
      if (senderTransfer) {
        cancelSender(false, true)
      }

      if (receiverTransfer) {
        cancelReceiver(false, true)
      }
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

  function handleFileData(buffer) {
    if (!receiverTransfer || receiverTransfer.status !== 'receiving') return

    const chunk = new Blob([buffer])
    receiverTransfer.chunks.push(chunk)
    receiverTransfer.bytesReceived += buffer.byteLength
    showReceiverState()
  }

  async function queueFileOffer(file) {
    if (!channelReady || senderTransfer || receiverTransfer) return

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
      return
    }

    showSenderState()
    showToast('File Request Sent', `Waiting for acceptance for ${file.name}.`)
  }

  fileButton.addEventListener('click', () => {
    if (fileButton.disabled) return
    fileInput.click()
  })

  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files || []
    fileInput.value = ''

    if (!file) return
    void queueFileOffer(file)
  })

  transferActionPrimary.addEventListener('click', () => {
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
  })

  transferActionSecondary.addEventListener('click', () => {
    if (!receiverTransfer || receiverTransfer.status !== 'incoming') return

    rtcHandlers.sendFileControl?.({ type: 'file-reject' })
    receiverTransfer.status = 'rejected'
    receiverTransfer.canceledByRemote = false
    showReceiverState()
    finalizeAndReset(clearReceiverState, showIdleState)
  })

  transferCancelBtn.addEventListener('click', () => {
    if (senderTransfer) {
      cancelSender(true, false)
      return
    }

    if (receiverTransfer) {
      cancelReceiver(true, false)
    }
  })

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
    transferGeneration++
    showIdleState()
  }

  window.addEventListener('unload', revokeAllReceivedFiles)

  renderReceivedFiles()
  showIdleState()
}
