import { useEffect, useMemo, useState } from 'react'
import type { Story } from '../types'

const STORY_MS = 5000

export function StoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: Story[]
  startIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)
  const [progress, setProgress] = useState(0)
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

  if (!story) return null

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

        <button type="button" className="story-hit left" onClick={goPrev} aria-label="Previous story" />
        <button type="button" className="story-hit right" onClick={goNext} aria-label="Next story" />
      </div>
    </div>
  )
}
