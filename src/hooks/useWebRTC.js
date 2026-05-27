import { useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '../store/useAppStore.js'
import { connectSocket, disconnectSocket, safeSend } from '../services/network.js'
import { getConnectionDiagnostics, getConnectionMode, getScreenShareState, handleSignal, resetPeer, rtcHandlers, setConnectionMode, toggleCam, toggleMic, toggleScreenShare } from '../services/rtc.js'
import { createFileTransferManager } from '../services/fileTransfer.js'
import { isSocketConnectionActive, requestConnection } from '../services/connection.js'
import { sendRTTY } from '../utils/rtty.js'

const formatConnectionStatus = (type) => {
  if (type === 'relay') return ['Connected(RELAY)', 'red']
  if (type === 'hybrid') return ['Connected(HYBRID)', 'yellow']
  if (type === 'srflx') return ['Connected(STUN)', 'yellow']
  if (type === 'host') return ['Connected(LOCAL)', 'green']
  return [`Connected(${type})`, 'green']
}

export function useWebRTC() {
  const store = useAppStore
  const fileTransferManagerRef = useRef(null)
  const diagnosticsPreviousRef = useRef(null)

  useEffect(() => {
    fileTransferManagerRef.current = createFileTransferManager({
      store,
      notifyWithRTTY: (text) => sendRTTY(text),
    })

    rtcHandlers.onLocalStream = (stream) => {
      store.getState().setLocalStream(stream)
    }

    rtcHandlers.onRemoteStream = (stream) => {
      store.getState().setRemoteStream(stream)
    }

    rtcHandlers.onConnected = () => {
      const state = store.getState()
      state.setConnectionState('connected')
      state.setStatus('Connected', 'green')
      state.setSharing(false)
    }

    rtcHandlers.onIceStateChange = (stateStr) => {
      if (stateStr === 'checking') {
        store.getState().setStatus('Connecting...', 'yellow')
      }
    }

    rtcHandlers.onConnectionType = (type) => {
      const [label, color] = formatConnectionStatus(type)
      const state = store.getState()
      state.setConnectionType(type)
      state.setStatus(label, color)
    }

    rtcHandlers.onConnectionFailed = (reason) => {
      const state = store.getState()
      state.setConnectionState('idle')
      state.setStatus(reason === 'timeout' ? 'Direct failed (try RELAY)' : 'Connection failed', 'red')
      state.setRemoteStream(null)
      state.setLocalStream(null)
      state.setSharing(false)
    }

    rtcHandlers.onDisconnected = () => {
      const state = store.getState()
      state.resetConnectionUi()
    }

    rtcHandlers.onMessage = (text) => {
      const state = store.getState()
      sendRTTY(text)
      state.appendMessage({ text, direction: 'incoming' })
    }

    rtcHandlers.onScreenShareStopped = () => {
      store.getState().setSharing(false)
    }

    rtcHandlers.onSyncCode = (code) => {
      store.getState().setSyncCode(code)
    }

    connectSocket({
      onMessage: async (message) => {
        const state = store.getState()

        if (message.type === 'peer-left' || message.type === 'left') {
          resetPeer()
          state.resetConnectionUi()
          state.setStatus('Idle', 'green')
          return
        }

        if (message.type === 'peer-found') {
          await handleSignal(message)
          return
        }

        if (message.type === 'queued') {
          state.setConnectionState('connecting')
          state.setStatus('Searching...', 'yellow', true)
          return
        }

        if (message.type === 'waiting-in-room') {
          state.setConnectionState('connecting')
          state.setStatus('Tuning...', 'yellow', true)
          return
        }

        if (message.type === 'room-busy') {
          state.setConnectionState('idle')
          state.setJoinError(true)
          state.setStatus('CHANNEL BUSY', 'red', true)
          return
        }

        await handleSignal(message)
      },
    })

    return () => {
      fileTransferManagerRef.current?.dispose()
      disconnectSocket()
      resetPeer()
    }
  }, [store])

  useEffect(() => {
    let cancelled = false

    const pollDiagnostics = async () => {
      const snapshot = await getConnectionDiagnostics()
      if (cancelled) return

      const previous = diagnosticsPreviousRef.current
      const elapsedSeconds = previous
        ? Math.max((snapshot.updatedAt - previous.updatedAt) / 1000, 0.1)
        : null

      const sentDelta = previous ? Math.max(snapshot.bytesSent - previous.bytesSent, 0) : 0
      const receivedDelta = previous ? Math.max(snapshot.bytesReceived - previous.bytesReceived, 0) : 0
      const sendBitrateKbps = elapsedSeconds ? Math.round((sentDelta * 8) / elapsedSeconds / 1000) : null
      const receiveBitrateKbps = elapsedSeconds ? Math.round((receivedDelta * 8) / elapsedSeconds / 1000) : null
      const packetTotal = snapshot.packetsLost + snapshot.packetsReceived
      const packetLossPercent = packetTotal > 0
        ? Number(((snapshot.packetsLost / packetTotal) * 100).toFixed(1))
        : null

      diagnosticsPreviousRef.current = snapshot
      store.getState().updateDiagnostics({
        updatedAt: snapshot.updatedAt,
        connected: snapshot.connected,
        connectionState: snapshot.connectionState,
        iceState: snapshot.iceState,
        signalingState: snapshot.signalingState,
        connectionMode: snapshot.connectionMode,
        pathLabel: snapshot.pathLabel,
        localCandidateType: snapshot.localCandidateType,
        remoteCandidateType: snapshot.remoteCandidateType,
        latencyMs: snapshot.latencyMs,
        packetLossPercent,
        bitrateKbps: sendBitrateKbps === null || receiveBitrateKbps === null
          ? null
          : sendBitrateKbps + receiveBitrateKbps,
        sendBitrateKbps,
        receiveBitrateKbps,
        codec: snapshot.codec,
        reconnectAttempts: snapshot.reconnectAttempts,
      })
    }

    void pollDiagnostics()
    const intervalId = window.setInterval(() => {
      void pollDiagnostics()
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [store])

  const actions = useMemo(
    () => ({
      connect: () => {
        const state = store.getState()

        if (state.connectionState === 'connected') {
          safeSend({ type: 'leave' })
          resetPeer()
          rtcHandlers.onDisconnected?.()
          return
        }

        if (state.connectionState === 'connecting') {
          safeSend({ type: 'leave' })
          state.setConnectionState('idle')
          state.setStatus('Idle', 'green')
          return
        }

        state.setJoinError(false)
        const request = requestConnection({
          isLocked: state.isLocked,
          dialValue: state.dialValue,
        })

        safeSend(request)
        state.setConnectionState('connecting')
        state.setStatus(state.isLocked ? 'Tuning...' : 'Searching...', 'yellow', true)
      },
      disconnect: () => {
        safeSend({ type: 'leave' })
        resetPeer()
        rtcHandlers.onDisconnected?.()
      },
      sendMessage: (text) => {
        const value = text.trim()
        if (!value) return false
        const sent = rtcHandlers.sendMessage?.(value)
        if (!sent) return false

        const state = store.getState()
        sendRTTY(value)
        state.appendMessage({ text: value, direction: 'outgoing' })
        return true
      },
      sendFile: async (file) => fileTransferManagerRef.current?.queueFileOffer(file),
      acceptFile: () => fileTransferManagerRef.current?.acceptIncomingTransfer(),
      rejectFile: () => fileTransferManagerRef.current?.rejectIncomingTransfer(),
      cancelTransfer: () => fileTransferManagerRef.current?.cancelTransfer(),
      removeReceivedFile: (id) => fileTransferManagerRef.current?.removeReceivedFile(id),
      openReceivedFile: (entry) => fileTransferManagerRef.current?.openReceivedFile(entry),
      downloadReceivedFile: (entry) => fileTransferManagerRef.current?.downloadReceivedFile(entry),
      setDrawerCollapsed: (collapsed) => fileTransferManagerRef.current?.setDrawerCollapsed(collapsed),
      setDiagnosticsDrawerCollapsed: (collapsed) => {
        store.getState().updateDiagnostics({ drawerCollapsed: collapsed })
      },
      toggleMic: () => {
        const next = toggleMic()
        if (typeof next === 'boolean') {
          store.getState().setMicEnabled(next)
          return next
        }

        const current = window.localStorage.getItem('micEnabled') !== 'false'
        const fallback = !current
        window.localStorage.setItem('micEnabled', fallback ? 'true' : 'false')
        store.getState().setMicEnabled(fallback)
        return fallback
      },
      toggleCam: () => {
        const next = toggleCam()
        if (typeof next === 'boolean') {
          store.getState().setCamEnabled(next)
          return next
        }

        const current = window.localStorage.getItem('camEnabled') !== 'false'
        const fallback = !current
        window.localStorage.setItem('camEnabled', fallback ? 'true' : 'false')
        store.getState().setCamEnabled(fallback)
        return fallback
      },
      toggleScreenShare: async () => {
        const ok = await toggleScreenShare()
        if (ok) {
          store.getState().setSharing(getScreenShareState())
        }
        return ok
      },
      setTransportMode: (mode) => {
        const normalized = mode === 'RELAY' ? 'relay' : 'p2p'
        setConnectionMode(normalized)
        const state = store.getState()
        state.setTransportMode(mode)
        state.updateDiagnostics({ connectionMode: normalized })

        if (isSocketConnectionActive(state.connectionState)) {
          safeSend({ type: 'leave' })
          resetPeer()
          rtcHandlers.onDisconnected?.()
        }
      },
      toggleLock: () => {
        const state = store.getState()
        state.setLocked(!state.isLocked)
        state.setJoinError(false)
      },
      updateDialDigit: (index, delta) => {
        const state = store.getState()
        const digits = state.dialValue.padEnd(7, '0').split('')
        const currentDigit = Number.parseInt(digits[index] || '0', 10)
        digits[index] = String((currentDigit + delta + 10) % 10)
        state.setDialValue(digits.join(''))
        state.setJoinError(false)
      },
      syncTransportModeFromRtc: () => {
        store.getState().setTransportMode(getConnectionMode() === 'relay' ? 'RELAY' : 'DIRECT')
      },
    }),
    [store],
  )

  return actions
}
