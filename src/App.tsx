import { type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AppProvider, useApp } from './context/AppContext'
import { ChatProvider } from './context/ChatContext'
import { ChatbotPage } from './pages/ChatbotPage'
import { DashboardPage } from './pages/DashboardPage'
import { FeedbackDataPage } from './pages/FeedbackDataPage'
import { LoginPage } from './pages/LoginPage'
import { ProcessDataPage } from './pages/ProcessDataPage'

function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useApp()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="data" element={<FeedbackDataPage />} />
        <Route path="proses" element={<ProcessDataPage />} />
        <Route path="chatbot" element={<ChatbotPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ChatProvider>
        <AppRoutes />
      </ChatProvider>
    </AppProvider>
  )
}
