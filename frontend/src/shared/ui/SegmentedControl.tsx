import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/** Native radio semantics provide arrow-key selection, one tab stop and a visible focus ring. */
export function SegmentedControl<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: readonly { value: T; label: string; icon?: ReactNode }[]
  onChange: (value: T) => void
}) {
  const name = useId()
  return <fieldset className="min-w-0 max-sm:w-full">
    <legend className="mb-2 text-label font-medium text-muted">{label}</legend>
    <div className="flex rounded-btn border border-line bg-surface p-1">
      {options.map(option => <label key={option.value} className="relative min-w-0 flex-auto cursor-pointer">
        <input type="radio" name={name} value={option.value} checked={option.value === value} onChange={() => onChange(option.value)} className="peer sr-only" />
        <span className={cn(
          'flex min-h-9 items-center justify-center gap-2 rounded-btn px-3 [&>svg]:shrink-0 text-small font-medium whitespace-nowrap text-muted transition-colors hover:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          option.value === value && 'bg-bg text-accent shadow-sm',
        )}>{option.icon}{option.label}</span>
      </label>)}
    </div>
  </fieldset>
}
