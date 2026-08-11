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
