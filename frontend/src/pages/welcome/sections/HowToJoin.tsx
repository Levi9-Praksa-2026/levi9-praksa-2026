import { Section, SectionHead } from '@/shared/ui/Section'
import { PostCard } from '@/features/posts/PostCard'
import { ReplyCard } from '@/features/posts/ReplyCard'
import type { Post, Reply } from '@/features/posts/types'

export interface JoinStep {
  id: string
  title: string
  body: string
}

export interface HowToJoinProps {
  title: string
  steps: readonly JoinStep[]
  /** The thread shown beside the steps: a post and its replies from other offices. */
  post: Post
  replies: readonly Reply[]
}

/** Three ruled steps with large numerals on the left; on the right, a render of a thread in the app's own cards. */
export function HowToJoin({ title, steps, post, replies }: HowToJoinProps) {
  return (
    <Section id="join" screens={1} ground="surface">
      <SectionHead title={title} />
      <div className="lv-join grid ui-grid">
        <ol className="lv-join__steps span-5">
          {steps.map((s, i) => (
            <li key={s.id} className="lv-join__step">
              <span className="lv-join__num" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="lv-join__title">{s.title}</h3>
                <p className="lv-join__body">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="lv-thread span-6 start-7" data-ui="">
          <PostCard post={post} />
          <div className="lv-thread__replies">
            {replies.map(r => (
              <ReplyCard key={r.id} reply={r} />
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}
