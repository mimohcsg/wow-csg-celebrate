import type { AdminInsights, CelebrateUser, Comment, Post, Story } from '../types'

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

async function fileToBase64Payload(file: File): Promise<{
  name: string
  type: string
  data: string
}> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
  return {
    name: file.name || 'upload.bin',
    type: file.type || 'application/octet-stream',
    data: btoa(binary),
  }
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
  const files = []
  for (const file of params.files.slice(0, 10)) {
    files.push(await fileToBase64Payload(file))
  }
  const res = await fetch(apiUrl('/api/posts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authorEmail: params.user.email,
      authorName: params.user.displayName,
      caption: params.caption,
      files,
    }),
  })
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
  const payload = await fileToBase64Payload(file)
  const res = await fetch(apiUrl('/api/stories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      authorEmail: user.email,
      authorName: user.displayName,
      file: payload,
    }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { story: Story }
  return data.story.id
}

export async function sharedFetchActiveStories(viewerEmail = ''): Promise<Story[]> {
  const q = viewerEmail ? `?viewer=${encodeURIComponent(viewerEmail)}` : ''
  const res = await fetch(apiUrl(`/api/stories${q}`))
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { stories: Story[] }
  return data.stories || []
}

export async function sharedLikeStory(storyId: string, email: string): Promise<Story> {
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/like`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { story: Story }
  return data.story
}

export async function sharedViewStory(storyId: string, email: string): Promise<Story> {
  const res = await fetch(apiUrl(`/api/stories/${encodeURIComponent(storyId)}/view`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { story: Story }
  return data.story
}

export async function sharedAdminInsights(email: string): Promise<AdminInsights> {
  const res = await fetch(apiUrl(`/api/admin/insights?email=${encodeURIComponent(email)}`))
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as AdminInsights
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
  const body: Record<string, unknown> = { email: params.email }
  if (params.displayName) body.displayName = params.displayName
  if (typeof params.bio === 'string') body.bio = params.bio
  if (params.avatar) body.avatar = await fileToBase64Payload(params.avatar)
  const res = await fetch(apiUrl('/api/users/me'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as { user: CelebrateUser }
  return data.user
}

export async function sharedDeletePost(postId: string, email: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/posts/${encodeURIComponent(postId)}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(await readError(res))
}

export async function sharedChangePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(apiUrl('/api/auth/change-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, currentPassword, newPassword }),
  })
  if (!res.ok) throw new Error(await readError(res))
}


