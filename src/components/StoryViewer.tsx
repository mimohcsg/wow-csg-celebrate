import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { Story } from '../types'
import { useAuth } from '../auth/AuthContext'
import { likeStory, viewStory } from '../api/sharepoint'

const STORY_MS = 5000

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-6.7-4.35-9.33-7.4C.8 11.5.9 8.1 3.1 6.3c2-1.7 4.9-1.3 6.5.5L12 9l2.4-2.2c1.6-1.8 4.5-2.2 6.5-.5 2.2 1.8 2.3 5.2.43 7.3C18.7 16.65 12 21 12 21z" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function StoryViewer({
  stories,
  startIndex,
  onClose,
  onStoryChange,
}: {
  stories: Story[]
  startIndex: number
  onClose: () => void
  onStoryChange?: (next: Story) => void
}) {
  const { user } = useAuth()
  const [index, setIndex] = useState(startIndex)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const viewedRef = useRef<Set<string>>(new Set())
  const story = stories[index]

  const avatar = useMemo(
    () =>
      story?.authorAvatar ||
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(story?.authorName || 'CSG')}`,
    [story],
  )

  useEffect(() => {
    setIndex(startIndex)
  }, [startIndex])

  useEffect(() => {
    if (!user || !story) return
    if (viewedRef.current.has(story.id)) return
    viewedRef.current.add(story.id)
    void viewStory(story.id, user)
      .then((next) => onStoryChange?.(next))
      .catch(() => {
        /* ignore view errors */
      })
  }, [story, user, onStoryChange])

  useEffect(() => {
    setProgress(0)
    const started = Date.now()
    const tick = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / STORY_MS) * 100)
      setProgress(pct)
      if (pct >= 100) {
        window.clearInterval(tick)
        setIndex((i) => {
          if (i >= stories.length - 1) {
            onClose()
            return i
          }
          return i + 1
        })
      }
    }, 50)
    return () => window.clearInterval(tick)
  }, [index, stories.length, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') {
        if (index >= stories.length - 1) onClose()
        else setIndex((i) => i + 1)
      }
      if (e.key === 'ArrowLeft') {
        if (index <= 0) setProgress(0)
        else setIndex((i) => i - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, stories.length, onClose])

  function goNext() {
    if (index >= stories.length - 1) onClose()
    else setIndex((i) => i + 1)
  }

  function goPrev() {
    if (index <= 0) setProgress(0)
    else setIndex((i) => i - 1)
  }

  async function onLike(e: MouseEvent) {
    e.stopPropagation()
    if (!user || !story || busy) return
    setBusy(true)
    try {
      const next = await likeStory(story.id, user)
      onStoryChange?.(next)
    } finally {
      setBusy(false)
    }
  }

  if (!story) return null

  const views = Number(story.viewCount || 0)
  const likes = Number(story.likeCount || 0)

  return (
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label="Story">
      <div className="story-viewer-inner">
        <div className="story-progress-row">
          {stories.map((s, i) => (
            <div className="story-progress-track" key={s.id}>
              <div
                className="story-progress-fill"
                style={{
                  width: i < index ? '100%' : i === index ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <div className="story-viewer-top">
          <img className="story-viewer-avatar" src={avatar} alt="" />
          <div>
            <strong>{story.authorName}</strong>
            <div className="muted">{new Date(story.createdAt).toLocaleTimeString()}</div>
          </div>
          <button type="button" className="story-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="story-media-wrap">
          <img src={story.mediaUrl} alt="" />
        </div>

        <div className="story-viewer-footer">
          <div className="story-view-count" title="Views">
            <EyeIcon />
            <span>
              {views} view{views === 1 ? '' : 's'}
            </span>
            {likes > 0 && (
              <span className="story-like-meta">
                · {likes} like{likes === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <button
            type="button"
            className={`story-like-btn${story.likedByMe ? ' liked' : ''}`}
            onClick={(e) => void onLike(e)}
            disabled={busy}
            aria-label={story.likedByMe ? 'Unlike story' : 'Like story'}
          >
            <HeartIcon filled={story.likedByMe} />
          </button>
        </div>

        <button type="button" className="story-hit left" onClick={goPrev} aria-label="Previous story" />
        <button type="button" className="story-hit right" onClick={goNext} aria-label="Next story" />
      </div>
    </div>
  )
}
