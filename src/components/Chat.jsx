export default function Chat({
  messages,
  input,
  setInput,
  sendMessage,
  chatRef
}) {
  return (
    <div className="border h-full flex flex-col">

      <div ref={chatRef} className="flex-1 overflow-y-auto text-sm p-2">
        {messages.map((m, i) => (
          <div key={i}>{m.text}</div>
        ))}
      </div>

      <div className="flex gap-2 p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              sendMessage()
            }
          }}
          className="flex-1 bg-transparent outline-none border border-green-700 px-2 py-1 focus:border-green-400 focus:ring-1 focus:ring-green-500"
        />
        <button
          onClick={sendMessage}
          className="border border-green-700 px-4 hover:bg-green-900/30 transition"
        >
          XMT
        </button>
      </div>

    </div>
  )
}