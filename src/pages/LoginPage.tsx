import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { IconAlert, IconArrowRight, IconEye, IconEyeOff, IconLock, IconMail } from '../components/ui/Icons'

export function LoginPage() {
  const { isAuthenticated, login } = useApp()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const ok = login(email, password)
    setError(!ok)
    if (ok) navigate('/dashboard')
  }

  return (
    <div className="login-page">
      <section className="login-panel">
        <span className="blob blob-red" />
        <span className="blob blob-teal" />
        <form className="login-form" onSubmit={onSubmit}>
          <header>
            <h1>Selamat datang kembali</h1>
            <p>Masuk untuk mengakses dashboard analisis umpan balik mahasiswa.</p>
          </header>

          {error && (
            <div className="error-banner">
              <IconAlert /> Username/email atau password tidak sesuai. Periksa kembali dan coba lagi.
            </div>
          )}

          <label className="field">
            <span>Username atau email</span>
            <div className={`input ${error ? 'invalid' : ''}`}>
              <IconMail />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan username atau email"
                autoComplete="username"
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className={`input ${error ? 'invalid' : ''}`}>
              <IconLock />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Tampilkan password"
              >
                {showPassword ? <IconEye /> : <IconEyeOff />}
              </button>
            </div>
          </label>

          <button type="submit" className="primary-btn wide">
            Masuk ke Dashboard <IconArrowRight />
          </button>

          <p className="hint">
            <IconLock size={15} /> Data umpan balik bersifat rahasia. Hanya Admin yang berwenang dapat mengakses
            informasi ini.
          </p>
          <p className="demo-cred">Akun demo: admin@pcr.ac.id · admin123</p>
        </form>
      </section>

      <aside className="hero-panel">
        <img src="/images/kampus-pcr.png" alt="" />
        <div className="hero-veil" />
        <div className="hero-content">
          <div className="pcr-logo">
            <span className="pcr-mark" />
            Politeknik Caltex Riau
          </div>
          <div className="hero-copy">
            <h2>
              Pahami suara
              <br />
              mahasiswa, tingkatkan
              <br />
              kualitas layanan.
            </h2>
            <p>
              Satu ruang untuk memahami komentar mahasiswa PCR melalui analisis sentimen dan kategori
              layanan.
            </p>
          </div>
        </div>
        <span className="hero-orb" />
      </aside>
    </div>
  )
}
