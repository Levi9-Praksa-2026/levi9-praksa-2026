import { PostFeed } from '@/features/posts/PostFeed'

/** `/`: the forum's front page, the latest posts from every community. */
export function HomePage() {
  return (
    <section aria-labelledby="home-title" className="grid gap-4">
      <h1 id="home-title" className="text-h3">Home</h1>
      <PostFeed label="Latest posts" emptyText="No posts yet. The first one will show here." />
    </section>
  )
}
