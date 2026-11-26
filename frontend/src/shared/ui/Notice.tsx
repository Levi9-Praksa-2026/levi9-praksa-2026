import type { ReactNode } from 'react'
import { CircleAlert, Info } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export interface NoticeProps {
  /** error: something failed (an alert, read at once). info: news for the user (a status, read politely). */
  tone: 'error' | 'info'
  children: ReactNode
  className?: string
}

/** A message above a form: "Invalid email or password", "Your session has ended". Blue for both, told apart by the icon. */
export function Notice({ tone, children, className }: NoticeProps) {
  const Icon = tone === 'error' ? CircleAlert : Info
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 text-small text-ink',
        tone === 'error' ? 'border-accent bg-surface' : 'border-line bg-surface',
      )}
    >
      <Icon className="mt-0.5 size-4 flex-none text-accent" aria-hidden="true" />
      <div className={cn('min-w-0', className)}>{children}</div>
    </div>
  )
}
