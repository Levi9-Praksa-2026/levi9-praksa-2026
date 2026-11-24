import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { login } from '@/shared/api/auth'
import { EMAIL_MAX_LENGTH } from '@/shared/api/contracts/auth'
import { isApiError } from '@/shared/api/errors'
import { PasswordField } from '@/features/auth/PasswordField'
import { authErrorMessage, isEmail, signUpHref } from '@/features/auth/messages'
import { Button } from '@/shared/ui/Button'
import { AppLink } from '@/shared/ui/Link'
import { Notice } from '@/shared/ui/Notice'
import { TextField } from '@/shared/ui/TextField'

const LINK = 'font-medium text-accent underline underline-offset-[3px] hover:no-underline'

/**
 * `/signin`: email and password. auth-service sends the browser here during "Log in"; the gateway adds
 * `?error=session-ended` when a login could not be finished, and sign-up adds `?created` (and `?email=`)
 * when it created the account but could not log in. The backend never says whether an email has an
 * account (on purpose), so a wrong password and an unknown email get the same answer, with a way to sign up.
 */
export function SignInPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const signIn = useMutation({
    mutationFn: login,
    // a page load: the rest of the OAuth login happens in the address bar, and ends on / logged in
    onSuccess: ({ redirectUrl }) => window.location.assign(redirectUrl),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    const value = email.trim()
    const found = {
      email: !value ? 'Enter your email' : isEmail(value) ? undefined : 'Enter an email like name@levi9.com',
      password: password ? undefined : 'Enter your password',
    }
    setErrors(found)
    if (found.email) return document.getElementById('signin-email')?.focus()
    if (found.password) return document.getElementById('signin-password')?.focus()
    setEmail(value)
    signIn.mutate({ email: value, password })
  }

  const wrongPassword = isApiError(signIn.error) && signIn.error.status === 401
  const busy = signIn.isPending || signIn.isSuccess

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <h1 className="text-h3">Log in</h1>
        <p className="text-body text-muted">Welcome back to Levddit.</p>
      </div>

      {params.get('error') === 'session-ended' && !signIn.error && (
        <Notice tone="info">Your session has ended, please log in again.</Notice>
      )}
      {params.has('created') && !signIn.error && (
        <Notice tone="info">Your account is ready. Log in to continue.</Notice>
      )}
      {signIn.error && (
        <Notice tone="error">
          {authErrorMessage(signIn.error, 'login')}
          {wrongPassword && (
            <>
              {' '}New here? <AppLink className={LINK} href={signUpHref(email)}>Create an account</AppLink>
            </>
          )}
        </Notice>
      )}

      <form className="grid gap-5" onSubmit={submit} noValidate>
        <TextField
          id="signin-email"
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          inputMode="email"
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the page's only task; the field a user would click first
          autoFocus={!email}
          maxLength={EMAIL_MAX_LENGTH}
          value={email}
          onChange={e => {
            setEmail(e.target.value)
            setErrors(found => ({ ...found, email: undefined }))
          }}
          error={errors.email}
        />
        <PasswordField
          id="signin-password"
          autoComplete="current-password"
          // oxlint-disable-next-line jsx-a11y/no-autofocus -- the email came filled in (from sign-up): the password is next
          autoFocus={!!email}
          value={password}
          onChange={value => {
            setPassword(value)
            setErrors(found => ({ ...found, password: undefined }))
          }}
          error={errors.password}
        />
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</Button>
      </form>

      <p className="text-center text-small text-muted">
        New to Levddit? <AppLink className={LINK} href={signUpHref(email)}>Create an account</AppLink>
      </p>
    </div>
  )
}
