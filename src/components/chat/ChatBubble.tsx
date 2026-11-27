import { IconBot } from '../ui/Icons'
import { SummaryCard } from './SummaryCard'
import type { ChatMessage } from '../../types/chat'
import ReactMarkdown from 'react-markdown'
import { SentimentBadge } from '../ui/SentimentBadge'

export function ChatBubble({ message, photo }: { message: ChatMessage; photo: string | null }) {
  const isBot = message.sender === 'bot'

  return (
    <div className={`chat-bubble ${isBot ? 'bot' : 'user'}`}>
      {isBot && (
        <div className="avatar-bot">
          <IconBot size={18} />
        </div>
      )}
      <div className={`bubble-content ${isBot ? 'bot' : 'user'}`}>
        {message.summaryCard && <SummaryCard title={message.summaryCard.title} description={message.summaryCard.description} />}
        {!isBot && message.sentiment && photo && (
          <div className={`face-filter-preview ${message.sentiment.toLowerCase()}`}>
            <img src={photo} alt={`Foto dengan filter ekspresi ${message.sentiment.toLowerCase()}`} />
            <svg viewBox="0 0 100 100" aria-hidden="true">
              {message.sentiment === 'Negatif' ? (
                <path d="M33 38l13 5M67 38l-13 5" />
              ) : message.sentiment === 'Positif' ? (
                <path d="M34 40q6-5 12 0M54 40q6-5 12 0" />
              ) : (
                <path d="M34 40h12M54 40h12" />
              )}
              {message.sentiment === 'Positif' ? (
                <path d="M34 59q16 21 32 0" />
              ) : message.sentiment === 'Negatif' ? (
                <path d="M34 70q16-20 32 0" />
              ) : (
                <path d="M37 64h26" />
              )}
            </svg>
            <span>Filter {message.sentiment.toLowerCase()}</span>
          </div>
        )}
        <ReactMarkdown>{message.content}</ReactMarkdown>
        {!isBot && message.sentiment && (
          <div className="chat-analysis-label">
            <SentimentBadge sentiment={message.sentiment} />
            {message.category && <small>{message.category}</small>}
          </div>
        )}
      </div>
    </div>
  )
}
