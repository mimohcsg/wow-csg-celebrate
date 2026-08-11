import cors from 'cors'
import express from 'express'
import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 8080
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const STORE_PATH = path.join(DATA_DIR, 'store.json')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

function emptyStore() {
  const now = Date.now()
  return {
    users: [],
    posts: [
      {
        id: 'welcome',
        caption: 'Welcome to WoW-CSG Celebrate — share wins with the team. #wowcsg #celebrate',
        authorEmail: 'team@csgi.com',
        authorName: 'WoW CSG Team',
        authorUsername: 'wowcsg',
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
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
      if (!Array.isArray(raw.users)) raw.users = []
      return raw
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

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return { salt, hash }
}

function verifyPassword(password, salt, hash) {
  try {
    const next = scryptSync(String(password), salt, 64)
    const prev = Buffer.from(hash, 'hex')
    if (next.length !== prev.length) return false
    return timingSafeEqual(next, prev)
  } catch {
    return false
  }
}

function publicUser(u, viewerEmail = '') {
  if (!u) return null
  const followers = Array.isArray(u.followers) ? u.followers : []
  const following = Array.isArray(u.following) ? u.following : []
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    bio: u.bio || '',
    avatarUrl: u.avatarUrl || '',
    followersCount: followers.length,
    followingCount: following.length,
    isFollowing: Boolean(viewerEmail && followers.includes(viewerEmail)),
    createdAt: u.createdAt,
  }
}

function findUser(store, { email, username, id } = {}) {
  return (store.users || []).find((u) => {
    if (email && u.email === email) return true
    if (username && u.username === username) return true
    if (id && u.id === id) return true
    return false
  })
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
  res.json({ ok: true, mode: 'shared', brand: 'WoW-CSG Celebrate' })
})

app.post('/api/auth/signup', (req, res) => {
  try {
    const username = String(req.body.username || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '')
    const email = String(req.body.email || '').trim().toLowerCase()
    const displayName = String(req.body.displayName || '').trim()
    const password = String(req.body.password || '')
    const bio = String(req.body.bio || '').trim().slice(0, 150)

    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }
    if (!email.includes('@')) return res.status(400).json({ error: 'Valid email required' })
    if (!displayName) return res.status(400).json({ error: 'Display name required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const store = loadStore()
    if (findUser(store, { email })) return res.status(409).json({ error: 'Email already registered' })
    if (findUser(store, { username })) return res.status(409).json({ error: 'Username already taken' })

    const { salt, hash } = hashPassword(password)
    const user = {
      id: randomUUID(),
      username,
      email,
      displayName,
      bio,
      avatarUrl: '',
      passwordSalt: salt,
      passwordHash: hash,
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
    }
    store.users.push(user)
    saveStore(store)
    res.status(201).json({ user: publicUser(user) })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Signup failed' })
  }
})

app.post('/api/auth/login', (req, res) => {
  try {
    const login = String(req.body.login || req.body.email || '').trim().toLowerCase()
    const password = String(req.body.password || '')
    if (!login || !password) return res.status(400).json({ error: 'Login and password required' })

    const store = loadStore()
    const user =
      findUser(store, { email: login }) ||
      findUser(store, { username: login })
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid username/email or password' })
    }
    res.json({ user: publicUser(user) })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Login failed' })
  }
})

app.get('/api/users/:username', (req, res) => {
  const store = loadStore()
  const viewer = String(req.query.viewer || '').trim().toLowerCase()
  const user = findUser(store, { username: String(req.params.username || '').toLowerCase() })
  if (!user) return res.status(404).json({ error: 'User not found' })
  const posts = store.posts.filter((p) => p.authorEmail === user.email)
  res.json({
    user: publicUser(user, viewer),
    postsCount: posts.length,
  })
})

app.patch('/api/users/me', upload.single('avatar'), (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    if (!email) return res.status(400).json({ error: 'email required' })
    const store = loadStore()
    const user = findUser(store, { email })
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (req.body.displayName) user.displayName = String(req.body.displayName).trim()
    if (typeof req.body.bio === 'string') user.bio = String(req.body.bio).trim().slice(0, 150)
    if (req.file) user.avatarUrl = publicUrl(req, req.file.filename)

    // Keep post/story avatars in sync
    for (const p of store.posts) {
      if (p.authorEmail === email) {
        p.authorName = user.displayName
        p.authorAvatar = user.avatarUrl
        p.authorUsername = user.username
      }
    }
    for (const s of store.stories) {
      if (s.authorEmail === email) {
        s.authorName = user.displayName
        s.authorAvatar = user.avatarUrl
      }
    }

    saveStore(store)
    res.json({ user: publicUser(user, email) })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Update failed' })
  }
})

