import { useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export function TextArea({ label, hint, className, id, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const fallback = useId()
  const fieldId = id ?? fallback
  return (
    <div className={cn('grid min-w-0 gap-1.5', className)}>
      <label htmlFor={fieldId} className="text-small font-medium">{label}</label>
      <textarea {...props} id={fieldId} aria-describedby={hint ? `${fieldId}-hint` : undefined} className="min-h-32 w-full min-w-0 resize-y rounded-md border border-line-strong bg-bg px-4 py-3 text-body text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
      {hint && <p id={`${fieldId}-hint`} className="text-label text-muted">{hint}</p>}
    </div>
  )
}
