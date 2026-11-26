import { Link } from 'react-router'
import type { CommunityResponse } from '@/shared/api/contracts/communities'
import { routes } from '@/shared/config/routes'
import { CommunityAvatar } from './CommunityAvatar'
import { JoinCommunityButton } from './JoinCommunityButton'

export interface CommunityListItemProps {
  community: CommunityResponse
}

/** One row in a community list: avatar, link, member count and Join. */
export function CommunityListItem({ community }: CommunityListItemProps) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-bg p-card-pad">
      <CommunityAvatar name={community.name} />
      <div className="min-w-0 flex-1">
        <Link to={routes.community(community.name)} className="block truncate text-small font-medium text-ink hover:text-accent">
          l/{community.name}
        </Link>
        <span className="mt-0.5 block text-label text-muted">
          {community.memberCount} member{community.memberCount === 1 ? '' : 's'}
        </span>
      </div>
      <JoinCommunityButton name={community.name} />
    </li>
  )
}
