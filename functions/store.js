const { initializeApp, getApps } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')
const { randomUUID } = require('crypto')

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'csg-celebrate'
const STORAGE_BUCKET =
  process.env.STORAGE_BUCKET ||
  `${PROJECT_ID}.firebasestorage.app`

function ensureApp() {
  if (!getApps().length) {
    initializeApp({
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
    })
  }
}

function adminDb() {
  ensureApp()
  return getFirestore()
}

function storeRef() {
  return adminDb().collection('celebrate').doc('store')
}

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
    storyLikes: [],
    storyViews: [],
  }
}

function normalizeStore(raw) {
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

async function loadStore() {
  const snap = await storeRef().get()
  if (!snap.exists) {
    const store = emptyStore()
    await storeRef().set(store)
    return store
  }
  return normalizeStore(snap.data())
}

async function saveStore(store) {
  await storeRef().set(normalizeStore(store))
}

async function updateStore(mutator) {
  return adminDb().runTransaction(async (tx) => {
    const ref = storeRef()
    const snap = await tx.get(ref)
    const store = snap.exists ? normalizeStore(snap.data()) : emptyStore()
    const result = await mutator(store)
    tx.set(ref, normalizeStore(store))
    return result
  })
}

async function uploadBuffer(buffer, originalName, mimetype) {
  ensureApp()
  const candidates = [
    STORAGE_BUCKET,
    `${PROJECT_ID}.appspot.com`,
  ]
  const safe = String(originalName || 'file').replace(/[^\w.\-]+/g, '_')
  const filename = `uploads/${Date.now()}-${randomUUID().slice(0, 8)}-${safe}`
  const token = randomUUID()
  let lastError = null

  for (const bucketName of candidates) {
    try {
      const bucket = getStorage().bucket(bucketName)
      const file = bucket.file(filename)
      await file.save(buffer, {
        metadata: {
          contentType: mimetype || 'application/octet-stream',
          cacheControl: 'public,max-age=31536000',
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
        resumable: false,
        validation: false,
      })
      return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`
    } catch (e) {
      lastError = e
      console.error(`upload to ${bucketName} failed`, e)
    }
  }

  // Fallback so stories/posts still work before Storage is fully initialized.
  if (buffer.length <= 750_000 && String(mimetype || '').startsWith('image/')) {
    return `data:${mimetype};base64,${buffer.toString('base64')}`
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError || 'unknown')
  throw new Error(
    `Storage upload failed: ${msg}. Open Firebase Console → Storage → Get started, then retry.`,
  )
}

module.exports = {
  emptyStore,
  normalizeStore,
  loadStore,
  saveStore,
  updateStore,
  uploadBuffer,
  STORAGE_BUCKET,
}
