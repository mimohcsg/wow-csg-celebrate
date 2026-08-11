import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    setStatus('Sharing…')
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

  return (
    <div className="page create-page">
      <div className="top-bar">
        <Link to="/app" className="btn-link">
          Cancel
        </Link>
        <h1>New post</h1>
        <button
          className="btn-link"
          type="submit"
          form="create-form"
          disabled={busy}
          style={{ color: '#0095f6', opacity: busy ? 0.5 : 1 }}
        >
          {busy ? '…' : 'Share'}
        </button>
      </div>
      <div className="create-body">
        {error && <div className="error-banner" style={{ margin: '0 0 1rem' }}>{error}</div>}
        <form id="create-form" onSubmit={onSubmit}>
          <div className="drop-zone">
            <p style={{ margin: '0 0 0.75rem' }}>Select photos or a short video</p>
            <input type="file" accept="image/*,video/*" multiple onChange={(e) => onFiles(e.target.files)} />
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
              placeholder="Write a caption… use #hashtags"
              maxLength={2200}
            />
          </div>
          {status && <p className="muted">{status}</p>}
        </form>
      </div>
    </div>
  )
}
