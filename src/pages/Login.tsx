import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { user, loading, login, error, configured, demoMode } = useAuth()
  if (user) return <Navigate to="/app" replace />

  return (
    <div className="app-shell">
      <div className="auth-page">
        <h1 className="brand-mark">
          WoW-CSG <span className="accent">Celebrate</span>
        </h1>
        <p className="sub">
          {demoMode
            ? 'Demo mode — open the feed without Microsoft Entra setup.'
            : 'Corporate Microsoft account only (@csgi.com / @csg.com)'}
        </p>
        {!configured && !demoMode && (
          <div className="warn-banner">Missing VITE_MSAL_CLIENT_ID — complete Entra app setup.</div>
        )}
        {error && <div className="error-banner">{error}</div>}
        <button
          className="btn btn-primary"
          type="button"
          disabled={loading || (!configured && !demoMode)}
          onClick={() => void login()}
        >
          {loading ? 'Signing in…' : demoMode ? 'Continue to feed' : 'Sign in with Microsoft'}
        </button>
      </div>
    </div>
  )
}
