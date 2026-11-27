import { PostCard, PostCardSkeleton } from '@/features/posts/PostCard'
import type { ProfileOverviewResponse } from '@/shared/api/contracts/profile'
import { EditProfileName } from './EditProfileName'
import { useMyPosts } from './useMyPosts'

/** The profile: who you are and the posts you wrote, as post cards. */
export function ProfileOverview({ profile }: { profile: ProfileOverviewResponse }) {
  const posts = useMyPosts(profile.id)
  const recentPosts = posts.data ?? []

  return (
    <section aria-labelledby="profile-title" className="grid gap-card-gap">
      <header className="rounded-lg border border-line bg-bg p-card-pad">
        <EditProfileName username={profile.username} firstName={profile.firstName} lastName={profile.lastName} />
      </header>

      <nav aria-label="Profile sections">
        <span aria-current="page" className="inline-flex h-btn items-center rounded-btn bg-surface px-4 text-small font-semibold text-ink">
          Overview
        </span>
      </nav>

      <section aria-labelledby="profile-posts-title">
        <h2 id="profile-posts-title" className="text-lead font-semibold">Recent posts</h2>
        {posts.isPending ? (
          <div aria-busy="true" aria-label="Loading posts" className="mt-2 grid gap-3">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : posts.error ? (
          <div className="mt-2 rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
            <h3 className="text-h3">Couldn't load your posts</h3>
            <p className="mt-2 text-small text-muted">Check your connection and try again.</p>
            <button type="button" onClick={() => void posts.refetch()} className="mt-4 cursor-pointer text-small font-medium text-accent underline underline-offset-2">
              Try again
            </button>
          </div>
        ) : recentPosts.length === 0 ? (
          <p className="mt-2 text-small text-muted">You haven't written a post yet.</p>
        ) : (
          <ul aria-label="Your posts" className="mt-2 grid gap-3">
            {recentPosts.map(post => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
