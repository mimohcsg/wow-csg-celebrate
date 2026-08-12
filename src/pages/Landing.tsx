import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LandingPage() {
  const { configured, demoMode, sharedMode } = useAuth()
  return (
    <div className="app-shell">
      <section className="hero-screen">
        <div className="hero-glow" aria-hidden="true" />
        <div className="brand-lockup">
          <p className="brand-eyebrow">WoW-CSG</p>
          <h1 className="brand-mark">Celebrate</h1>
        </div>
        <p className="sub hero-sub">
          {sharedMode
            ? 'The CSG team stage for wins, culture, and moments that deserve a cheer.'
            : demoMode
              ? 'Share wins and culture moments in demo mode.'
              : 'Share wins, events, and culture with Microsoft 365 sign-in.'}
        </p>
        {!configured && !demoMode && !sharedMode && (
          <div className="warn-banner">
            Microsoft sign-in is not configured yet. Ask IT for an Entra Client ID, or use the shared team host.
          </div>
        )}
        <div className="hero-actions">
          <Link to={sharedMode ? '/signup' : '/login'} className="btn btn-primary">
            {sharedMode ? 'Join Celebrate' : demoMode ? 'Enter Celebrate' : 'Sign in with Microsoft'}
          </Link>
          {sharedMode && (
            <Link to="/login" className="btn btn-secondary">
              Log in
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
