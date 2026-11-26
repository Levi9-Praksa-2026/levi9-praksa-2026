import type { ProfileOverviewResponse } from '@/shared/api/contracts/profile'
import { EditProfileName } from './EditProfileName'
import { relativeTime } from './relativeTime'

const count = (n: number, word: string, plural = `${word}s`) => `${n} ${n === 1 ? word : plural}`

/** The profile: who you are and the posts you wrote, as plain text (no PostCard, no communities list). */
export function ProfileOverview({ profile }: { profile: ProfileOverviewResponse }) {
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
        {profile.recentPosts.length === 0 ? (
          <p className="mt-2 text-small text-muted">You haven't written a post yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {profile.recentPosts.map(post => (
              <li key={post.id} className="py-3">
                <h3 className="text-ui font-medium text-ink">{post.title}</h3>
                <p className="mt-1 text-small text-muted">
                  l/{post.communityName} · {relativeTime(post.createdAt)} · {count(post.score, 'point')} · {count(post.commentCount, 'comment')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
