import { Navigate, Outlet, Route, Routes, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LandingPage } from './pages/Landing'
import { LoginPage } from './pages/Login'
import { HomePage } from './pages/Home'
import { CreatePage } from './pages/Create'

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted">Loading…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function AppChrome() {
  const location = useLocation()
  const inApp = location.pathname.startsWith('/app')
  const { user } = useAuth()

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
            Home
          </Link>
          <Link to="/app/create" className={location.pathname === '/app/create' ? 'active' : ''}>
            Create
          </Link>
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
