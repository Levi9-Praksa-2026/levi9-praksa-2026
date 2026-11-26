import { Link } from 'react-router'
import type { CommunityResponse } from '@/shared/api/contracts/communities'
import { routes } from '@/shared/config/routes'
import { CommunityAvatar } from './CommunityAvatar'
import { JoinCommunityButton } from './JoinCommunityButton'

export interface CommunityListItemProps {
  community: CommunityResponse
  /** A shut-down community has no detail page and cannot be joined. */
  inactive?: boolean
}

/** One row in a community list: avatar, link (or label when inactive), member count and Join. */
export function CommunityListItem({ community, inactive = false }: CommunityListItemProps) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-bg p-card-pad">
      <CommunityAvatar name={community.name} />
      <div className="min-w-0 flex-1">
        {inactive ? (
          <span className="block truncate text-small font-medium text-ink">l/{community.name}</span>
        ) : (
          <Link to={routes.community(community.name)} className="block truncate text-small font-medium text-ink hover:text-accent">
            l/{community.name}
          </Link>
        )}
        <span className="mt-0.5 block text-label text-muted">
          {community.memberCount} member{community.memberCount === 1 ? '' : 's'}
        </span>
      </div>
      {inactive
        ? <span className="flex-none text-label text-muted">Shut down</span>
        : <JoinCommunityButton name={community.name} />}
    </li>
  )
}
