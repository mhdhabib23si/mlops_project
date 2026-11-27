import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { ChatProvider } from '../../context/ChatContext'
import { IconHeartMark, IconMenu } from '../ui/Icons'
import { Sidebar } from './Sidebar'
import { APP_ROUTES } from '../../lib/routes'

export function AppLayout() {
  const { isAuthenticated } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!isAuthenticated) return <Navigate to={APP_ROUTES.adminLogin} replace />

  return (
    <ChatProvider role="admin">
      <div className="app-shell">
        {menuOpen && (
          <button type="button" className="nav-scrim" aria-label="Tutup menu" onClick={() => setMenuOpen(false)} />
        )}
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <div className="app-main">
          <header className="mobile-bar">
            <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Buka menu">
              <IconMenu />
            </button>
            <span className="mobile-brand">
              <IconHeartMark size={22} /> Feedback Analytics
            </span>
          </header>
          <Outlet />
        </div>
      </div>
    </ChatProvider>
  )
}
