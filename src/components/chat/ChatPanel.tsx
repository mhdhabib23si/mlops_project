import { useEffect, useRef, useState } from 'react'
import { IconBot, IconCamera, IconPaperclip, IconRotateCcw, IconSend } from '../ui/Icons'
import { ChatBubble } from './ChatBubble'
import { SentimentCameraModal } from './SentimentCameraModal'
import { useChat } from '../../context/ChatContext'
import { apiClient } from '../../lib/api'

export function ChatPanel({ mode = 'admin' }: { mode?: 'admin' | 'user' }) {
  const {
    messages,
    addMessage,
    updateMessageAnalysis,
    clearCurrentChat,
    activeSessionId,
    cameraPhoto,
    setCameraPhoto,
  } = useChat()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const messageId = addMessage(input, 'user')
    setInput('')
    setLoading(true)

    try {
      const response = await apiClient.chat(input, activeSessionId || undefined)
      if (messageId && response.sentiment && response.category) {
        updateMessageAnalysis(messageId, response.sentiment, response.category)
      }
      addMessage(
        response.message,
        'bot',
        response.summary_card ? {
          title: response.summary_card.title,
          description: response.summary_card.description,
        } : undefined,
      )
    } catch (error) {
      console.error('Chat error:', error)
      addMessage(
        'Maaf, terjadi kesalahan saat memproses pertanyaan Anda. Silakan coba lagi.',
        'bot',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-panel">
      <header className="chat-header">
        <div className="bot-info">
          <div className="avatar-bot-large">
            <IconBot size={18} />
          </div>
          <div className="bot-status">
            <strong>Asisten AI Analisis</strong>
            <span className="online-status">Online</span>
          </div>
        </div>
        <div className="chat-header-actions">
          {mode === 'user' && (
            <button type="button" className="ghost-btn" onClick={() => setCameraOpen(true)}>
              <IconCamera size={16} />
              Ganti Foto
            </button>
          )}
          <button type="button" className="ghost-btn" onClick={clearCurrentChat}>
            <IconRotateCcw size={16} />
            Bersihkan Chat
          </button>
        </div>
      </header>

      <div className="chat-messages">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} photo={mode === 'user' ? cameraPhoto : null} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-wrapper">
          <button type="button" className="icon-btn" aria-label="Lampirkan file">
            <IconPaperclip size={18} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tulis komentar atau pertanyaan Anda..."
            className="chat-input"
          />
          <button type="button" className="send-btn" onClick={handleSend} disabled={!input.trim() || loading}>
            <IconSend size={18} />
          </button>
        </div>
      </div>
      {mode === 'user' && cameraOpen && (
        <SentimentCameraModal
          onClose={() => setCameraOpen(false)}
          onPhotoCaptured={(photo) => {
            setCameraPhoto(photo)
            setCameraOpen(false)
          }}
        />
      )}
    </div>
  )
}
