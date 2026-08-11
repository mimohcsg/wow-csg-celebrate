import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { createStory, fetchActiveStories, fetchPosts } from '../api/sharepoint'
import { PostCard } from '../components/PostCard'
import type { Post, Story } from '../types'

export function HomePage() {
  const { user, logout } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [storyBusy, setStoryBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const [p, s] = await Promise.all([fetchPosts(user.email), fetchActiveStories()])
      setPosts(p)
      setStories(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  async function onStoryFile(file: File | undefined) {
    if (!file || !user || storyBusy) return
    setStoryBusy(true)
    setError('')
    try {
      await createStory(user, file)
      setStories(await fetchActiveStories())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Story upload failed')
    } finally {
      setStoryBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="page">
      <div className="top-bar">
        <h1 className="brand-mark">
          WoW-CSG <span className="accent">Celebrate</span>
        </h1>
        <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
          Sign out
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void onStoryFile(e.target.files?.[0])}
      />

      <div className="story-tray" aria-label="Stories">
        <button type="button" className="story-bubble" onClick={() => fileRef.current?.click()} disabled={storyBusy}>
          <div className="story-ring">+</div>
          <span>{storyBusy ? 'Uploading…' : 'Your story'}</span>
        </button>
        {stories.map((s) => (
          <button type="button" className="story-bubble" key={s.id} onClick={() => window.open(s.mediaUrl, '_blank')}>
            <div className="story-ring">
              <img src={s.mediaUrl} alt="" />
            </div>
            <span>{s.authorName.split(' ')[0] || 'Story'}</span>
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="muted">Loading celebrations…</p>}
      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <h2>No posts yet</h2>
          <p>Be the first to share a win on SharePoint.</p>
          <Link to="/app/create" className="btn btn-primary">
            Create post
          </Link>
        </div>
      )}
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onChange={(next) => setPosts((all) => all.map((x) => (x.id === next.id ? next : x)))}
        />
      ))}
    </div>
  )
}
