import { IconMessageSquare, IconPlus } from '../ui/Icons'
import { useChat } from '../../context/ChatContext'

export function ChatSidebar() {
  const { sessions, activeSessionId, createSession, setActiveSession } = useChat()

  return (
    <aside className="chat-sidebar">
      <button type="button" className="new-chat-btn" onClick={createSession}>
        <IconPlus size={16} />
        Chat Baru
      </button>

      <p className="chat-history-label">Riwayat Percakapan</p>

      <div className="chat-history-list">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            className={`chat-session-item ${session.id === activeSessionId ? 'active' : ''}`}
            onClick={() => setActiveSession(session.id)}
          >
            <IconMessageSquare size={16} />
            <span>{session.title}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
