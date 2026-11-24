import { cn } from '@/shared/lib/cn'

export interface CommunityAvatarProps {
  name: string
  /** sm: lists and the collapsed sidebar. md: headers. */
  size?: 'sm' | 'md'
  className?: string
}

/** A community's icon. There are no community images yet, so it is the first letter on the brand blue. */
export function CommunityAvatar({ name, size = 'sm', className }: CommunityAvatarProps) {
  return (
    <span
      className={cn(
        'inline-grid flex-none place-items-center rounded-full bg-accent font-semibold text-accent-ink uppercase',
        size === 'sm' ? 'size-7 text-label' : 'size-12 text-lead',
        className,
      )}
      aria-hidden="true"
    >
      {name.charAt(0)}
    </span>
  )
}
