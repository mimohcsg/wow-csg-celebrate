import { useState } from 'react'
import type { Post } from '../types'
import { useAuth } from '../auth/AuthContext'
import { addComment, fetchComments, toggleLike } from '../api/sharepoint'
import type { Comment } from '../types'

export function PostCard({
  post,
  onChange,
}: {
  post: Post
  onChange: (next: Post) => void
}) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  async function onLike() {
    if (!user || busy) return
    setBusy(true)
    setError('')
    try {
      onChange(await toggleLike(post, user))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Like failed')
    } finally {
      setBusy(false)
    }
  }

  async function openComments() {
    setShowComments((v) => !v)
    if (!showComments) {
      try {
        setComments(await fetchComments(post.id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load comments')
      }
    }
  }

  async function submitComment() {
    if (!user || !text.trim()) return
    setBusy(true)
    try {
      await addComment(post.id, user, text.trim())
      setText('')
      setComments(await fetchComments(post.id))
      onChange({ ...post, commentCount: post.commentCount + 1 })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comment failed')
    } finally {
      setBusy(false)
    }
  }

  const avatar =
    post.authorAvatar ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(post.authorName || 'CSG')}`

  return (
    <article className="card">
      <div className="card-head">
        <img className="avatar" src={avatar} alt="" />
        <div>
          <strong>{post.authorName || post.authorEmail}</strong>
          <div className="muted" style={{ fontSize: '0.8rem' }}>
            {new Date(post.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
      {post.media[0] && (
        <div className="card-media">
          {post.media[0].type === 'video' ? (
            <video src={post.media[0].url} controls playsInline />
          ) : (
            <img src={post.media[0].url} alt="" />
          )}
        </div>
      )}
      <div className="card-body">
        <div className="card-actions">
          <button type="button" className="btn btn-ghost" onClick={onLike} disabled={busy}>
            {post.likedByMe ? '♥' : '♡'} {post.likeCount}
          </button>
          <button type="button" className="btn btn-ghost" onClick={openComments}>
            💬 {post.commentCount}
          </button>
        </div>
        <p className="caption">
          <strong>{post.authorName}</strong> {post.caption}
        </p>
        {error && <div className="error-banner">{error}</div>}
        {showComments && (
          <div className="comments">
            {comments.map((c) => (
              <div className="comment" key={c.id}>
                <strong>{c.authorName}</strong>
                {c.text}
              </div>
            ))}
            <div className="field" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
              <textarea
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '0.5rem' }}
                disabled={busy || !text.trim()}
                onClick={submitComment}
              >
                Post comment
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
