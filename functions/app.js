const cors = require('cors')
const express = require('express')
const multer = require('multer')
const { randomUUID, randomBytes, scryptSync, timingSafeEqual } = require('crypto')
const { loadStore, updateStore, uploadBuffer } = require('./store')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 10 },
})

function adminEmailList() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function isAdminUser(store, user) {
  if (!user) return false
  if (user.isAdmin === true) return true
  const list = adminEmailList()
  if (list.includes(String(user.email || '').toLowerCase())) return true
  if (list.length === 0 && store.users[0] && store.users[0].email === user.email) return true
  return false
}

function enrichStory(store, story, viewerEmail = '') {
  return {
    ...story,
    likeCount: Number(story.likeCount || 0),
    viewCount: Number(story.viewCount || 0),
    likedByMe: Boolean(
      viewerEmail && store.storyLikes.some((l) => l.storyId === story.id && l.email === viewerEmail),
    ),
  }
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

function publicUser(u, viewerEmail = '', store) {
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
    isAdmin: isAdminUser(store, u),
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

async function fileToUrl(file) {
  if (!file) return ''
  return uploadBuffer(file.buffer, file.originalname, file.mimetype)
}

function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(cors({ origin: true }))
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: 'firebase', brand: 'WoW-CSG Celebrate' })
  })

  app.post('/api/auth/signup', async (req, res) => {
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

      const user = await updateStore((store) => {
        if (findUser(store, { email })) {
          const err = new Error('Email already registered')
          err.status = 409
          throw err
        }
        if (findUser(store, { username })) {
          const err = new Error('Username already taken')
          err.status = 409
          throw err
        }
        const { salt, hash } = hashPassword(password)
        const next = {
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
        store.users.push(next)
        return publicUser(next, '', store)
      })
      res.status(201).json({ user })
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'Signup failed' })
    }
  })

  app.post('/api/auth/login', async (req, res) => {
    try {
      const login = String(req.body.login || req.body.email || '').trim().toLowerCase()
      const password = String(req.body.password || '')
      if (!login || !password) return res.status(400).json({ error: 'Login and password required' })

      const store = await loadStore()
      const user =
        findUser(store, { email: login }) ||
        findUser(store, { username: login })
      if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        return res.status(401).json({ error: 'Invalid username/email or password' })
      }
      res.json({ user: publicUser(user, '', store) })
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Login failed' })
    }
  })

  app.get('/api/users/:username', async (req, res) => {
    const store = await loadStore()
    const viewer = String(req.query.viewer || '').trim().toLowerCase()
    const user = findUser(store, { username: String(req.params.username || '').toLowerCase() })
    if (!user) return res.status(404).json({ error: 'User not found' })
    const posts = store.posts.filter((p) => p.authorEmail === user.email)
    res.json({
      user: publicUser(user, viewer, store),
      postsCount: posts.length,
    })
  })

  app.patch('/api/users/me', upload.single('avatar'), async (req, res) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase()
      if (!email) return res.status(400).json({ error: 'email required' })
      const avatarUrl = req.file ? await fileToUrl(req.file) : null

      const user = await updateStore((store) => {
        const u = findUser(store, { email })
        if (!u) {
          const err = new Error('User not found')
          err.status = 404
          throw err
        }
        if (req.body.displayName) u.displayName = String(req.body.displayName).trim()
        if (typeof req.body.bio === 'string') u.bio = String(req.body.bio).trim().slice(0, 150)
        if (avatarUrl) u.avatarUrl = avatarUrl
        for (const p of store.posts) {
          if (p.authorEmail === email) {
            p.authorName = u.displayName
            p.authorAvatar = u.avatarUrl
            p.authorUsername = u.username
          }
        }
        for (const s of store.stories) {
          if (s.authorEmail === email) {
            s.authorName = u.displayName
            s.authorAvatar = u.avatarUrl
          }
        }
        return publicUser(u, email, store)
      })
      res.json({ user })
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'Update failed' })
    }
  })

  app.post('/api/users/:username/follow', async (req, res) => {
    try {
      const meEmail = String(req.body.email || '').trim().toLowerCase()
      if (!meEmail) return res.status(400).json({ error: 'email required' })
      const result = await updateStore((store) => {
        const me = findUser(store, { email: meEmail })
        const target = findUser(store, { username: String(req.params.username || '').toLowerCase() })
        if (!me || !target) {
          const err = new Error('User not found')
          err.status = 404
          throw err
        }
        if (me.email === target.email) {
          const err = new Error('Cannot follow yourself')
          err.status = 400
          throw err
        }
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
        return { user: publicUser(target, meEmail, store), following: !following }
      })
      res.json(result)
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'Follow failed' })
    }
  })

  app.get('/api/users/:username/posts', async (req, res) => {
    const store = await loadStore()
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

  app.get('/api/posts', async (req, res) => {
    const email = String(req.query.email || '')
    const store = await loadStore()
    const posts = store.posts
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((p) => ({
        ...p,
        likedByMe: store.likes.some((l) => l.postId === p.id && l.email === email),
      }))
    res.json({ posts })
  })

  app.post('/api/posts', upload.array('files', 10), async (req, res) => {
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
      const media = []
      for (const f of files) {
        media.push({
          url: await fileToUrl(f),
          type: String(f.mimetype || '').startsWith('video/') ? 'video' : 'image',
        })
      }
      const post = await updateStore((store) => {
        const account = findUser(store, { email: authorEmail })
        const tags = (caption.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase())
        const next = {
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
        store.posts.unshift(next)
        return next
      })
      res.status(201).json({ post })
    } catch (e) {
      console.error('post create failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : 'Create failed' })
    }
  })

  app.post('/api/posts/:id/like', async (req, res) => {
    try {
      const postId = req.params.id
      const email = String(req.body.email || '').trim().toLowerCase()
      if (!email) return res.status(400).json({ error: 'email required' })
      const post = await updateStore((store) => {
        const row = store.posts.find((p) => p.id === postId)
        if (!row) {
          const err = new Error('Post not found')
          err.status = 404
          throw err
        }
        const idx = store.likes.findIndex((l) => l.postId === postId && l.email === email)
        if (idx >= 0) {
          store.likes.splice(idx, 1)
          row.likeCount = Math.max(0, row.likeCount - 1)
        } else {
          store.likes.push({ postId, email })
          row.likeCount += 1
        }
        return {
          ...row,
          likedByMe: store.likes.some((l) => l.postId === postId && l.email === email),
        }
      })
      res.json({ post })
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'Like failed' })
    }
  })

  app.delete('/api/posts/:id', async (req, res) => {
    try {
      const postId = req.params.id
      const email = String(req.body?.email || req.query.email || '').trim().toLowerCase()
      if (!email) return res.status(400).json({ error: 'email required' })
      await updateStore((store) => {
        const post = store.posts.find((p) => p.id === postId)
        if (!post) {
          const err = new Error('Post not found')
          err.status = 404
          throw err
        }
        if (post.authorEmail !== email) {
          const err = new Error('You can only delete your own posts')
          err.status = 403
          throw err
        }
        store.posts = store.posts.filter((p) => p.id !== postId)
        store.likes = store.likes.filter((l) => l.postId !== postId)
        store.comments = store.comments.filter((c) => c.postId !== postId)
      })
      res.json({ ok: true })
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'Delete failed' })
    }
  })

  app.post('/api/auth/change-password', async (req, res) => {
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
      await updateStore((store) => {
        const user = findUser(store, { email })
        if (!user || !verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
          const err = new Error('Current password is incorrect')
          err.status = 401
          throw err
        }
        const { salt, hash } = hashPassword(newPassword)
        user.passwordSalt = salt
        user.passwordHash = hash
      })
      res.json({ ok: true })
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'Password update failed' })
    }
  })

  app.get('/api/posts/:id/comments', async (req, res) => {
    const store = await loadStore()
    const comments = store.comments
      .filter((c) => c.postId === req.params.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    res.json({ comments })
  })

  app.post('/api/posts/:id/comments', async (req, res) => {
    try {
      const postId = req.params.id
      const text = String(req.body.text || '').trim()
      const authorEmail = String(req.body.authorEmail || '').trim().toLowerCase()
      const authorName = String(req.body.authorName || '').trim()
      if (!text || !authorEmail || !authorName) {
        return res.status(400).json({ error: 'text, authorEmail, authorName required' })
      }
      const comment = await updateStore((store) => {
        const post = store.posts.find((p) => p.id === postId)
        if (!post) {
          const err = new Error('Post not found')
          err.status = 404
          throw err
        }
        const account = findUser(store, { email: authorEmail })
        const next = {
          id: randomUUID(),
          postId,
          text,
          authorEmail,
          authorName: account?.displayName || authorName,
          authorAvatar: account?.avatarUrl || '',
          createdAt: new Date().toISOString(),
        }
        store.comments.push(next)
        post.commentCount += 1
        return next
      })
      res.status(201).json({ comment })
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'Comment failed' })
    }
  })

  app.get('/api/stories', async (req, res) => {
    const now = Date.now()
    const viewer = String(req.query.viewer || '').trim().toLowerCase()
    const store = await loadStore()
    const stories = store.stories
      .filter((s) => {
        const exp = Date.parse(s.expiresAt)
        return !Number.isFinite(exp) || exp > now
      })
      .map((s) => enrichStory(store, s, viewer))
    res.json({ stories })
  })

  app.post('/api/stories', upload.single('file'), async (req, res) => {
    try {
      const authorEmail = String(req.body.authorEmail || '').trim().toLowerCase()
      const authorName = String(req.body.authorName || '').trim()
      if (!authorEmail || !authorName || !req.file) {
        return res.status(400).json({ error: 'authorEmail, authorName, and file required' })
      }
      const mediaUrl = await fileToUrl(req.file)
      const story = await updateStore((store) => {
        const account = findUser(store, { email: authorEmail })
        const next = {
          id: randomUUID(),
          authorEmail,
          authorName: account?.displayName || authorName,
          authorAvatar: account?.avatarUrl || '',
          mediaUrl,
          likeCount: 0,
          viewCount: 0,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        }
        store.stories.unshift(next)
        return enrichStory(store, next, authorEmail)
      })
      res.status(201).json({ story })
    } catch (e) {
      console.error('story upload failed', e)
      res.status(500).json({ error: e instanceof Error ? e.message : 'Story failed' })
    }
  })

  app.post('/api/stories/:id/like', async (req, res) => {
    try {
      const storyId = req.params.id
      const email = String(req.body.email || '').trim().toLowerCase()
      if (!email) return res.status(400).json({ error: 'email required' })
      const story = await updateStore((store) => {
        const row = store.stories.find((s) => s.id === storyId)
        if (!row) {
          const err = new Error('Story not found')
          err.status = 404
          throw err
        }
        const idx = store.storyLikes.findIndex((l) => l.storyId === storyId && l.email === email)
        if (idx >= 0) {
          store.storyLikes.splice(idx, 1)
          row.likeCount = Math.max(0, Number(row.likeCount || 0) - 1)
        } else {
          store.storyLikes.push({ storyId, email, createdAt: new Date().toISOString() })
          row.likeCount = Number(row.likeCount || 0) + 1
        }
        return enrichStory(store, row, email)
      })
      res.json({ story })
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'Like failed' })
    }
  })

  app.post('/api/stories/:id/view', async (req, res) => {
    try {
      const storyId = req.params.id
      const email = String(req.body.email || '').trim().toLowerCase()
      if (!email) return res.status(400).json({ error: 'email required' })
      const story = await updateStore((store) => {
        const row = store.stories.find((s) => s.id === storyId)
        if (!row) {
          const err = new Error('Story not found')
          err.status = 404
          throw err
        }
        if (email !== row.authorEmail) {
          const already = store.storyViews.some((v) => v.storyId === storyId && v.email === email)
          if (!already) {
            store.storyViews.push({ storyId, email, createdAt: new Date().toISOString() })
            row.viewCount = Number(row.viewCount || 0) + 1
          }
        }
        return enrichStory(store, row, email)
      })
      res.json({ story })
    } catch (e) {
      res.status(e.status || 500).json({ error: e instanceof Error ? e.message : 'View failed' })
    }
  })

  app.get('/api/admin/insights', async (req, res) => {
    const email = String(req.query.email || '').trim().toLowerCase()
    if (!email) return res.status(400).json({ error: 'email required' })
    const store = await loadStore()
    const user = findUser(store, { email })
    if (!isAdminUser(store, user)) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const topPosts = [...store.posts]
      .map((p) => ({
        id: p.id,
        caption: p.caption,
        authorName: p.authorName,
        authorEmail: p.authorEmail,
        likeCount: Number(p.likeCount || 0),
        commentCount: Number(p.commentCount || 0),
        createdAt: p.createdAt,
        mediaUrl: p.media?.[0]?.url || '',
      }))
      .sort((a, b) => b.likeCount - a.likeCount || b.commentCount - a.commentCount)
      .slice(0, 20)

    const topStoriesByViews = [...store.stories]
      .map((s) => enrichStory(store, s))
      .sort((a, b) => b.viewCount - a.viewCount || b.likeCount - a.likeCount)
      .slice(0, 20)

    const topStoriesByLikes = [...store.stories]
      .map((s) => enrichStory(store, s))
      .sort((a, b) => b.likeCount - a.likeCount || b.viewCount - a.viewCount)
      .slice(0, 20)

    res.json({
      summary: {
        users: store.users.length,
        posts: store.posts.length,
        stories: store.stories.length,
        postLikes: store.likes.length,
        storyLikes: store.storyLikes.length,
        storyViews: store.storyViews.length,
      },
      topPosts,
      topStoriesByViews,
      topStoriesByLikes,
    })
  })

  return app
}

module.exports = { createApp }
