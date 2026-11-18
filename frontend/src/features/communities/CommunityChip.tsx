import type { Community } from '@/features/posts/types'
import '@/features/communities/communities.css'

export interface CommunityChipProps {
  community: Pick<Community, 'slug'>
  className?: string
}

/** The "l/slug" label of a community, the same wherever a post or a list names it. */
export function CommunityChip({ community, className }: CommunityChipProps) {
  return <span className={className ? `lv-chip ${className}` : 'lv-chip'}>l/{community.slug}</span>
}
