import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Post, Comment } from '../types'
import { useAuth } from '../auth/AuthContext'
import { addComment, deletePost, fetchComments, toggleLike } from '../api/sharepoint'

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-6.7-4.35-9.33-7.4C.8 11.5.9 8.1 3.1 6.3c2-1.7 4.9-1.3 6.5.5L12 9l2.4-2.2c1.6-1.8 4.5-2.2 6.5-.5 2.2 1.8 2.3 5.2.43 7.3C18.7 16.65 12 21 12 21z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 17 0z" />
    </svg>
  )
}

export function PostCard({
  post,
  onChange,
  onDelete,
}: {
  post: Post
  onChange: (next: Post) => void
  onDelete?: (postId: string) => void
}) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const isOwner = Boolean(user && user.email === post.authorEmail)

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
    const next = !showComments
    setShowComments(next)
    if (next) {
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

  async function onDeleteClick() {
    if (!user || !isOwner || busy) return
    if (!window.confirm('Delete this post?')) return
    setBusy(true)
    setError('')
    try {
      await deletePost(post.id, user)
      onDelete?.(post.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  const avatar =
    post.authorAvatar ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(post.authorName || 'CSG')}`

  const when = (() => {
    const ms = Date.now() - Date.parse(post.createdAt)
    if (!Number.isFinite(ms) || ms < 60_000) return 'Just now'
    if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`
    return `${Math.floor(ms / 86_400_000)}d`
  })()

  return (
    <article className="card">
      <div className="card-head">
        <Link to={post.authorUsername ? `/app/profile/${post.authorUsername}` : '/app'} className="card-head-link">
          <img className="avatar" src={avatar} alt="" />
          <div className="card-head-meta">
            <strong>{post.authorUsername ? `@${post.authorUsername}` : post.authorName || post.authorEmail}</strong>
            <div className="muted">{when} · {post.authorName}</div>
          </div>
        </Link>
        {isOwner && (
          <button type="button" className="btn-link danger" onClick={() => void onDeleteClick()} disabled={busy}>
            Delete
          </button>
        )}
      </div>

      {post.media[0] ? (
        <div className="card-media" onDoubleClick={() => void onLike()}>
          {post.media[0].type === 'video' ? (
            <video src={post.media[0].url} controls playsInline />
          ) : (
            <img src={post.media[0].url} alt="" />
          )}
        </div>
      ) : (
        <div className="card-media no-media">{post.caption || 'Celebration'}</div>
      )}

      <div className="card-body">
        <div className="card-actions">
          <button
            type="button"
            className={`action-icon${post.likedByMe ? ' liked' : ''}`}
            onClick={() => void onLike()}
            disabled={busy}
            aria-label="Like"
          >
            <HeartIcon filled={post.likedByMe} />
          </button>
          <button type="button" className="action-icon" onClick={() => void openComments()} aria-label="Comment">
            <CommentIcon />
          </button>
        </div>

        {post.likeCount > 0 && (
          <p className="like-count">
            {post.likeCount} like{post.likeCount === 1 ? '' : 's'}
          </p>
        )}

        {post.caption && (
          <p className="caption">
            <strong>{post.authorName}</strong>
            {post.caption}
          </p>
        )}

        {post.commentCount > 0 && !showComments && (
          <button type="button" className="view-comments" onClick={() => void openComments()}>
            View all {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
          </button>
        )}

        {error && <div className="error-banner" style={{ margin: '0.6rem 0 0' }}>{error}</div>}

        {showComments && (
          <div className="comments">
            {comments.map((c) => (
              <div className="comment" key={c.id}>
                <strong>{c.authorName}</strong>
                {c.text}
              </div>
            ))}
            <div className="comment-compose">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitComment()
                }}
              />
              <button
                type="button"
                className={`post-btn${text.trim() ? ' ready' : ''}`}
                disabled={busy || !text.trim()}
                onClick={() => void submitComment()}
              >
                Post
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
