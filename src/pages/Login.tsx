import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { user, loading, login, joinShared, error, configured, demoMode, sharedMode } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  if (user) return <Navigate to="/app" replace />

  async function onJoin(e: FormEvent) {
    e.preventDefault()
    await joinShared(name, email)
  }

  return (
    <div className="app-shell">
      <div className="auth-page">
        <h1 className="brand-mark">
          WoW-CSG <span className="accent">Celebrate</span>
        </h1>
        <p className="sub">
          {sharedMode
            ? 'Join the shared team feed — everyone sees the same posts.'
            : demoMode
              ? 'Demo mode — open the feed without Microsoft Entra setup.'
              : 'Corporate Microsoft account only (@csgi.com / @csg.com)'}
        </p>
        {!configured && !demoMode && !sharedMode && (
          <div className="warn-banner">Missing VITE_MSAL_CLIENT_ID — complete Entra app setup.</div>
        )}
        {error && <div className="error-banner">{error}</div>}

        {sharedMode ? (
          <form onSubmit={(e) => void onJoin(e)} className="auth-form">
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Mimoh Ojha" />
            </div>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@csgi.com"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              Join Celebrate
            </button>
          </form>
        ) : (
          <button
            className="btn btn-primary"
            type="button"
            disabled={loading || (!configured && !demoMode)}
            onClick={() => void login()}
          >
            {loading ? 'Signing in…' : demoMode ? 'Continue to feed' : 'Sign in with Microsoft'}
          </button>
        )}
      </div>
    </div>
  )
}
