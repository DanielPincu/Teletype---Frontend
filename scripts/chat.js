export function initChat({ chatBox, chatInput, rtcHandlers, sendRTTY }) {

  function scrollChatToBottom() {
    if (!chatBox) return
    chatBox.lastElementChild?.scrollIntoView({ block: 'end' })
  }

  function typeRTTYDisplay(text, prefix = '') {
    if (!chatBox) return

    const line = document.createElement('div')
    line.textContent = prefix
    chatBox.appendChild(line)
    scrollChatToBottom()

    const baud = 45.45
    const bitDuration = 1 / baud
    const charDuration = bitDuration * 7

    let i = 0
    function step() {
      if (i >= text.length) return
      line.textContent += text[i]
      scrollChatToBottom()
      i++
      setTimeout(step, charDuration * 1000)
    }

    step()
  }

  // RECEIVE
  rtcHandlers.onMessage = (text) => {
    sendRTTY(text)
    typeRTTYDisplay(text, '< ')
  }

  // SEND
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()

        const text = chatInput.value.trim()
        if (!text) return

        rtcHandlers.sendMessage?.(text)
        sendRTTY(text)
        typeRTTYDisplay(text, '> ')

        chatInput.value = ''
      }
    })
  }
}
