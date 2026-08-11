import type { CelebrateUser, Comment, Post, Story } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (data.error) return data.error
  } catch {
    /* ignore */
  }
  return `Request failed (${res.status})`
}

export function isSharedMode() {
  return import.meta.env.VITE_SHARED_MODE === 'true' || import.meta.env.VITE_SHARED_MODE === '1'
}

export async function sharedFetchPosts(userEmail: string): Promise<Post[]> {
  const res = await fetch(apiUrl(`/api/posts?email=${encodeURIComponent(userEmail)}`))
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { posts: Post[] }
  return data.posts || []
}

export async function sharedCreatePost(params: {
  user: CelebrateUser
  caption: string
  files: File[]
}): Promise<string> {
  const body = new FormData()
  body.set('authorEmail', params.user.email)
  body.set('authorName', params.user.displayName)
  body.set('caption', params.caption)
  for (const file of params.files.slice(0, 10)) body.append('files', file)
  const res = await fetch(apiUrl('/api/posts'), { method: 'POST', body })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { post: Post }
  return data.post.id
}

export async function sharedToggleLike(post: Post, user: CelebrateUser): Promise<Post> {
  const res = await fetch(apiUrl(`/api/posts/${encodeURIComponent(post.id)}/like`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { post: Post }
  return data.post
}

export async function sharedAddComment(postId: string, user: CelebrateUser, text: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/posts/${encodeURIComponent(postId)}/comments`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      authorEmail: user.email,
      authorName: user.displayName,
    }),
  })
  if (!res.ok) throw new Error(await readError(res))
}

export async function sharedFetchComments(postId: string): Promise<Comment[]> {
  const res = await fetch(apiUrl(`/api/posts/${encodeURIComponent(postId)}/comments`))
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { comments: Comment[] }
  return data.comments || []
}

export async function sharedCreateStory(user: CelebrateUser, file: File): Promise<string> {
  const body = new FormData()
  body.set('authorEmail', user.email)
  body.set('authorName', user.displayName)
  body.append('file', file)
  const res = await fetch(apiUrl('/api/stories'), { method: 'POST', body })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { story: Story }
  return data.story.id
}

export async function sharedFetchActiveStories(): Promise<Story[]> {
  const res = await fetch(apiUrl('/api/stories'))
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { stories: Story[] }
  return data.stories || []
}

export async function sharedSignup(params: {
  username: string
  email: string
  password: string
  displayName: string
  bio?: string
}): Promise<CelebrateUser> {
  const res = await fetch(apiUrl('/api/auth/signup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { user: CelebrateUser }
  return data.user
}

export async function sharedLogin(login: string, password: string): Promise<CelebrateUser> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { user: CelebrateUser }
  return data.user
}

export async function sharedGetProfile(
  username: string,
  viewerEmail = '',
): Promise<{ user: CelebrateUser; postsCount: number }> {
  const res = await fetch(
    apiUrl(`/api/users/${encodeURIComponent(username)}?viewer=${encodeURIComponent(viewerEmail)}`),
  )
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as { user: CelebrateUser; postsCount: number }
}

export async function sharedGetUserPosts(username: string, viewerEmail = ''): Promise<Post[]> {
  const res = await fetch(
    apiUrl(
      `/api/users/${encodeURIComponent(username)}/posts?viewer=${encodeURIComponent(viewerEmail)}`,
    ),
  )
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { posts: Post[] }
  return data.posts || []
}

export async function sharedFollow(username: string, myEmail: string): Promise<CelebrateUser> {
  const res = await fetch(apiUrl(`/api/users/${encodeURIComponent(username)}/follow`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: myEmail }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { user: CelebrateUser }
  return data.user
}

export async function sharedUpdateProfile(params: {
  email: string
  displayName?: string
  bio?: string
  avatar?: File | null
}): Promise<CelebrateUser> {
  const body = new FormData()
  body.set('email', params.email)
  if (params.displayName) body.set('displayName', params.displayName)
  if (typeof params.bio === 'string') body.set('bio', params.bio)
  if (params.avatar) body.append('avatar', params.avatar)
  const res = await fetch(apiUrl('/api/users/me'), { method: 'PATCH', body })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { user: CelebrateUser }
  return data.user
}

