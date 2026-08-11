import { Client } from '@microsoft/microsoft-graph-client'
import { getAccessToken } from '../auth/msal'
import type { CelebrateUser, Comment, MediaItem, Post, Story } from '../types'
import {
  demoAddComment,
  demoCreatePost,
  demoCreateStory,
  demoFetchActiveStories,
  demoFetchComments,
  demoFetchPosts,
  demoGetMe,
  demoToggleLike,
  isDemoMode,
} from './demoStore'
import {
  isSharedMode,
  sharedAddComment,
  sharedCreatePost,
  sharedCreateStory,
  sharedFetchActiveStories,
  sharedFetchComments,
  sharedFetchPosts,
  sharedToggleLike,
} from './sharedApi'

const siteHost = import.meta.env.VITE_SHAREPOINT_SITE_HOST || ''
const sitePath = import.meta.env.VITE_SHAREPOINT_SITE_PATH || '/sites/WoWCSGCelebrate'

let cachedSiteId: string | null = null
const listIds: Record<string, string> = {}

function graphClient(): Client {
  return Client.init({
    authProvider: async (done) => {
      try {
        done(null, await getAccessToken())
      } catch (e) {
        done(e as Error, null)
      }
    },
  })
}

async function getSiteId(client: Client): Promise<string> {
  if (cachedSiteId) return cachedSiteId
  if (!siteHost) throw new Error('Set VITE_SHAREPOINT_SITE_HOST in .env.local')
  const path = sitePath.startsWith('/') ? sitePath : `/${sitePath}`
  const site = await client.api(`/sites/${siteHost}:${path}`).get()
  cachedSiteId = site.id as string
  return cachedSiteId
}

async function getListId(client: Client, listName: string): Promise<string> {
  if (listIds[listName]) return listIds[listName]
  const siteId = await getSiteId(client)
  const list = await client.api(`/sites/${siteId}/lists/${listName}`).get()
  listIds[listName] = list.id as string
  return listIds[listName]
}

function fields(item: { fields?: Record<string, unknown> }) {
  return item.fields || {}
}

function parseMedia(json: unknown): MediaItem[] {
  if (!json) return []
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json
    return Array.isArray(parsed) ? (parsed as MediaItem[]) : []
  } catch {
    return []
  }
}

export async function getMe(): Promise<CelebrateUser> {
  if (isSharedMode() || isDemoMode()) return demoGetMe()
  const client = graphClient()
  const me = await client.api('/me').select('id,displayName,mail,userPrincipalName').get()
  const email = (me.mail || me.userPrincipalName || '') as string
  let avatarUrl = ''
  try {
    const photo = await client.api('/me/photo/$value').responseType('blob' as never).get()
    if (photo instanceof Blob) avatarUrl = URL.createObjectURL(photo)
  } catch {
    /* no photo */
  }
  return {
    id: me.id as string,
    email,
    displayName: (me.displayName as string) || email.split('@')[0],
    avatarUrl,
  }
}

export async function fetchPosts(userEmail: string): Promise<Post[]> {
  if (isSharedMode()) return sharedFetchPosts(userEmail)
  if (isDemoMode()) return demoFetchPosts(userEmail)
  const client = graphClient()
  const siteId = await getSiteId(client)
  const listId = await getListId(client, 'CelebratePosts')
  const res = await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand('fields')
    .top(50)
    .orderby('createdDateTime desc')
    .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
    .get()

  const items = (res.value || []) as Array<{ id: string; createdDateTime?: string; fields?: Record<string, unknown> }>
  const posts: Post[] = []

  for (const item of items) {
    const f = fields(item)
    const postId = String(item.id)
    let likedByMe = false
    try {
      likedByMe = await hasLiked(client, siteId, postId, userEmail)
    } catch {
      likedByMe = false
    }
    posts.push({
      id: postId,
      caption: String(f.Caption || f.Title || ''),
      authorEmail: String(f.AuthorEmail || ''),
      authorName: String(f.AuthorName || ''),
      authorAvatar: String(f.AuthorAvatar || ''),
      media: parseMedia(f.MediaJson),
      likeCount: Number(f.LikeCount || 0),
      commentCount: Number(f.CommentCount || 0),
      hashtags: String(f.Hashtags || '')
        .split(/[,\s]+/)
        .filter(Boolean),
      createdAt: item.createdDateTime || new Date().toISOString(),
      likedByMe,
    })
  }

  return posts
}

