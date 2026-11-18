import { Hero as HeroShell } from '@/shared/ui/hero/Hero'
import { HeroTitle } from '@/shared/ui/hero/HeroTitle'
import { ButtonRow } from '@/shared/ui/Button'
import type { ActionItem } from '@/shared/ui/types'
import { lazy, Suspense } from 'react'
import type { GlobePlace } from '@/features/offices/OfficeGlobe'
import { PostCard } from '@/features/posts/PostCard'
import type { Post } from '@/features/posts/types'

export interface HeroProps {
  kicker: string
  title: string
  lead: string
  /** The offices labelled on the globe. */
  places: readonly GlobePlace[]
  focus: { lat: number; lng: number }
  globeLabel: string
  /** The sample post rendered over the globe panel's corner. */
  post: Post
  register: ActionItem
  login: ActionItem
}

/** three.js and the globe load after the words, in their own chunk. */
const OfficeGlobe = lazy(() => import('@/features/offices/OfficeGlobe').then(m => ({ default: m.OfficeGlobe })))

/** The chosen split hero: the words on five columns, the 3D office globe on six. */
export function Hero({ kicker, title, lead, places, focus, globeLabel, post, register, login }: HeroProps) {
  return (
    <HeroShell variant="split">
      <div className="wrap">
        <div className="hero-text grid ui-grid hero__grid">
          <div className="hero__text span-5">
            <p className="hero__kicker">
              <span className="dot" aria-hidden="true" />
              {kicker}
            </p>
            <HeroTitle>{title}</HeroTitle>
            <p className="hero__lead">{lead}</p>
            <ButtonRow primary={register} secondary={login} arrow size="hero" className="mt-8"
              primaryClassName="shadow-[0_14px_30px_-12px_rgb(43_63_160/0.7)] hover:shadow-[0_20px_38px_-14px_rgb(43_63_160/0.8)]" />
          </div>
          <div className="hero__media lv-globe-panel span-6 start-7">
            <Suspense fallback={<div className="og" role="img" aria-label={globeLabel} />}>
              <OfficeGlobe places={places} focus={focus} label={globeLabel} />
            </Suspense>
            <div className="ly-float">
              <PostCard post={post} />
            </div>
          </div>
        </div>
      </div>
    </HeroShell>
  )
}
