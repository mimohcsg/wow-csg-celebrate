import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { createPost } from '../api/sharepoint'

export function CreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [caption, setCaption] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  function onFiles(list: FileList | null) {
    if (!list) return
    const next = [...files, ...Array.from(list)].slice(0, 10)
    setFiles(next)
    setPreviews(next.map((f) => URL.createObjectURL(f)))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    if (files.length === 0) {
      setError('Add at least one photo or short video')
      return
    }
    setBusy(true)
    setError('')
    setStatus(sharedModeLabel())
    try {
      await createPost({ user, caption, files })
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  function sharedModeLabel() {
    return 'Publishing to shared feed…'
  }

  return (
    <div className="page">
      <div className="top-bar">
        <h1>New post</h1>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Photos and videos are saved to the shared Celebrate feed for everyone.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="media">Media</label>
          <input id="media" type="file" accept="image/*,video/*" multiple onChange={(e) => onFiles(e.target.files)} />
        </div>
        {previews.length > 0 && (
          <div className="media-grid">
            {files.map((f, i) =>
              f.type.startsWith('video/') ? (
                <video key={i} src={previews[i]} muted />
              ) : (
                <img key={i} src={previews[i]} alt="" />
              ),
            )}
          </div>
        )}
        <div className="field">
          <label htmlFor="caption">Caption</label>
          <textarea
            id="caption"
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Celebrate a win… use #hashtags"
            maxLength={2200}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? status || 'Sharing…' : 'Share'}
        </button>
      </form>
    </div>
  )
}
