import { create } from 'zustand'

const getStoredBool = (key, fallback = true) => {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  if (value === null) return fallback
  return value === 'true'
}

const getStoredTransportMode = () => {
  if (typeof window === 'undefined') return 'DIRECT'
  return window.localStorage.getItem('connectionMode') === 'relay' ? 'RELAY' : 'DIRECT'
}

const initialTransportMode = getStoredTransportMode()

const initialFileTransferState = {
  drawerCollapsed: true,
  channelReady: false,
  panelVisible: false,
  panelState: 'idle',
  title: 'File Transfer',
  meta: 'Choose a file to send once the peer is connected.',
  status: 'Waiting for file channel.',
  progressPercent: 0,
  speed: '0 B/s',
  primaryAction: null,
  secondaryAction: null,
  cancelVisible: false,
  fileButtonEnabled: false,
  receivedFiles: [],
  toasts: [],
}

export const useAppStore = create((set) => ({
  connectionState: 'idle',
  localStream: null,
  remoteStream: null,
  messages: [
    { id: 'boot-1', text: 'SYSTEM INITIALIZED...', direction: 'system' },
    { id: 'boot-2', text: 'CHECKING PERIPHERALS...', direction: 'system' },
    { id: 'boot-3', text: '> CAMERA: STANDBY', direction: 'system' },
    { id: 'boot-4', text: '> AUDIO: STANDBY', direction: 'system' },
  ],
  fileTransfer: initialFileTransferState,
  dialValue: '0000000',
  mode: initialTransportMode,
  transportMode: initialTransportMode,
  isLocked: false,
  joinError: false,
  micEnabled: getStoredBool('micEnabled', true),
  camEnabled: getStoredBool('camEnabled', true),
  isSharing: false,
  statusText: 'Idle',
  statusColor: 'green',
  statusBlink: false,
  connectionType: null,
  setConnectionState: (connectionState) => set({ connectionState }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...message },
      ],
    })),
  setFileTransfer: (fileTransfer) => set({ fileTransfer }),
  updateFileTransfer: (updater) =>
    set((state) => ({
      fileTransfer:
        typeof updater === 'function' ? updater(state.fileTransfer) : { ...state.fileTransfer, ...updater },
    })),
  setDialValue: (dialValue) => set({ dialValue: String(dialValue).padEnd(7, '0').slice(0, 7) }),
  setTransportMode: (transportMode) =>
    set((state) => ({
      transportMode,
      mode: state.isLocked ? 'CHANNEL' : transportMode,
    })),
  setLocked: (isLocked) =>
    set((state) => ({
      isLocked,
      mode: isLocked ? 'CHANNEL' : state.transportMode,
    })),
  setJoinError: (joinError) => set({ joinError }),
  setMicEnabled: (micEnabled) => set({ micEnabled }),
  setCamEnabled: (camEnabled) => set({ camEnabled }),
  setSharing: (isSharing) => set({ isSharing }),
  setStatus: (statusText, statusColor, statusBlink = false) =>
    set({ statusText, statusColor, statusBlink }),
  setConnectionType: (connectionType) => set({ connectionType }),
  resetConnectionUi: () =>
    set((state) => ({
      connectionState: 'idle',
      localStream: null,
      remoteStream: null,
      isSharing: false,
      statusText: 'Idle',
      statusColor: 'green',
      statusBlink: false,
      fileTransfer: {
        ...state.fileTransfer,
        channelReady: false,
        panelVisible: state.fileTransfer.receivedFiles.length > 0,
        panelState: 'idle',
        title: 'File Transfer',
        meta: 'Choose a file to send once the peer is connected.',
        status: 'Waiting for file channel.',
        progressPercent: 0,
        speed: '0 B/s',
        primaryAction: null,
        secondaryAction: null,
        cancelVisible: false,
        fileButtonEnabled: false,
      },
    })),
}))
