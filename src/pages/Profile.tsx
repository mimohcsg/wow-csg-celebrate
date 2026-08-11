import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  sharedFollow,
  sharedGetProfile,
  sharedGetUserPosts,
} from '../api/sharedApi'
import type { CelebrateUser, Post } from '../types'

export function ProfilePage() {
  const { username: routeUser } = useParams()
  const { user, logout, updateProfile, changePassword, sharedMode } = useAuth()
  const username = (routeUser || user?.username || '').toLowerCase()
  const [profile, setProfile] = useState<CelebrateUser | null>(null)
  const [postsCount, setPostsCount] = useState(0)
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [bio, setBio] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const avatarRef = useRef<HTMLInputElement>(null)

  const isMe = Boolean(user?.username && user.username === username)

  const load = useCallback(async () => {
    if (!username) return
    setError('')
    try {
      const [{ user: u, postsCount: count }, list] = await Promise.all([
        sharedGetProfile(username, user?.email || ''),
        sharedGetUserPosts(username, user?.email || ''),
      ])
      setProfile(u)
      setPostsCount(count)
      setPosts(list)
      setBio(u.bio || '')
      setDisplayName(u.displayName)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load profile')
    }
  }, [username, user?.email])

  useEffect(() => {
    void load()
  }, [load])

  async function onFollow() {
    if (!user || !profile?.username) return
    setBusy(true)
    try {
      const next = await sharedFollow(profile.username, user.email)
      setProfile(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Follow failed')
    } finally {
      setBusy(false)
    }
  }

  async function onSave() {
    setBusy(true)
    try {
      await updateProfile({ displayName, bio })
      setEditing(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function onAvatar(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      await updateProfile({ avatar: file })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Avatar update failed')
    } finally {
      setBusy(false)
      if (avatarRef.current) avatarRef.current.value = ''
    }
  }

  async function onChangePassword() {
    setPwMsg('')
    setError('')
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    setBusy(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setChangingPw(false)
      setPwMsg('Password updated')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Password update failed')
    } finally {
      setBusy(false)
    }
  }

  const avatar =
    profile?.avatarUrl ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile?.displayName || 'CSG')}`

  return (
    <div className="page">
      <div className="top-bar">
        <div className="brand-lockup compact">
          <p className="brand-eyebrow">WoW-CSG</p>
          <h1 className="brand-mark">Celebrate</h1>
        </div>
        {isMe && (
          <div className="top-bar-actions">
            {user?.isAdmin && (
              <Link to="/app/insights" className="btn-link">
                Insights
              </Link>
            )}
            <button type="button" className="btn-link" onClick={() => void logout()}>
              Log out
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!profile ? (
        <p className="loading-row">Loading profile…</p>
      ) : (
        <>
          <section className="profile-header">
            <button
              type="button"
              className="profile-avatar-wrap"
              onClick={() => isMe && avatarRef.current?.click()}
              disabled={!isMe || busy}
              aria-label="Change avatar"
            >
              <img className="profile-avatar" src={avatar} alt="" />
              {isMe && <span className="avatar-hint">Edit</span>}
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => void onAvatar(e.target.files?.[0])}
            />
            <div className="profile-meta">
              <h2>@{profile.username}</h2>
              <div className="profile-stats">
                <div>
                  <strong>{postsCount}</strong>
                  <span>posts</span>
                </div>
                <div>
                  <strong>{profile.followersCount || 0}</strong>
                  <span>followers</span>
                </div>
                <div>
                  <strong>{profile.followingCount || 0}</strong>
                  <span>following</span>
                </div>
              </div>
              {isMe ? (
                <div className="profile-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing((v) => !v)}>
                    {editing ? 'Close edit' : 'Edit profile'}
                  </button>
                  {sharedMode && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setChangingPw((v) => !v)
                        setPwMsg('')
                      }}
                    >
                      {changingPw ? 'Close' : 'Change password'}
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onFollow()}>
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </section>

          <div className="profile-bio">
            <strong>{profile.displayName}</strong>
            {profile.bio && <p>{profile.bio}</p>}
          </div>

          {pwMsg && <div className="success-banner">{pwMsg}</div>}

          {editing && isMe && (
            <div className="edit-panel">
              <div className="field">
                <label htmlFor="dn">Display name</label>
                <input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="bio">Bio</label>
                <textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={150} />
              </div>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void onSave()}>
                Save
              </button>
            </div>
          )}

          {changingPw && isMe && sharedMode && (
            <div className="edit-panel">
              <div className="field">
                <label htmlFor="cur-pw">Current password</label>
                <input
                  id="cur-pw"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="new-pw">New password</label>
                <input
                  id="new-pw"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-pw">Confirm new password</label>
                <input
                  id="confirm-pw"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !currentPassword || !newPassword}
                onClick={() => void onChangePassword()}
              >
                Update password
              </button>
            </div>
          )}

          <div className="profile-grid">
            {posts.length === 0 && <p className="muted" style={{ padding: '1rem', gridColumn: '1 / -1' }}>No posts yet.</p>}
            {posts.map((p) => (
              <Link key={p.id} to="/app" className="profile-tile">
                {p.media[0] ? (
                  p.media[0].type === 'video' ? (
                    <video src={p.media[0].url} muted />
                  ) : (
                    <img src={p.media[0].url} alt="" />
                  )
                ) : (
                  <div className="tile-caption">{p.caption.slice(0, 80)}</div>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
