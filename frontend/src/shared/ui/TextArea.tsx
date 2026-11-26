import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'children'> {
  /** The label; may hold a muted "(optional)". */
  label: ReactNode
  /** Guidance shown below the field. */
  hint?: string
  className?: string
}

/** A labelled multi-line field, styled like TextField. It grows by hand (resize), not by itself. */
export function TextArea({ label, hint, className, id, rows = 8, ...textarea }: TextAreaProps) {
  const fallbackId = useId()
  const fieldId = id ?? fallbackId
  const hintId = `${fieldId}-hint`
  const describedBy = [hint ? hintId : null, textarea['aria-describedby']].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className="text-small font-medium text-ink">{label}</label>
      <textarea
        {...textarea}
        id={fieldId}
        rows={rows}
        aria-describedby={describedBy}
        className="min-h-32 w-full min-w-0 resize-y rounded-md border border-line-strong bg-bg px-4 py-3 text-body text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent"
      />
      {hint && <p id={hintId} className="text-label text-muted">{hint}</p>}
    </div>
  )
}