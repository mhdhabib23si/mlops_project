import { IconBot } from '../ui/Icons'
import { SummaryCard } from './SummaryCard'
import type { ChatMessage } from '../../types/chat'
import ReactMarkdown from 'react-markdown'

export function ChatBubble({ message }: { message: ChatMessage }) {
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
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  )
}
