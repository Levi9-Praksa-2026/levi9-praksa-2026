import { Section, SectionHead } from '@/shared/ui/Section'
import type { Community, Post } from '@/features/posts/types'
import '@/pages/welcome/sections/communities.css'

export interface CommunitiesProps {
  title: string
  lead: string
  communities: readonly Community[]
  /** Sample posts; each row shows its community's first one as what is hot there. */
  posts: readonly Post[]
  /** Where a row leads: joining means registering first. */
  joinHref: string
}

/**
 * The communities as a directory, one ruled row each, like an index page: the name set large, what it is
 * for, and the post that is hot there now. No boxes. A row is a link to register and join.
 */
export function Communities({ title, lead, communities, posts, joinHref }: CommunitiesProps) {
  return (
    <Section id="communities" screens={1}>
      <SectionHead title={title} lead={lead} />
      <ul className="lv-dir">
        {communities.map(c => {
          const hot = posts.find(p => p.community === c.slug)
          return (
            <li key={c.slug}>
              <a className="lv-dir__row" href={joinHref} aria-label={`Register to join l/${c.slug}`}>
                <span className="lv-dir__name">
                  <span className="lv-dir__l">l/</span>
                  {c.slug}
                </span>
                <span className="lv-dir__blurb">{c.blurb}</span>
                {hot && (
                  <span className="lv-dir__hot">
                    <span className="lv-dir__votes">▲ {hot.votes}</span>
                    <span className="lv-dir__title">{hot.title}</span>
                    <span className="lv-dir__meta">
                      {hot.office} · {hot.replies} replies
                    </span>
                  </span>
                )}
                <span className="lv-dir__go" aria-hidden="true">
                  <svg viewBox="0 0 20 20">
                    <path d="M5 10h10M11 5.5 15.5 10 11 14.5" />
                  </svg>
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
