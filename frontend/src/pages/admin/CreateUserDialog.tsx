import { useId, useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PasswordField, PasswordRules } from '@/features/auth/PasswordField'
import { checkPassword } from '@/features/auth/password'
import { isEmail } from '@/features/auth/messages'
import { adminApi } from '@/shared/api/admin'
import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, USERNAME_PATTERN, type RegisterRequest } from '@/shared/api/contracts/auth'
import type { UserProfileResponse } from '@/shared/api/contracts/users'
import { isApiError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Notice } from '@/shared/ui/Notice'
import { TextField } from '@/shared/ui/TextField'
import { adminError } from './errors'

type Form = RegisterRequest & { confirmPassword: string }
type Errors = Partial<Record<keyof Form, string>>
const FIELDS: readonly (keyof Form)[] = ['email', 'username', 'firstName', 'lastName', 'password', 'confirmPassword']

export function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (user: UserProfileResponse) => void }) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<Form>({ email: '', username: '', firstName: '', lastName: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Errors>({})
  function focusFirst(found: Errors) {
    const first = FIELDS.find(field => found[field])
    if (first) formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
  }
  const create = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: onCreated,
    onError: error => {
      const found: Errors = {}
      if (isApiError(error)) {
        if (error.errorType === 'USERNAME_TAKEN') found.username = 'This username is taken. Try another one.'
        for (const issue of error.errors) {
          if (FIELDS.includes(issue.field as keyof Form)) found[issue.field as keyof Form] ??= issue.message
        }
      }
      setErrors(found)
      // Disabled fields are re-enabled when React renders the failed mutation state.
      requestAnimationFrame(() => focusFirst(found))
    },
  })
  function set(field: keyof Form, value: string) {
    setForm(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: undefined, ...(field === 'password' && { confirmPassword: undefined }) }))
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = { ...form, email: form.email.trim(), username: form.username.trim(), firstName: form.firstName.trim(), lastName: form.lastName.trim() }
    const found: Errors = {}
    if (!isEmail(values.email) || values.email.length > EMAIL_MAX_LENGTH) found.email = 'Enter a valid email address.'
    if (!USERNAME_PATTERN.test(values.username)) found.username = 'Use 3 to 30 letters, digits or underscores.'
    if (!values.firstName) found.firstName = 'Enter a first name.'
    if (!values.lastName) found.lastName = 'Enter a last name.'
    const password = checkPassword(values.password)
    if (!password.longEnough) found.password = 'Use at least 12 characters.'
    else if (!password.fitsLimit) found.password = 'Too long: at most 72 bytes.'
    if (!values.confirmPassword) found.confirmPassword = 'Type the password again.'
    else if (values.password !== values.confirmPassword) found.confirmPassword = "The passwords don't match."
    setErrors(found)
    if (Object.keys(found).length) { focusFirst(found); return }
    const { confirmPassword: _confirmation, ...request } = values
    create.mutate(request)
  }
  return <Modal title="Create user" onClose={onClose} busy={create.isPending} size="lg">
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-5">
      <p className="text-small text-muted">Create an account for a colleague.</p>
      {create.isError && !Object.values(errors).some(Boolean) && <Notice tone="error">{adminError(create.error)}</Notice>}
      <fieldset disabled={create.isPending} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <TextField label="Email" name="email" type="email" autoComplete="off" value={form.email} onChange={event => set('email', event.target.value)} maxLength={EMAIL_MAX_LENGTH} error={errors.email} />
        <TextField label="Username" name="username" autoComplete="off" autoCapitalize="none" spellCheck={false} value={form.username} onChange={event => set('username', event.target.value)} maxLength={30} hint="3 to 30 letters, digits or underscores." error={errors.username} />
        <TextField label="First name" name="firstName" value={form.firstName} onChange={event => set('firstName', event.target.value)} maxLength={NAME_MAX_LENGTH} error={errors.firstName} />
        <TextField label="Last name" name="lastName" value={form.lastName} onChange={event => set('lastName', event.target.value)} maxLength={NAME_MAX_LENGTH} error={errors.lastName} />
        <PasswordField name="password" autoComplete="new-password" value={form.password} onChange={value => set('password', value)} userInputs={[form.email, form.username, form.firstName, form.lastName]} rulesId={`${id}-rules`} error={errors.password} />
        <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" showStrength={false} value={form.confirmPassword} onChange={value => set('confirmPassword', value)} error={errors.confirmPassword} />
        <div className="sm:col-span-2"><PasswordRules id={`${id}-rules`} password={form.password} /></div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4 sm:col-span-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{create.isPending ? 'Creating…' : 'Create user'}</Button></div>
      </fieldset>
    </form>
  </Modal>
}
