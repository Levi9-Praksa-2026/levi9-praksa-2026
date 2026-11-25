import { useId, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { login, register } from '@/shared/api/auth'
import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_PATTERN, type RegisterRequest } from '@/shared/api/contracts/auth'
import { isApiError } from '@/shared/api/errors'
import { routes } from '@/shared/config/routes'
import { checkPassword } from '@/features/auth/password'
import { PasswordField, PasswordRules } from '@/features/auth/PasswordField'
import { authErrorMessage, isEmail } from '@/features/auth/messages'
import { Button } from '@/shared/ui/Button'
import { AppLink } from '@/shared/ui/Link'
import { Notice } from '@/shared/ui/Notice'
import { TextField } from '@/shared/ui/TextField'

/** The form: what the backend takes, plus the password typed again (checked here, never sent). */
type Form = RegisterRequest & { confirmPassword: string }
type Field = keyof Form
type Errors = Partial<Record<Field, string>>

/** The order the fields are on the page, so the first wrong one gets the focus. */
const FIELDS: readonly Field[] = ['email', 'username', 'firstName', 'lastName', 'password', 'confirmPassword']

const LINK = 'font-medium text-accent underline underline-offset-[3px] hover:no-underline'

/** The backend's rules, checked before sending so most mistakes never need a round trip. */
function validate(form: Form): Errors {
  const errors: Errors = {}
  if (!form.email) errors.email = 'Enter your email'
  else if (!isEmail(form.email)) errors.email = 'Enter an email like name@levi9.com'
  if (!USERNAME_PATTERN.test(form.username)) errors.username = 'Use 3 to 30 letters, digits or underscores'
  if (!form.firstName) errors.firstName = 'Enter your first name'
  if (!form.lastName) errors.lastName = 'Enter your last name'
  const password = checkPassword(form.password)
  if (!password.longEnough) errors.password = 'Use at least 12 characters'
  else if (!password.fitsLimit) errors.password = 'Too long: at most 72 bytes'
  if (!form.confirmPassword) errors.confirmPassword = 'Type your password again'
  else if (form.confirmPassword !== form.password) errors.confirmPassword = "The passwords don't match"
  return errors
}

/** A 400's field errors from the backend ("must be 3 to 30…"), as sentences on the right fields. */
function fieldErrorsFrom(error: unknown): Errors {
  if (!isApiError(error)) return {}
  if (error.errorType === 'USERNAME_TAKEN') return { username: 'This username is taken. Try another one.' }
  const errors: Errors = {}
  for (const { field, message } of error.errors) {
    if ((FIELDS as readonly string[]).includes(field)) errors[field as Field] ??= message.charAt(0).toUpperCase() + message.slice(1)
  }
  return errors
}

/**
 * `/signup?email=`: create an account, then log straight in with the same email and password. If that login
 * fails, the account still exists: go to sign-in with "Your account is ready".
 */
export function SignUpPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const id = useId()
  const [form, setForm] = useState<Form>({ email: params.get('email') ?? '', username: '', firstName: '', lastName: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Errors>({})

  const signUp = useMutation({
    mutationFn: async (request: RegisterRequest) => {
      await register(request)
      try {
        return await login({ email: request.email, password: request.password })
      } catch {
        return null
      }
    },
    onSuccess: (next, request) => {
      if (next) window.location.assign(next.redirectUrl)
      else navigate(`${routes.signIn}?${new URLSearchParams({ created: '', email: request.email })}`)
    },
    onError: error => {
      const fromServer = fieldErrorsFrom(error)
      setErrors(fromServer)
      focusFirst(fromServer)
    },
  })

  function focusFirst(found: Errors) {
    const first = FIELDS.find(field => found[field])
    if (first) document.getElementById(`${id}-${first}`)?.focus()
  }

  function set(field: Field, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    // a new password can make the confirmation right or wrong again, so its message goes too
    setErrors(e => ({ ...e, [field]: undefined, ...(field === 'password' && { confirmPassword: undefined }) }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = { ...form, email: form.email.trim(), username: form.username.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim() }
    const found = validate(trimmed)
    setErrors(found)
    if (Object.keys(found).length) return focusFirst(found)
    const { confirmPassword: _confirm, ...request } = trimmed
    signUp.mutate(request)
  }

  // a general message only when no field shows what went wrong
  const general = signUp.error && !Object.values(errors).some(Boolean) ? authErrorMessage(signUp.error, 'register') : null
  const busy = signUp.isPending || signUp.isSuccess

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-h3">Create your account</h1>
        <p className="text-body text-muted">One account for every Levi9 office's communities.</p>
      </div>

      {general && <Notice tone="error">{general}</Notice>}

      <form className="grid gap-5" onSubmit={submit} noValidate>
        <TextField
          id={`${id}-email`}
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the page's only task: the first empty field gets the focus
          autoFocus={!form.email}
          maxLength={EMAIL_MAX_LENGTH}
          value={form.email}
          onChange={e => set('email', e.target.value)}
          error={errors.email}
        />
        <TextField
          id={`${id}-username`}
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the email came filled in from sign-in, so the next field
          autoFocus={!!form.email}
          maxLength={30}
          value={form.username}
          onChange={e => set('username', e.target.value)}
          error={errors.username}
          hint="Shown on your posts. 3 to 30 letters, digits or underscores."
        />
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
          <TextField
            id={`${id}-firstName`}
            label="First name"
            name="given-name"
            autoComplete="given-name"
            maxLength={NAME_MAX_LENGTH}
            value={form.firstName}
            onChange={e => set('firstName', e.target.value)}
            error={errors.firstName}
          />
          <TextField
            id={`${id}-lastName`}
            label="Last name"
            name="family-name"
            autoComplete="family-name"
            maxLength={NAME_MAX_LENGTH}
            value={form.lastName}
            onChange={e => set('lastName', e.target.value)}
            error={errors.lastName}
          />
        </div>
        <PasswordField
          id={`${id}-password`}
          rulesId={`${id}-rules`}
          userInputs={[form.username, form.email, form.firstName, form.lastName]}
          autoComplete="new-password"
          value={form.password}
          onChange={value => set('password', value)}
          error={errors.password}
        />
        <PasswordField
          id={`${id}-confirmPassword`}
          label="Confirm password"
          name="confirm-password"
          autoComplete="new-password"
          showStrength={false}
          value={form.confirmPassword}
          onChange={value => set('confirmPassword', value)}
          error={errors.confirmPassword}
        />
        <PasswordRules id={`${id}-rules`} password={form.password} />
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</Button>
      </form>

      <p className="text-center text-small text-muted">
        Already have an account? <AppLink className={LINK} href={routes.login}>Log in</AppLink>
      </p>
    </div>
  )
}
