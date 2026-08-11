import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { createStory, fetchActiveStories, fetchPosts } from '../api/sharepoint'
import { PostCard } from '../components/PostCard'
import { StoryViewer } from '../components/StoryViewer'
import type { Post, Story } from '../types'

export function HomePage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [storyBusy, setStoryBusy] = useState(false)
  const [storyIndex, setStoryIndex] = useState<number | null>(null)
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
        <div className="brand-lockup compact">
          <p className="brand-eyebrow">WoW-CSG</p>
          <h1 className="brand-mark">Celebrate</h1>
        </div>
        {user?.username && (
          <Link to={`/app/profile/${user.username}`} className="btn-link">
            @{user.username}
          </Link>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void onStoryFile(e.target.files?.[0])}
      />

      <div className="story-tray" aria-label="Stories">
        <button
          type="button"
          className="story-bubble add"
          onClick={() => fileRef.current?.click()}
          disabled={storyBusy}
        >
          <div className="story-ring">
            <div className="story-ring-inner">+</div>
          </div>
          <span>{storyBusy ? '…' : 'Your story'}</span>
        </button>
        {stories.map((s, i) => (
          <button
            type="button"
            className="story-bubble"
            key={s.id}
            onClick={() => setStoryIndex(i)}
          >
            <div className="story-ring">
              <div className="story-ring-inner">
                <img src={s.mediaUrl} alt="" />
              </div>
            </div>
            <span>{s.authorName.split(' ')[0] || 'Story'}</span>
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading-row">Loading feed…</p>}
      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <h2>No posts yet</h2>
          <p>Share the first celebration with your team.</p>
          <Link to="/app/create" className="btn btn-primary">
            Create post
          </Link>
        </div>
      )}
      <div className="feed">
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onChange={(next) => setPosts((all) => all.map((x) => (x.id === next.id ? next : x)))}
            onDelete={(id) => setPosts((all) => all.filter((x) => x.id !== id))}
          />
        ))}
      </div>

      {storyIndex !== null && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          startIndex={storyIndex}
          onClose={() => setStoryIndex(null)}
        />
      )}
    </div>
  )
}
