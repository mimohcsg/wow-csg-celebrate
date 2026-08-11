import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LandingPage() {
  const { configured, demoMode, sharedMode } = useAuth()
  return (
    <div className="app-shell">
      <section className="hero-screen">
        <h1 className="brand-mark">
          WoW-CSG <span className="accent">Celebrate</span>
        </h1>
        <p className="muted">
          {sharedMode
            ? 'Share wins, events, and culture — one shared feed for the whole team.'
            : demoMode
              ? 'Share wins, events, and culture — demo mode (browser storage only).'
              : 'Share wins, events, and culture — hosted on your CSG SharePoint site with Microsoft 365 sign-in.'}
        </p>
        {!configured && !demoMode && !sharedMode && (
          <div className="warn-banner">
            Microsoft sign-in is not configured yet. Ask IT for an Entra Client ID, or use the shared team host.
          </div>
        )}
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary">
            {sharedMode ? 'Join the feed' : demoMode ? 'Enter Celebrate' : 'Sign in with Microsoft'}
          </Link>
        </div>
      </section>
    </div>
  )
}
