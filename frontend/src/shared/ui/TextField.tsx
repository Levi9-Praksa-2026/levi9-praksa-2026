import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'children'> {
  label: string
  /** What is wrong with the value. Shown in the accent blue with an icon, and read with the field. */
  error?: string | null
  /** A short rule under the field, read with it ("3 to 30 letters, digits or underscores"). */
  hint?: ReactNode
  /** Inside the box after the input: the password's show button. */
  trailing?: ReactNode
  /** Under the field, after the error: the password's strength. Give it an id and list it in aria-describedby. */
  below?: ReactNode
  ref?: Ref<HTMLInputElement>
  className?: string
}

/**
 * A labelled input. The error is blue like the rest of the brand, so it never relies on colour: it has an
 * icon, sits right under its field, and the field is marked invalid and described by it.
 */
export function TextField({ label, error, hint, trailing, below, className, id, ref, ...input }: TextFieldProps) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null, input['aria-describedby']].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-small font-medium text-ink">{label}</label>
      <div
        className={cn(
          'flex h-12 items-center rounded-md border border-line-strong bg-bg focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
          error && 'border-accent bg-surface',
        )}
      >
        <input
          ref={ref}
          id={inputId}
          {...input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full w-0 min-w-0 flex-1 rounded-md bg-transparent px-4 text-body text-ink outline-none placeholder:text-muted"
        />
        {trailing}
      </div>
      {error && (
        <p id={errorId} className="flex items-start gap-1.5 text-small font-medium text-accent">
          <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
          {error}
        </p>
      )}
      {hint && <p id={hintId} className="text-label text-muted">{hint}</p>}
      {below}
    </div>
  )
}
