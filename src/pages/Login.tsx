import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { user, loading, login, loginShared, error, configured, demoMode, sharedMode } = useAuth()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  if (user) return <Navigate to="/app" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    try {
      await loginShared(loginId, password)
    } catch {
      /* shown via error */
    }
  }

  return (
    <div className="app-shell">
      <div className="auth-page">
        <div className="brand-lockup">
          <p className="brand-eyebrow">WoW-CSG</p>
          <h1 className="brand-mark">Celebrate</h1>
        </div>
        <div className="auth-card">
          <p className="sub" style={{ marginTop: 0 }}>
            {sharedMode
              ? 'Log in to the shared WoW-CSG Celebrate feed.'
              : demoMode
                ? 'Demo mode — open the feed without Microsoft Entra setup.'
                : 'Corporate Microsoft account only (@csgi.com / @csg.com)'}
          </p>
          {!configured && !demoMode && !sharedMode && (
            <div className="warn-banner">Missing VITE_MSAL_CLIENT_ID — complete Entra app setup.</div>
          )}
          {error && <div className="error-banner">{error}</div>}

          {sharedMode ? (
            <form onSubmit={(e) => void onSubmit(e)} className="auth-form">
              <div className="field">
                <label htmlFor="login">Username or email</label>
                <input
                  id="login"
                  value={loginId}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setLoginId(e.target.value)}
                  required
                  placeholder="your.name or you@csgi.com"
                  autoComplete="username"
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Logging in…' : 'Log in'}
              </button>
              <p className="auth-switch">
                New here? <Link to="/signup">Sign up</Link>
              </p>
            </form>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              style={{ width: '100%' }}
              disabled={loading || (!configured && !demoMode)}
              onClick={() => void login()}
            >
              {loading ? 'Signing in…' : demoMode ? 'Continue to feed' : 'Sign in with Microsoft'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
