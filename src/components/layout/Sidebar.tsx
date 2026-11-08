import { NavLink } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import {
  IconActivity,
  IconBot,
  IconHeartMark,
  IconLayout,
  IconLogout,
  IconShield,
  IconTable,
} from '../ui/Icons'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: IconLayout },
  { to: '/data', label: 'Data Umpan Balik', icon: IconTable },
  { to: '/proses', label: 'Proses Data', icon: IconActivity },
  { to: '/chatbot', label: 'Chatbot', icon: IconBot },
]

export function Sidebar({
  open = false,
  onNavigate,
}: {
  open?: boolean
  onNavigate?: () => void
}) {
  const { adminEmail, logout } = useApp()

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
        <IconHeartMark />
        <div>
          <strong>Feedback Analytics</strong>
          <p>Analisis Umpan Balik Mahasiswa</p>
        </div>
      </div>

      <p className="nav-label">RUANG ADMIN</p>
      <nav>
        {LINKS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <button type="button" className="nav-item logout" onClick={logout}>
          <IconLogout size={18} />
          Keluar
        </button>
        <div className="admin-card">
          <IconShield size={18} />
          <div>
            <strong>Administrator</strong>
            <p>{adminEmail}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
