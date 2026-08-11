import { Navigate, Outlet, Route, Routes, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LandingPage } from './pages/Landing'
import { LoginPage } from './pages/Login'
import { HomePage } from './pages/Home'
import { CreatePage } from './pages/Create'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-10.5z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="app-shell">
        <p className="loading-row">Loading…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function AppChrome() {
  const location = useLocation()
  const inApp = location.pathname.startsWith('/app')
  const { user, logout } = useAuth()

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<HomePage />} />
          <Route path="/app/create" element={<CreatePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {inApp && user && (
        <nav className="bottom-nav" aria-label="Main">
          <Link to="/app" className={location.pathname === '/app' ? 'active' : ''}>
            <HomeIcon />
            Home
          </Link>
          <Link to="/app/create" className={location.pathname === '/app/create' ? 'active' : ''}>
            <PlusIcon />
            Create
          </Link>
          <button
            type="button"
            className="nav-profile"
            onClick={() => void logout()}
            aria-label="Log out"
          >
            <PersonIcon />
            Log out
          </button>
        </nav>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppChrome />
    </AuthProvider>
  )
}
