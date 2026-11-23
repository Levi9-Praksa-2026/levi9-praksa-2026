import { cn } from '@/shared/lib/cn'
import { initials } from '@/shared/lib/initials'

export interface UserAvatarProps {
  username: string
  className?: string
}

/** A person's initials in a tinted circle (profile pictures come later). Decorative: the name is always written next to it. */
export function UserAvatar({ username, className }: UserAvatarProps) {
  return (
    <span
      className={cn('inline-grid size-8 flex-none place-items-center rounded-full bg-surface text-label font-semibold text-accent', className)}
      aria-hidden="true"
    >
      {initials(username)}
    </span>
  )
}
