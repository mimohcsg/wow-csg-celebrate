import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LandingPage() {
  const { configured, demoMode, sharedMode } = useAuth()
  return (
    <div className="app-shell">
      <section className="hero-screen">
        <h1 className="brand-mark">Celebrate</h1>
        <p className="sub" style={{ maxWidth: 320, margin: '0 auto' }}>
          {sharedMode
            ? 'Share wins, events, and culture with your CSG team — one feed for everyone.'
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
          <Link to="/login" className="btn btn-primary">
            {sharedMode ? 'Join the feed' : demoMode ? 'Enter Celebrate' : 'Sign in with Microsoft'}
          </Link>
        </div>
      </section>
    </div>
  )
}
