import type { ServiceCategory, Sentiment } from './index'

export type MessageSender = 'user' | 'bot'

export interface ChatMessage {
  id: string
  sessionId: string
  sender: MessageSender
  content: string
  timestamp: Date
  summaryCard?: {
    title: string
    description: string
  }
  sentiment?: Sentiment
  category?: ServiceCategory
}

export interface ChatSession {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: ChatMessage[]
}
