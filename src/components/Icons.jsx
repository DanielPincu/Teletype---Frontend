import React from 'react'

function BaseIcon({ children, className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function MicIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 10a7 7 0 0 1-14 0" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </BaseIcon>
  )
}

export function MicOffIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
      <path d="M15 9V6a3 3 0 0 0-5.78-1.18" />
      <path d="M17 10a5 5 0 0 1-.74 2.61" />
      <path d="M19 10a7 7 0 0 1-12.32 4.61" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
      <path d="m3 3 18 18" />
    </BaseIcon>
  )
}

export function VideoIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3Z" />
    </BaseIcon>
  )
}

export function VideoOffIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m3 3 18 18" />
      <path d="M10.66 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h11a2 2 0 0 0 1.86-1.26" />
      <path d="M16 10V8a2 2 0 0 0-2-2h-1.34" />
      <path d="m16 13 5 3V8l-3.27 1.96" />
    </BaseIcon>
  )
}

export function ScreenShareIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
      <path d="m8 10 4-4 4 4" />
      <path d="M12 6v8" />
    </BaseIcon>
  )
}

export function StopIcon(props) {
  return (
    <BaseIcon {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </BaseIcon>
  )
}

export function MaximizeIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="M8 3H3v5" />
      <path d="m3 3 6 6" />
      <path d="M16 3h5v5" />
      <path d="m21 3-6 6" />
      <path d="M8 21H3v-5" />
      <path d="m3 21 6-6" />
      <path d="M16 21h5v-5" />
      <path d="m21 21-6-6" />
    </BaseIcon>
  )
}

export function RadioIcon(props) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.48" />
      <path d="M7.76 16.24a6 6 0 0 1 0-8.48" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
    </BaseIcon>
  )
}

export function PaperclipIcon(props) {
  return (
    <BaseIcon {...props}>
      <path d="m21.44 11.05-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3 3 0 0 1 4.24 4.24l-8.5 8.49a1 1 0 0 1-1.41-1.41l7.78-7.78" />
    </BaseIcon>
  )
}
