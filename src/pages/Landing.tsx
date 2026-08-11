import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LandingPage() {
  const { configured, demoMode } = useAuth()
  return (
    <div className="app-shell">
      <section className="hero-screen">
        <h1 className="brand-mark">
          WoW-CSG <span className="accent">Celebrate</span>
        </h1>
        <p className="muted">
          Share wins, events, and culture
          {demoMode ? ' — demo mode (browser storage, no Entra required).' : ' — hosted on your CSG SharePoint site with Microsoft 365 sign-in.'}
        </p>
        {!configured && !demoMode && (
          <div className="warn-banner">
            Microsoft sign-in is not configured yet. Use demo hosting, or ask IT for an Entra Client ID.
          </div>
        )}
        {demoMode && (
          <div className="warn-banner">Demo mode: posts stay in this browser only (not SharePoint yet).</div>
        )}
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary">
            {demoMode ? 'Enter Celebrate' : 'Sign in with Microsoft'}
          </Link>
        </div>
      </section>
    </div>
  )
}
