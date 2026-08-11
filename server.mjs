import cors from 'cors'
import express from 'express'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 8080
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const STORE_PATH = path.join(DATA_DIR, 'store.json')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function emptyStore() {
  const now = Date.now()
  return {
    posts: [
      {
        id: 'welcome',
        caption: 'Welcome to WoW-CSG Celebrate — share wins with the team. #wowcsg #celebrate',
        authorEmail: 'team@csgi.com',
        authorName: 'WoW CSG Team',
        authorAvatar: '',
        media: [],
        likeCount: 0,
        commentCount: 0,
        hashtags: ['wowcsg', 'celebrate'],
        createdAt: new Date(now).toISOString(),
      },
    ],
    comments: [],
    likes: [],
    stories: [],
  }
}

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
    }
  } catch {
    /* ignore */
  }
  const store = emptyStore()
  saveStore(store)
  return store
}

function saveStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2))
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || 'file').replace(/[^\w.\-]+/g, '_')
    cb(null, `${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 10 },
})

const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(UPLOAD_DIR))

function publicUrl(req, filename) {
  const host = req.get('x-forwarded-host') || req.get('host')
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https'
  return `${proto}://${host}/uploads/${filename}`
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'shared' })
})

app.get('/api/posts', (req, res) => {
  const email = String(req.query.email || '')
  const store = loadStore()
  const posts = store.posts
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((p) => ({
      ...p,
      likedByMe: store.likes.some((l) => l.postId === p.id && l.email === email),
    }))
  res.json({ posts })
})

app.post('/api/posts', upload.array('files', 10), (req, res) => {
  try {
    const authorEmail = String(req.body.authorEmail || '').trim().toLowerCase()
    const authorName = String(req.body.authorName || '').trim()
    const caption = String(req.body.caption || '').trim()
    if (!authorEmail || !authorName) {
      return res.status(400).json({ error: 'authorEmail and authorName required' })
    }
    const files = req.files || []
    if (!files.length && !caption) {
      return res.status(400).json({ error: 'Add a caption or at least one media file' })
    }
    const media = files.map((f) => ({
      url: publicUrl(req, f.filename),
      type: String(f.mimetype || '').startsWith('video/') ? 'video' : 'image',
    }))
    const tags = (caption.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase())
    const store = loadStore()
    const post = {
      id: randomUUID(),
      caption,
      authorEmail,
      authorName,
      authorAvatar: '',
      media,
      likeCount: 0,
      commentCount: 0,
      hashtags: tags,
      createdAt: new Date().toISOString(),
    }
    store.posts.unshift(post)
    saveStore(store)
    res.status(201).json({ post })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Create failed' })
  }
})

app.post('/api/posts/:id/like', (req, res) => {
  const postId = req.params.id
  const email = String(req.body.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'email required' })
  const store = loadStore()
  const post = store.posts.find((p) => p.id === postId)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  const idx = store.likes.findIndex((l) => l.postId === postId && l.email === email)
  if (idx >= 0) {
    store.likes.splice(idx, 1)
    post.likeCount = Math.max(0, post.likeCount - 1)
  } else {
    store.likes.push({ postId, email })
    post.likeCount += 1
  }
  saveStore(store)
  res.json({
    post: {
      ...post,
      likedByMe: store.likes.some((l) => l.postId === postId && l.email === email),
    },
  })
})

app.get('/api/posts/:id/comments', (req, res) => {
  const store = loadStore()
  const comments = store.comments
    .filter((c) => c.postId === req.params.id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  res.json({ comments })
})

app.post('/api/posts/:id/comments', (req, res) => {
  const postId = req.params.id
  const text = String(req.body.text || '').trim()
  const authorEmail = String(req.body.authorEmail || '').trim().toLowerCase()
  const authorName = String(req.body.authorName || '').trim()
  if (!text || !authorEmail || !authorName) {
    return res.status(400).json({ error: 'text, authorEmail, authorName required' })
  }
  const store = loadStore()
  const post = store.posts.find((p) => p.id === postId)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  const comment = {
    id: randomUUID(),
    postId,
    text,
    authorEmail,
    authorName,
    authorAvatar: '',
    createdAt: new Date().toISOString(),
  }
  store.comments.push(comment)
  post.commentCount += 1
  saveStore(store)
  res.status(201).json({ comment })
})

app.get('/api/stories', (_req, res) => {
  const now = Date.now()
  const store = loadStore()
  const stories = store.stories.filter((s) => {
    const exp = Date.parse(s.expiresAt)
    return !Number.isFinite(exp) || exp > now
  })
  res.json({ stories })
})

app.post('/api/stories', upload.single('file'), (req, res) => {
  try {
    const authorEmail = String(req.body.authorEmail || '').trim().toLowerCase()
    const authorName = String(req.body.authorName || '').trim()
    if (!authorEmail || !authorName || !req.file) {
      return res.status(400).json({ error: 'authorEmail, authorName, and file required' })
    }
    const store = loadStore()
    const story = {
      id: randomUUID(),
      authorEmail,
      authorName,
      authorAvatar: '',
      mediaUrl: publicUrl(req, req.file.filename),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    }
    store.stories.unshift(story)
    saveStore(store)
    res.status(201).json({ story })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Story failed' })
  }
})

const distDir = path.join(__dirname, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api(?:\/|$)|\/uploads(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WoW-CSG Celebrate shared server on http://0.0.0.0:${PORT}`)
})
