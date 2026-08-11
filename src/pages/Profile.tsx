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
  const { user, logout, updateProfile } = useAuth()
  const username = (routeUser || user?.username || '').toLowerCase()
  const [profile, setProfile] = useState<CelebrateUser | null>(null)
  const [postsCount, setPostsCount] = useState(0)
  const [posts, setPosts] = useState<Post[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState('')
  const [displayName, setDisplayName] = useState('')
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
          <button type="button" className="btn-link" onClick={() => void logout()}>
            Log out
          </button>
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
                <button type="button" className="btn btn-secondary" onClick={() => setEditing((v) => !v)}>
                  {editing ? 'Close edit' : 'Edit profile'}
                </button>
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
