import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'children'> {
  /** The label; may hold a muted "(optional)". */
  label: ReactNode
  className?: string
}

/** A labelled multi-line field, styled like TextField. It grows by hand (resize), not by itself. */
export function TextArea({ label, className, id, rows = 8, ...textarea }: TextAreaProps) {
  const fallbackId = useId()
  const fieldId = id ?? fallbackId
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className="text-small font-medium text-ink">{label}</label>
      <textarea
        id={fieldId}
        rows={rows}
        {...textarea}
        className="min-h-32 resize-y rounded-md border border-line-strong bg-bg px-4 py-3 text-body text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </div>
  )
}
