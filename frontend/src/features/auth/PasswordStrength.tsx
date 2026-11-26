import { useMemo } from 'react'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/lib/cn'
import { checkPassword } from './password'
import { estimatePassword, STRENGTH_LABELS } from './password-strength'

export default function PasswordStrength({ id, password, userInputs = [] }: {
  id: string
  password: string
  userInputs?: string[]
}) {
  // Serialize so changing an unrelated field doesn't restart the debounce.
  const input = JSON.stringify([password, userInputs])
  const settled = useDebouncedValue(input, 200)
  const estimate = useMemo(() => {
    const [value, personal] = JSON.parse(settled) as [string, string[]]
    return estimatePassword(value, personal)
  }, [settled])
  const pending = input !== settled
  const { longEnough, fitsLimit } = checkPassword(password)
  const strength = password && !pending && longEnough && fitsLimit ? estimate.strength : 0
  const label = !password ? '' : !longEnough ? 'Too short' : !fitsLimit ? 'Too long' : pending ? 'Checking…' : STRENGTH_LABELS[strength]
  const feedback = password && !pending && longEnough && fitsLimit
    ? [estimate.warning, ...estimate.suggestions].filter(Boolean).join(' ')
    : ''

  return (
    <div id={id} className="grid gap-2" aria-live="polite" aria-atomic="true">
      <div className="flex items-center gap-3">
        <div className="grid h-1.5 flex-1 grid-cols-4 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map(step => (
            <span key={step} className={cn('rounded-full transition-colors duration-200 motion-reduce:transition-none', step <= strength ? 'bg-accent' : 'bg-line')} />
          ))}
        </div>
        <span className="min-w-16 text-right text-label font-medium text-muted">
          <span className="sr-only">Strength: </span>{label}
        </span>
      </div>
      {feedback && <p className="text-label text-muted">{feedback}</p>}
    </div>
  )
}
