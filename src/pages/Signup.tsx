import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function SignupPage() {
  const { user, loading, signupShared, error, sharedMode } = useAuth()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bio, setBio] = useState('')

  if (!sharedMode) return <Navigate to="/login" replace />
  if (user) return <Navigate to="/app" replace />

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    try {
      await signupShared({ username, email, password, displayName, bio })
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
            Create your Celebrate account — share wins with the team.
          </p>
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={(e) => void onSubmit(e)} className="auth-form">
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                minLength={3}
                placeholder="mimoh.ojha"
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="displayName">Display name</label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                required
                placeholder="Mimoh Ojha"
              />
            </div>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                placeholder="you@csgi.com"
                autoComplete="email"
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
                minLength={6}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label htmlFor="bio">Bio (optional)</label>
              <input
                id="bio"
                value={bio}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBio(e.target.value)}
                maxLength={150}
                placeholder="What you celebrate at CSG"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Sign up'}
            </button>
            <p className="auth-switch">
              Have an account? <Link to="/login">Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