app.post('/api/users/:username/follow', (req, res) => {
  const meEmail = String(req.body.email || '').trim().toLowerCase()
  if (!meEmail) return res.status(400).json({ error: 'email required' })
  const store = loadStore()
  const me = findUser(store, { email: meEmail })
  const target = findUser(store, { username: String(req.params.username || '').toLowerCase() })
  if (!me || !target) return res.status(404).json({ error: 'User not found' })
  if (me.email === target.email) return res.status(400).json({ error: 'Cannot follow yourself' })

  me.following = Array.isArray(me.following) ? me.following : []
  target.followers = Array.isArray(target.followers) ? target.followers : []

  const following = me.following.includes(target.email)
  if (following) {
    me.following = me.following.filter((e) => e !== target.email)
    target.followers = target.followers.filter((e) => e !== me.email)
  } else {
    me.following.push(target.email)
    target.followers.push(me.email)
  }
  saveStore(store)
  res.json({ user: publicUser(target, meEmail), following: !following })
})

app.get('/api/users/:username/posts', (req, res) => {
  const store = loadStore()
  const viewer = String(req.query.viewer || '').trim().toLowerCase()
  const user = findUser(store, { username: String(req.params.username || '').toLowerCase() })
  if (!user) return res.status(404).json({ error: 'User not found' })
  const posts = store.posts
    .filter((p) => p.authorEmail === user.email)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((p) => ({
      ...p,
      likedByMe: store.likes.some((l) => l.postId === p.id && l.email === viewer),
    }))
  res.json({ posts })
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
    const store = loadStore()
    const account = findUser(store, { email: authorEmail })
    const media = files.map((f) => ({
      url: publicUrl(req, f.filename),
      type: String(f.mimetype || '').startsWith('video/') ? 'video' : 'image',
    }))
    const tags = (caption.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase())
    const post = {
      id: randomUUID(),
      caption,
      authorEmail,
      authorName: account?.displayName || authorName,
      authorUsername: account?.username || '',
      authorAvatar: account?.avatarUrl || '',
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

app.delete('/api/posts/:id', (req, res) => {
  const postId = req.params.id
  const email = String(req.body?.email || req.query.email || '').trim().toLowerCase()
  if (!email) return res.status(400).json({ error: 'email required' })
  const store = loadStore()
  const post = store.posts.find((p) => p.id === postId)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  if (post.authorEmail !== email) return res.status(403).json({ error: 'You can only delete your own posts' })

  store.posts = store.posts.filter((p) => p.id !== postId)
  store.likes = store.likes.filter((l) => l.postId !== postId)
  store.comments = store.comments.filter((c) => c.postId !== postId)
  saveStore(store)
  res.json({ ok: true })
})

app.post('/api/auth/change-password', (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase()
    const currentPassword = String(req.body.currentPassword || '')
    const newPassword = String(req.body.newPassword || '')
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'email, currentPassword, and newPassword required' })
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }
    const store = loadStore()
    const user = findUser(store, { email })
    if (!user || !verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }
    const { salt, hash } = hashPassword(newPassword)
    user.passwordSalt = salt
    user.passwordHash = hash
    saveStore(store)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Password update failed' })
  }
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
  const account = findUser(store, { email: authorEmail })
  const comment = {
    id: randomUUID(),
    postId,
    text,
    authorEmail,
    authorName: account?.displayName || authorName,
    authorAvatar: account?.avatarUrl || '',
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
    const account = findUser(store, { email: authorEmail })
    const story = {
      id: randomUUID(),
      authorEmail,
      authorName: account?.displayName || authorName,
      authorAvatar: account?.avatarUrl || '',
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
