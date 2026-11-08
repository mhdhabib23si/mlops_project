import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CHAT_SESSIONS } from '../data/chat'
import type { ChatMessage, ChatSession, MessageSender } from '../types/chat'

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  activeSession: ChatSession | null
  messages: ChatMessage[]
  createSession: () => string
  setActiveSession: (id: string) => void
  addMessage: (content: string, sender: MessageSender, summaryCard?: { title: string; description: string }) => void
  clearCurrentChat: () => void
}

const ChatContext = createContext<ChatState | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>(CHAT_SESSIONS)
  const [activeSessionId, setActiveSessionId] = useState<string | null>('session-1')

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) || null,
    [sessions, activeSessionId],
  )

  const messages = useMemo(() => activeSession?.messages || [], [activeSession])

  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Percakapan Baru',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sessionId: `session-${Date.now()}`,
          sender: 'bot',
          content: 'Halo! Saya adalah asisten AI Analisis Umpan Balik PCR. Ada yang bisa saya bantu terkait data umpan balik mahasiswa?',
          timestamp: new Date(),
        },
      ],
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    return newSession.id
  }, [])

  const setActiveSession = useCallback((id: string) => {
    setActiveSessionId(id)
  }, [])

  const addMessage = useCallback(
    (
      content: string,
      sender: MessageSender,
      summaryCard?: { title: string; description: string },
    ) => {
      if (!activeSessionId) return

      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
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
    },
    [activeSessionId],
  )

  const clearCurrentChat = useCallback(() => {
    if (!activeSessionId) return

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [
                {
                  id: `msg-${Date.now()}`,
                  sessionId: activeSessionId,
                  sender: 'bot',
                  content: 'Halo! Saya adalah asisten AI Analisis Umpan Balik PCR. Ada yang bisa saya bantu terkait data umpan balik mahasiswa?',
                  timestamp: new Date(),
                },
              ],
              updatedAt: new Date(),
            }
          : session,
      ),
    )
  }, [activeSessionId])

  const value = useMemo(
    () => ({
      sessions,
      activeSessionId,
      activeSession,
      messages,
      createSession,
      setActiveSession,
      addMessage,
      clearCurrentChat,
    }),
    [
      sessions,
      activeSessionId,
      activeSession,
      messages,
      createSession,
      setActiveSession,
      addMessage,
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
