import React, { useEffect, useRef, useState } from 'react'

export default function Chat({ messages, connected, onSendMessage }) {
  const [text, setText] = useState('')
  const feedRef = useRef(null)
  const hasMountedRef = useRef(false)

  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return

    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }

    feed.scrollTop = feed.scrollHeight
  }, [messages])

  const handleSubmit = () => {
    const sent = onSendMessage(text)
    if (sent) setText('')
  }

  return (
    <div className="terminal-shell p-2.5 flex flex-col h-[40vh] md:h-[260px] overflow-hidden">
      <div className="flex justify-between items-center mb-2 border-b border-amber-900 pb-2 gap-3 flex-wrap">
        <span className="text-amber-600 text-sm">RTTY Transceiver</span>
      </div>

      <div ref={feedRef} className="terminal-feed flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
        <div className="terminal-output text-sm">
          {messages.map((message) => (
            <div key={message.id} className="terminal-line">
              {message.direction === 'incoming' ? '< ' : message.direction === 'outgoing' ? '> ' : ''}
              {message.text}
            </div>
          ))}
        </div>
      </div>

      <div className="terminal-composer mt-2 shrink-0">
        <div className="flex gap-2 items-start border border-amber-900/50 rounded-lg px-3 py-1.5 bg-amber-950/10">
          <span className="text-amber-500">&gt;</span>
          <textarea
            value={text}
            rows={2}
            maxLength={500}
            disabled={!connected}
            placeholder={connected ? 'ENTER TEXT TO TRANSMIT...' : 'DISCONNECTED'}
            className="w-full resize-none border-none bg-transparent text-amber-300 max-h-16 h-10 overflow-y-auto"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSubmit()
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
