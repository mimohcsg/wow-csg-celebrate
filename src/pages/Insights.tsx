import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { fetchAdminInsights } from '../api/sharepoint'
import type { AdminInsights } from '../types'

export function InsightsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminInsights | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      setData(await fetchAdminInsights(user))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load insights')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  if (!user?.isAdmin) {
    return (
      <div className="page">
        <div className="top-bar">
          <div className="brand-lockup compact">
            <p className="brand-eyebrow">WoW-CSG</p>
            <h1 className="brand-mark">Insights</h1>
          </div>
          <Link to="/app" className="btn-link">
            Back
          </Link>
        </div>
        <div className="error-banner">Admin access required to view engagement insights.</div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="top-bar">
        <div className="brand-lockup compact">
          <p className="brand-eyebrow">Admin</p>
          <h1 className="brand-mark">Insights</h1>
        </div>
        <button type="button" className="btn-link" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading-row">Loading insights…</p>}

      {data && (
        <div className="insights-body">
          <section className="insights-summary">
            <div>
              <strong>{data.summary.users}</strong>
              <span>users</span>
            </div>
            <div>
              <strong>{data.summary.posts}</strong>
              <span>posts</span>
            </div>
            <div>
              <strong>{data.summary.stories}</strong>
              <span>stories</span>
            </div>
            <div>
              <strong>{data.summary.postLikes}</strong>
              <span>post likes</span>
            </div>
            <div>
              <strong>{data.summary.storyViews}</strong>
              <span>story views</span>
            </div>
            <div>
              <strong>{data.summary.storyLikes}</strong>
              <span>story likes</span>
            </div>
          </section>

          <section className="insights-section">
            <h2>Most liked posts</h2>
            {data.topPosts.length === 0 && <p className="muted">No posts yet.</p>}
            <ul className="insights-list">
              {data.topPosts.map((p, i) => (
                <li key={p.id}>
                  <span className="rank">{i + 1}</span>
                  <div className="insights-item-main">
                    <strong>{p.authorName}</strong>
                    <p>{p.caption || '(no caption)'}</p>
                  </div>
                  <div className="insights-metrics">
                    <span>{p.likeCount} likes</span>
                    <span>{p.commentCount} comments</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="insights-section">
            <h2>Most viewed stories</h2>
            {data.topStoriesByViews.length === 0 && <p className="muted">No stories yet.</p>}
            <ul className="insights-list">
              {data.topStoriesByViews.map((s, i) => (
                <li key={s.id}>
                  <span className="rank">{i + 1}</span>
                  {s.mediaUrl && <img className="insights-thumb" src={s.mediaUrl} alt="" />}
                  <div className="insights-item-main">
                    <strong>{s.authorName}</strong>
                    <p>{new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="insights-metrics">
                    <span>{s.viewCount || 0} views</span>
                    <span>{s.likeCount || 0} likes</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="insights-section">
            <h2>Most liked stories</h2>
            {data.topStoriesByLikes.length === 0 && <p className="muted">No stories yet.</p>}
            <ul className="insights-list">
              {data.topStoriesByLikes.map((s, i) => (
                <li key={`like-${s.id}`}>
                  <span className="rank">{i + 1}</span>
                  {s.mediaUrl && <img className="insights-thumb" src={s.mediaUrl} alt="" />}
                  <div className="insights-item-main">
                    <strong>{s.authorName}</strong>
                    <p>{new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="insights-metrics">
                    <span>{s.likeCount || 0} likes</span>
                    <span>{s.viewCount || 0} views</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