async function hasLiked(
  client: Client,
  siteId: string,
  postId: string,
  email: string,
): Promise<boolean> {
  const listId = await getListId(client, 'CelebrateLikes')
  const filter = `fields/PostId eq '${postId.replace(/'/g, "''")}' and fields/AuthorEmail eq '${email.replace(/'/g, "''")}'`
  const res = await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .filter(filter)
    .expand('fields')
    .top(1)
    .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
    .get()
  return Array.isArray(res.value) && res.value.length > 0
}

export async function uploadMedia(file: File, folder = 'posts'): Promise<string> {
  if (isSharedMode()) throw new Error('Use createPost in shared mode')
  if (isDemoMode()) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Could not read file'))
      reader.readAsDataURL(file)
    })
  }
  const client = graphClient()
  const siteId = await getSiteId(client)
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const name = `${folder}/${Date.now()}-${safe}`
  const uploaded = await client
    .api(`/sites/${siteId}/lists/CelebrateMedia/drive/root:/${name}:/content`)
    .header('Content-Type', file.type || 'application/octet-stream')
    .put(file)
  return (uploaded['@microsoft.graph.downloadUrl'] as string) || (uploaded.webUrl as string)
}

export async function createPost(params: {
  user: CelebrateUser
  caption: string
  files: File[]
}): Promise<string> {
  if (isSharedMode()) return sharedCreatePost(params)
  if (isDemoMode()) return demoCreatePost(params)
  const client = graphClient()
  const siteId = await getSiteId(client)
  const listId = await getListId(client, 'CelebratePosts')

  const media: MediaItem[] = []
  for (const file of params.files.slice(0, 10)) {
    const url = await uploadMedia(file, 'posts')
    media.push({
      url,
      type: file.type.startsWith('video/') ? 'video' : 'image',
    })
  }

  const tags = (params.caption.match(/#\w+/g) || []).map((t) => t.slice(1).toLowerCase())
  const created = await client.api(`/sites/${siteId}/lists/${listId}/items`).post({
    fields: {
      Title: params.caption.slice(0, 80) || 'Celebration',
      Caption: params.caption,
      AuthorEmail: params.user.email,
      AuthorName: params.user.displayName,
      AuthorAvatar: params.user.avatarUrl || '',
      MediaJson: JSON.stringify(media),
      LikeCount: 0,
      CommentCount: 0,
      Hashtags: tags.join(','),
    },
  })
  return String(created.id)
}

export async function toggleLike(post: Post, user: CelebrateUser): Promise<Post> {
  if (isSharedMode()) return sharedToggleLike(post, user)
  if (isDemoMode()) return demoToggleLike(post, user)
  const client = graphClient()
  const siteId = await getSiteId(client)
  const likesId = await getListId(client, 'CelebrateLikes')
  const postsId = await getListId(client, 'CelebratePosts')

  if (post.likedByMe) {
    const filter = `fields/PostId eq '${post.id.replace(/'/g, "''")}' and fields/AuthorEmail eq '${user.email.replace(/'/g, "''")}'`
    const res = await client
      .api(`/sites/${siteId}/lists/${likesId}/items`)
      .filter(filter)
      .expand('fields')
      .top(5)
      .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
      .get()
    for (const item of res.value || []) {
      await client.api(`/sites/${siteId}/lists/${likesId}/items/${item.id}`).delete()
    }
    const next = Math.max(0, post.likeCount - 1)
    await client.api(`/sites/${siteId}/lists/${postsId}/items/${post.id}/fields`).patch({
      LikeCount: next,
    })
    return { ...post, likedByMe: false, likeCount: next }
  }

  await client.api(`/sites/${siteId}/lists/${likesId}/items`).post({
    fields: {
      Title: `${post.id}-${user.email}`,
      PostId: post.id,
      AuthorEmail: user.email,
    },
  })
  const next = post.likeCount + 1
  await client.api(`/sites/${siteId}/lists/${postsId}/items/${post.id}/fields`).patch({
    LikeCount: next,
  })
  return { ...post, likedByMe: true, likeCount: next }
}

export async function addComment(postId: string, user: CelebrateUser, text: string): Promise<void> {
  if (isSharedMode()) return sharedAddComment(postId, user, text)
  if (isDemoMode()) return demoAddComment(postId, user, text)
  const client = graphClient()
  const siteId = await getSiteId(client)
  const commentsId = await getListId(client, 'CelebrateComments')
  const postsId = await getListId(client, 'CelebratePosts')
  await client.api(`/sites/${siteId}/lists/${commentsId}/items`).post({
    fields: {
      Title: text.slice(0, 80),
      PostId: postId,
      CommentText: text,
      AuthorEmail: user.email,
      AuthorName: user.displayName,
      AuthorAvatar: user.avatarUrl || '',
    },
  })
  const post = await client.api(`/sites/${siteId}/lists/${postsId}/items/${postId}`).expand('fields').get()
  const count = Number(post.fields?.CommentCount || 0) + 1
  await client.api(`/sites/${siteId}/lists/${postsId}/items/${postId}/fields`).patch({ CommentCount: count })
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  if (isSharedMode()) return sharedFetchComments(postId)
  if (isDemoMode()) return demoFetchComments(postId)
  const client = graphClient()
  const siteId = await getSiteId(client)
  const listId = await getListId(client, 'CelebrateComments')
  const filter = `fields/PostId eq '${postId.replace(/'/g, "''")}'`
  const res = await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .filter(filter)
    .expand('fields')
    .top(50)
    .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
    .get()

  return (res.value || []).map((item: { id: string; createdDateTime?: string; fields?: Record<string, unknown> }) => {
    const f = fields(item)
    return {
      id: String(item.id),
      postId,
      text: String(f.CommentText || ''),
      authorEmail: String(f.AuthorEmail || ''),
      authorName: String(f.AuthorName || ''),
      authorAvatar: String(f.AuthorAvatar || ''),
      createdAt: item.createdDateTime || '',
    }
  })
}

export async function createStory(user: CelebrateUser, file: File): Promise<string> {
  if (isSharedMode()) return sharedCreateStory(user, file)
  if (isDemoMode()) return demoCreateStory(user, file)
  const client = graphClient()
  const siteId = await getSiteId(client)
  const listId = await getListId(client, 'CelebrateStories')
  const mediaUrl = await uploadMedia(file, 'stories')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const created = await client.api(`/sites/${siteId}/lists/${listId}/items`).post({
    fields: {
      Title: `${user.displayName} story`,
      AuthorEmail: user.email,
      AuthorName: user.displayName,
      AuthorAvatar: user.avatarUrl || '',
      MediaUrl: mediaUrl,
      ExpiresAt: expires,
    },
  })
  return String(created.id)
}

export async function fetchActiveStories(): Promise<Story[]> {
  if (isSharedMode()) return sharedFetchActiveStories()
  if (isDemoMode()) return demoFetchActiveStories()
  const client = graphClient()
  const siteId = await getSiteId(client)
  const listId = await getListId(client, 'CelebrateStories')
  const res = await client
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .expand('fields')
    .top(80)
    .orderby('createdDateTime desc')
    .header('Prefer', 'HonorNonIndexedQueriesWarningMayFailRandomly')
    .get()

  const now = Date.now()
  return (res.value || [])
    .map((item: { id: string; createdDateTime?: string; fields?: Record<string, unknown> }) => {
      const f = fields(item)
      return {
        id: String(item.id),
        authorEmail: String(f.AuthorEmail || ''),
        authorName: String(f.AuthorName || ''),
        authorAvatar: String(f.AuthorAvatar || ''),
        mediaUrl: String(f.MediaUrl || ''),
        createdAt: item.createdDateTime || '',
        expiresAt: String(f.ExpiresAt || ''),
      } as Story
    })
    .filter((s: Story) => {
      const exp = Date.parse(s.expiresAt)
      return !Number.isFinite(exp) || exp > now
    })
}
