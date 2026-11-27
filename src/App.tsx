import { type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { AppProvider, useApp } from './context/AppContext'
import { ChatbotPage } from './pages/ChatbotPage'
import { DashboardPage } from './pages/DashboardPage'
import { FeedbackDataPage } from './pages/FeedbackDataPage'
import { LoginPage } from './pages/LoginPage'
import { ProcessDataPage } from './pages/ProcessDataPage'
import { UserFeedbackPage } from './pages/UserChatPage'
import { APP_ROUTES, getCanonicalAppRoute } from './lib/routes'

function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useApp()
  if (isAuthenticated) return <Navigate to={APP_ROUTES.adminDashboard} replace />
  return children
}

function AppUrlMiddleware({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation()
  const canonicalRoute = getCanonicalAppRoute(pathname)

  if (canonicalRoute && canonicalRoute !== pathname) {
    return <Navigate to={`${canonicalRoute}${search}${hash}`} replace />
  }

  return children
}

function AppRoutes() {
  return (
    <AppUrlMiddleware>
      <Routes>
        <Route path="/" element={<Navigate to={APP_ROUTES.user} replace />} />
        <Route path={APP_ROUTES.user} element={<UserFeedbackPage />} />
        <Route path="/user" element={<Navigate to={APP_ROUTES.user} replace />} />
        <Route path="/login" element={<Navigate to={APP_ROUTES.user} replace />} />
        <Route path="/admin/login" element={<Navigate to={APP_ROUTES.adminLogin} replace />} />
        <Route
          path={APP_ROUTES.adminLogin}
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<Navigate to={APP_ROUTES.adminDashboard} replace />} />
          <Route path="/admin/dashboard" element={<Navigate to={APP_ROUTES.adminDashboard} replace />} />
          <Route path="/admin/data" element={<Navigate to={APP_ROUTES.adminData} replace />} />
          <Route path="/admin/proses" element={<Navigate to={APP_ROUTES.adminProcess} replace />} />
          <Route path="/admin/chatbot" element={<Navigate to={APP_ROUTES.adminChatbot} replace />} />
          <Route path={APP_ROUTES.adminDashboard} element={<DashboardPage />} />
          <Route path={APP_ROUTES.adminData} element={<FeedbackDataPage />} />
          <Route path={APP_ROUTES.adminProcess} element={<ProcessDataPage />} />
          <Route path={APP_ROUTES.adminChatbot} element={<ChatbotPage />} />
        </Route>
        <Route path="/dashboard" element={<Navigate to={APP_ROUTES.adminDashboard} replace />} />
        <Route path="/data" element={<Navigate to={APP_ROUTES.adminData} replace />} />
        <Route path="/proses" element={<Navigate to={APP_ROUTES.adminProcess} replace />} />
        <Route path="/chatbot" element={<Navigate to={APP_ROUTES.adminChatbot} replace />} />
        <Route path="*" element={<Navigate to={APP_ROUTES.user} replace />} />
      </Routes>
    </AppUrlMiddleware>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}
