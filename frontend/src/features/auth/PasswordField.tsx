import { useId, useState, type Ref } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '@/shared/api/contracts/auth'
import { cn } from '@/shared/lib/cn'
import { TextField } from '@/shared/ui/TextField'
import { checkPassword, STRENGTH_LABELS } from './password'

export interface PasswordFieldProps {
  id?: string
  label?: string
  name?: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  /** new-password: sign-up (shows the strength). current-password: sign-in. */
  autoComplete: 'new-password' | 'current-password'
  /** The strength bar under the field. On for a new password, unless turned off (its confirmation). */
  showStrength?: boolean
  /** The id of the rules for this password (`PasswordRules`) when they sit elsewhere, so they are read with it. */
  rulesId?: string
  autoFocus?: boolean
  ref?: Ref<HTMLInputElement>
}

/** A password input with a show/hide button; on sign-up also a strength bar under it. */
export function PasswordField({ id, label = 'Password', name = 'password', value, onChange, error, autoComplete, showStrength, rulesId, autoFocus, ref }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const strengthId = useId()
  const isNew = showStrength ?? autoComplete === 'new-password'

  return (
    <TextField
      ref={ref}
      id={id}
      label={label}
      type={visible ? 'text' : 'password'}
      name={name}
      autoComplete={autoComplete}
      // oxlint-disable-next-line jsx-a11y/no-autofocus -- passed through: the caller decides
      autoFocus={autoFocus}
      spellCheck={false}
      autoCapitalize="none"
      value={value}
      onChange={e => onChange(e.target.value)}
      error={error}
      aria-describedby={[isNew ? strengthId : null, rulesId].filter(Boolean).join(' ') || undefined}
      trailing={
        <button
          type="button"
          className="mr-1 grid size-10 flex-none cursor-pointer place-items-center rounded-sm text-muted hover:bg-surface hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible(v => !v)}
        >
          {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
        </button>
      }
      below={isNew ? <PasswordStrength id={strengthId} password={value} /> : undefined}
    />
  )
}

/** A blue bar that fills with the strength, and its word. */
function PasswordStrength({ id, password }: { id: string; password: string }) {
  const { strength } = checkPassword(password)
  return (
    <div id={id} className="flex items-center gap-3">
      <div className="grid h-1.5 flex-1 grid-cols-4 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map(step => (
          <span
            key={step}
            className={cn('rounded-full transition-colors duration-200 motion-reduce:transition-none', step <= strength ? 'bg-accent' : 'bg-line')}
          />
        ))}
      </div>
      <span className="w-16 text-right text-label font-medium text-muted">
        <span className="sr-only">Strength: </span>
        {password ? STRENGTH_LABELS[strength] : ''}
      </span>
    </div>
  )
}

/**
 * The rule the backend checks, ticked off as it is met, and a tip. Sign-up shows it after the confirmation,
 * so both password fields come first; the password field lists its id (`rulesId`) so it is read with it.
 */
export function PasswordRules({ id, password }: { id: string; password: string }) {
  const { longEnough, fitsLimit } = checkPassword(password)
  return (
    <ul id={id} className="grid gap-1 text-label">
      <li className={cn('flex items-center gap-1.5', longEnough ? 'text-ink' : 'text-muted')}>
        <Check className={cn('size-3.5 flex-none', longEnough ? 'text-accent' : 'opacity-40')} aria-hidden="true" />
        At least {PASSWORD_MIN_LENGTH} characters
        <span className="sr-only">{longEnough ? ' (met)' : ' (not met yet)'}</span>
      </li>
      {!fitsLimit && (
        <li className="flex items-center gap-1.5 font-medium text-accent">
          <Check className="size-3.5 flex-none opacity-40" aria-hidden="true" />
          At most {PASSWORD_MAX_BYTES} bytes: shorten it, or use fewer special letters and emoji
        </li>
      )}
      <li className="text-muted">A few unrelated words make a strong, easy-to-remember password.</li>
    </ul>
  )
}
