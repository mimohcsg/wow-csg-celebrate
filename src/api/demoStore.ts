import type { CelebrateUser, Comment, MediaItem, Post, Story } from '../types'

const KEY = 'wow-celebrate-demo-v1'

type DemoDb = {
  posts: Post[]
  comments: Comment[]
  likes: Array<{ postId: string; email: string }>
  stories: Story[]
  storyLikes: Array<{ storyId: string; email: string }>
  storyViews: Array<{ storyId: string; email: string }>
}

const DEMO_USER: CelebrateUser = {
  id: 'demo-user',
  email: 'mimoh.ojha@csgi.com',
  displayName: 'Mimoh Ojha',
  avatarUrl: '',
  isAdmin: true,
}

function seed(): DemoDb {
  const now = Date.now()
  return {
    posts: [
      {
        id: 'p1',
        caption: 'Kicking off WoW-CSG Celebrate — share wins, events, and culture. #wowcsg #celebrate',
        authorEmail: 'team.lead@csgi.com',
        authorName: 'WoW CSG Team',
        authorAvatar: '',
        media: [
          {
            url: 'data:image/svg+xml,' + encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3d2a24"/><stop offset="1" stop-color="#c47a5a"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><text x="40" y="320" fill="#f5e6d8" font-family="Georgia,serif" font-size="42">Celebrate together</text></svg>`,
            ),
            type: 'image',
          },
        ],
        likeCount: 3,
        commentCount: 1,
        hashtags: ['wowcsg', 'celebrate'],
        createdAt: new Date(now - 3600_000).toISOString(),
        likedByMe: false,
      },
      {
        id: 'p2',
        caption: 'Great sprint demo today — shipping culture moments for the team. #delivery',
        authorEmail: DEMO_USER.email,
        authorName: DEMO_USER.displayName,
        authorAvatar: '',
        media: [],
        likeCount: 1,
        commentCount: 0,
        hashtags: ['delivery'],
        createdAt: new Date(now - 7200_000).toISOString(),
        likedByMe: true,
      },
    ],
    comments: [
      {
        id: 'c1',
        postId: 'p1',
        text: 'Love this — looking forward to more wins!',
        authorEmail: DEMO_USER.email,
        authorName: DEMO_USER.displayName,
        authorAvatar: '',
        createdAt: new Date(now - 1800_000).toISOString(),
      },
    ],
    likes: [
      { postId: 'p1', email: 'alex@csgi.com' },
      { postId: 'p1', email: 'sam@csgi.com' },
      { postId: 'p1', email: 'jordan@csgi.com' },
      { postId: 'p2', email: DEMO_USER.email },
    ],
    stories: [
      {
        id: 's1',
        authorEmail: 'team.lead@csgi.com',
        authorName: 'WoW CSG Team',
        authorAvatar: '',
        mediaUrl:
          'data:image/svg+xml,' +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="700"><rect width="400" height="700" fill="#1a1210"/><text x="40" y="360" fill="#e8a87c" font-family="sans-serif" font-size="28">24h Story</text></svg>`,
          ),
        createdAt: new Date(now - 600_000).toISOString(),
        expiresAt: new Date(now + 86_400_000).toISOString(),
        likeCount: 2,
        viewCount: 5,
      },
    ],
    storyLikes: [
      { storyId: 's1', email: 'alex@csgi.com' },
      { storyId: 's1', email: 'sam@csgi.com' },
    ],
    storyViews: [
      { storyId: 's1', email: 'alex@csgi.com' },
      { storyId: 's1', email: 'sam@csgi.com' },
      { storyId: 's1', email: 'jordan@csgi.com' },
      { storyId: 's1', email: 'lee@csgi.com' },
      { storyId: 's1', email: 'pat@csgi.com' },
    ],
  }
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DemoDb
  } catch {
    /* ignore */
  }
  const db = seed()
  save(db)
  return db
}

function save(db: DemoDb) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export function isDemoMode() {
  return import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_DEMO_MODE === '1'
}

export function getDemoUser(): CelebrateUser {
  return { ...DEMO_USER }
}

export async function demoGetMe(): Promise<CelebrateUser> {
  return getDemoUser()
}

export async function demoFetchPosts(userEmail: string): Promise<Post[]> {
  const db = load()
  return db.posts
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map((p) => ({
      ...p,
      likedByMe: db.likes.some((l) => l.postId === p.id && l.email === userEmail),
    }))
}

export async function demoCreatePost(params: {
  user: CelebrateUser
  caption: string
  files: File[]
}): Promise<string> {
  const db = load()
  const media: MediaItem[] = []
  for (const file of params.files.slice(0, 10)) {
    media.push({
      url: await fileToDataUrl(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    })
  }
  const tags = (params.caption.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase())
  const id = `p${Date.now()}`
  db.posts.unshift({
    id,
    caption: params.caption,
    authorEmail: params.user.email,
    authorName: params.user.displayName,
    authorAvatar: params.user.avatarUrl || '',
    media,
    likeCount: 0,
    commentCount: 0,
    hashtags: tags,
    createdAt: new Date().toISOString(),
    likedByMe: false,
  })
  save(db)
  return id
}

export async function demoToggleLike(post: Post, user: CelebrateUser): Promise<Post> {
  const db = load()
  const idx = db.likes.findIndex((l) => l.postId === post.id && l.email === user.email)
  const postRow = db.posts.find((p) => p.id === post.id)
  if (!postRow) return post
  if (idx >= 0) {
    db.likes.splice(idx, 1)
    postRow.likeCount = Math.max(0, postRow.likeCount - 1)
    save(db)
    return { ...post, likedByMe: false, likeCount: postRow.likeCount }
  }
  db.likes.push({ postId: post.id, email: user.email })
  postRow.likeCount += 1
  save(db)
  return { ...post, likedByMe: true, likeCount: postRow.likeCount }
}

export async function demoAddComment(postId: string, user: CelebrateUser, text: string): Promise<void> {
  const db = load()
  db.comments.push({
    id: `c${Date.now()}`,
    postId,
    text,
    authorEmail: user.email,
    authorName: user.displayName,
    authorAvatar: user.avatarUrl || '',
    createdAt: new Date().toISOString(),
  })
  const post = db.posts.find((p) => p.id === postId)
  if (post) post.commentCount += 1
  save(db)
}

export async function demoFetchComments(postId: string): Promise<Comment[]> {
  return load()
    .comments.filter((c) => c.postId === postId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
}

export async function demoCreateStory(user: CelebrateUser, file: File): Promise<string> {
  const db = load()
  const id = `s${Date.now()}`
  db.stories.unshift({
    id,
    authorEmail: user.email,
    authorName: user.displayName,
    authorAvatar: user.avatarUrl || '',
    mediaUrl: await fileToDataUrl(file),
    likeCount: 0,
    viewCount: 0,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  })
  save(db)
  return id
}

export async function demoFetchActiveStories(viewerEmail = ''): Promise<Story[]> {
  const now = Date.now()
  const db = load()
  return db.stories
    .filter((s) => {
      const exp = Date.parse(s.expiresAt)
      return !Number.isFinite(exp) || exp > now
    })
    .map((s) => ({
      ...s,
      likeCount: Number(s.likeCount || 0),
      viewCount: Number(s.viewCount || 0),
      likedByMe: Boolean(
        viewerEmail && (db.storyLikes || []).some((l) => l.storyId === s.id && l.email === viewerEmail),
      ),
    }))
}

export async function demoLikeStory(storyId: string, email: string): Promise<Story> {
  const db = load()
  if (!db.storyLikes) db.storyLikes = []
  const story = db.stories.find((s) => s.id === storyId)
  if (!story) throw new Error('Story not found')
  const idx = db.storyLikes.findIndex((l) => l.storyId === storyId && l.email === email)
  if (idx >= 0) {
    db.storyLikes.splice(idx, 1)
    story.likeCount = Math.max(0, Number(story.likeCount || 0) - 1)
  } else {
    db.storyLikes.push({ storyId, email })
    story.likeCount = Number(story.likeCount || 0) + 1
  }
  save(db)
  return {
    ...story,
    likedByMe: db.storyLikes.some((l) => l.storyId === storyId && l.email === email),
  }
}

export async function demoViewStory(storyId: string, email: string): Promise<Story> {
  const db = load()
  if (!db.storyViews) db.storyViews = []
  const story = db.stories.find((s) => s.id === storyId)
  if (!story) throw new Error('Story not found')
  if (email !== story.authorEmail) {
    const already = db.storyViews.some((v) => v.storyId === storyId && v.email === email)
    if (!already) {
      db.storyViews.push({ storyId, email })
      story.viewCount = Number(story.viewCount || 0) + 1
      save(db)
    }
  }
  return {
    ...story,
    likedByMe: (db.storyLikes || []).some((l) => l.storyId === storyId && l.email === email),
  }
}

export async function demoAdminInsights(email: string) {
  if (email !== DEMO_USER.email) throw new Error('Admin access required')
  const db = load()
  const topPosts = [...db.posts]
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
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 20)
  const stories = db.stories.map((s) => ({
    ...s,
    likeCount: Number(s.likeCount || 0),
    viewCount: Number(s.viewCount || 0),
  }))
  return {
    summary: {
      users: 1,
      posts: db.posts.length,
      stories: db.stories.length,
      postLikes: db.likes.length,
      storyLikes: (db.storyLikes || []).length,
      storyViews: (db.storyViews || []).length,
    },
    topPosts,
    topStoriesByViews: [...stories].sort((a, b) => b.viewCount! - a.viewCount!).slice(0, 20),
    topStoriesByLikes: [...stories].sort((a, b) => b.likeCount! - a.likeCount!).slice(0, 20),
  }
}

export async function demoDeletePost(postId: string, email: string): Promise<void> {
  const db = load()
  const post = db.posts.find((p) => p.id === postId)
  if (!post) throw new Error('Post not found')
  if (post.authorEmail !== email) throw new Error('You can only delete your own posts')
  db.posts = db.posts.filter((p) => p.id !== postId)
  db.likes = db.likes.filter((l) => l.postId !== postId)
  db.comments = db.comments.filter((c) => c.postId !== postId)
  save(db)
}

