export type MediaItem = {
  url: string
  type: 'image' | 'video'
}

export type CelebrateUser = {
  id: string
  email: string
  displayName: string
  avatarUrl: string
  username?: string
  bio?: string
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
  isAdmin?: boolean
  createdAt?: string
}

export type Post = {
  id: string
  caption: string
  authorEmail: string
  authorName: string
  authorUsername?: string
  authorAvatar: string
  media: MediaItem[]
  likeCount: number
  commentCount: number
  hashtags: string[]
  createdAt: string
  likedByMe?: boolean
}

export type Story = {
  id: string
  authorEmail: string
  authorName: string
  authorAvatar: string
  mediaUrl: string
  createdAt: string
  expiresAt: string
  likeCount?: number
  viewCount?: number
  likedByMe?: boolean
}

export type AdminInsights = {
  summary: {
    users: number
    posts: number
    stories: number
    postLikes: number
    storyLikes: number
    storyViews: number
  }
  topPosts: Array<{
    id: string
    caption: string
    authorName: string
    authorEmail: string
    likeCount: number
    commentCount: number
    createdAt: string
    mediaUrl: string
  }>
  topStoriesByViews: Story[]
  topStoriesByLikes: Story[]
}

export type Comment = {
  id: string
  postId: string
  text: string
  authorEmail: string
  authorName: string
  authorAvatar: string
  createdAt: string
}
