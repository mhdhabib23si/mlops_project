import { ChatPanel } from '../components/chat/ChatPanel'
import { ChatSidebar } from '../components/chat/ChatSidebar'

export function ChatbotPage() {
  return (
    <div className="page">
      <p className="crumb">Politeknik Caltex Riau | Feedback Analytics | Chatbot</p>
      <header className="page-head">
        <div>
          <h1>Chatbot Analisis</h1>
          <p>Asisten AI untuk mengulas dan menganalisis data umpan balik mahasiswa.</p>
        </div>
      </header>

      <section className="chat-container">
        <ChatSidebar />
        <ChatPanel />
      </section>

      <footer className="page-foot">
        <span>Politeknik Caltex Riau · Analisis Umpan Balik Mahasiswa</span>
        <span>IndoBERT · LLaMA 3 8B Instruct</span>
      </footer>
    </div>
  )
}
