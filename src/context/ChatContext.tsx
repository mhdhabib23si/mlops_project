import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ServiceCategory, Sentiment } from '../types'
import type { ChatMessage, ChatSession, MessageSender } from '../types/chat'

interface ChatState {
  cameraPhoto: string | null
  setCameraPhoto: (photo: string) => void
  sessions: ChatSession[]
  activeSessionId: string | null
  activeSession: ChatSession | null
  messages: ChatMessage[]
  createSession: () => string
  setActiveSession: (id: string) => void
  addMessage: (content: string, sender: MessageSender, summaryCard?: { title: string; description: string }) => string | null
  updateMessageAnalysis: (messageId: string, sentiment: Sentiment, category: ServiceCategory) => void
  clearCurrentChat: () => void
}

const ChatContext = createContext<ChatState | null>(null)

function createWelcomeMessage(sessionId: string, role: 'admin' | 'user'): ChatMessage {
  const timestamp = new Date()
  return {
    id: `msg-${sessionId}`,
    sessionId,
    sender: 'bot',
    content:
      role === 'user'
        ? 'Halo! Silakan ceritakan pengalaman Anda tentang layanan pendidikan. Saya akan menganalisis sentimen dari teks yang Anda kirim.'
        : 'Halo! Saya adalah asisten AI Analisis Umpan Balik PCR. Ada yang bisa saya bantu terkait data umpan balik mahasiswa?',
    timestamp,
  }
}

function createWelcomeSession(role: 'admin' | 'user'): ChatSession {
  const now = new Date()
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return {
    id,
    title: 'Percakapan Baru',
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage(id, role)],
  }
}

export function ChatProvider({
  children,
  role = 'admin',
}: {
  children: ReactNode
  role?: 'admin' | 'user'
}) {
  const [cameraPhoto, setCameraPhoto] = useState<string | null>(null)
  const [initialSession] = useState(() => createWelcomeSession(role))
  const [sessions, setSessions] = useState<ChatSession[]>([initialSession])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSession.id)

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId],
  )

  const messages = useMemo(() => activeSession?.messages || [], [activeSession])

  const createSession = useCallback(() => {
    const newSession = createWelcomeSession(role)
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    return newSession.id
  }, [role])

  const setActiveSession = useCallback((id: string) => {
    setActiveSessionId(id)
  }, [])

  const addMessage = useCallback(
    (
      content: string,
      sender: MessageSender,
      summaryCard?: { title: string; description: string },
    ) => {
      if (!activeSessionId) return null

      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const newMessage: ChatMessage = {
        id,
        sessionId: activeSessionId,
        sender,
        content,
        timestamp: new Date(),
        summaryCard,
      }

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSessionId
            ? {
                ...session,
                messages: [...session.messages, newMessage],
                updatedAt: new Date(),
                title:
                  sender === 'user' && session.messages.length === 1
                    ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
                    : session.title,
              }
            : session,
        ),
      )
      return id
    },
    [activeSessionId],
  )

  const updateMessageAnalysis = useCallback(
    (messageId: string, sentiment: Sentiment, category: ServiceCategory) => {
      setSessions((prev) =>
        prev.map((session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.id === messageId ? { ...message, sentiment, category } : message,
          ),
        })),
      )
    },
    [],
  )

  const clearCurrentChat = useCallback(() => {
    if (!activeSessionId) return

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
                messages: [createWelcomeMessage(activeSessionId, role)],
              updatedAt: new Date(),
            }
          : session,
      ),
    )
  }, [activeSessionId, role])

  const value = useMemo(
    () => ({
      cameraPhoto,
      setCameraPhoto,
      sessions,
      activeSessionId,
      activeSession,
      messages,
      createSession,
      setActiveSession,
      addMessage,
      updateMessageAnalysis,
      clearCurrentChat,
    }),
    [
      cameraPhoto,
      setCameraPhoto,
      sessions,
      activeSessionId,
      activeSession,
      messages,
      createSession,
      setActiveSession,
      addMessage,
      updateMessageAnalysis,
      clearCurrentChat,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat harus dipakai di dalam ChatProvider')
  return ctx
}
