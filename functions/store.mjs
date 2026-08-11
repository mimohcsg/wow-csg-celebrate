import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { randomUUID } from 'crypto'

if (!getApps().length) {
  initializeApp()
}

const db = getFirestore()
const STORE_REF = db.collection('celebrate').doc('store')

export function emptyStore() {
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
    storyLikes: [],
    storyViews: [],
  }
}

export function normalizeStore(raw) {
  const store = raw && typeof raw === 'object' ? raw : {}
  if (!Array.isArray(store.users)) store.users = []
  if (!Array.isArray(store.posts)) store.posts = []
  if (!Array.isArray(store.comments)) store.comments = []
  if (!Array.isArray(store.likes)) store.likes = []
  if (!Array.isArray(store.stories)) store.stories = []
  if (!Array.isArray(store.storyLikes)) store.storyLikes = []
  if (!Array.isArray(store.storyViews)) store.storyViews = []
  for (const s of store.stories) {
    if (typeof s.likeCount !== 'number') s.likeCount = 0
    if (typeof s.viewCount !== 'number') s.viewCount = 0
  }
  return store
}

export async function loadStore() {
  const snap = await STORE_REF.get()
  if (!snap.exists) {
    const store = emptyStore()
    await STORE_REF.set(store)
    return store
  }
  return normalizeStore(snap.data())
}

export async function saveStore(store) {
  await STORE_REF.set(normalizeStore(store))
}

export async function updateStore(mutator) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(STORE_REF)
    const store = snap.exists ? normalizeStore(snap.data()) : emptyStore()
    const result = await mutator(store)
    tx.set(STORE_REF, normalizeStore(store))
    return result
  })
}

export async function uploadBuffer(buffer, originalName, mimetype) {
  const bucket = getStorage().bucket()
  const safe = String(originalName || 'file').replace(/[^\w.\-]+/g, '_')
  const filename = `uploads/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`
  const file = bucket.file(filename)
  await file.save(buffer, {
    metadata: {
      contentType: mimetype || 'application/octet-stream',
      cacheControl: 'public,max-age=31536000',
    },
    public: true,
    resumable: false,
  })
  try {
    await file.makePublic()
  } catch {
    /* bucket may already be public via rules */
  }
  return `https://storage.googleapis.com/${bucket.name}/${filename}`
}
