import { useRef, useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isEmail } from '@/features/auth/messages'
import { adminApi, type AdminUser, type AdminUpdateUserRequest } from '@/shared/api/admin'
import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH } from '@/shared/api/contracts/auth'
import type { UserProfileResponse } from '@/shared/api/contracts/users'
import { isApiError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Notice } from '@/shared/ui/Notice'
import { TextField } from '@/shared/ui/TextField'
import { UserProfileContent } from './UserProfileContent'
import { adminError } from './errors'

type Field = keyof AdminUpdateUserRequest
const FIELDS: readonly Field[] = ['firstName', 'lastName', 'email']

export function EditUserDialog({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: (user: UserProfileResponse) => void }) {
  const ref = useRef<HTMLFormElement>(null)
  const [form, setForm] = useState<AdminUpdateUserRequest>({ firstName: user.firstName, lastName: user.lastName, email: user.email })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const focusFirst = (found: Partial<Record<Field, string>>) => {
    const first = FIELDS.find(field => found[field])
    if (first) ref.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
  }
  const save = useMutation({
    mutationFn: (values: AdminUpdateUserRequest) => adminApi.updateUser(user.username, values),
    onSuccess: onSaved,
    onError: error => {
      const found: Partial<Record<Field, string>> = {}
      if (isApiError(error)) {
        if (error.errorType === 'EMAIL_TAKEN') found.email = 'This email is already used by another account.'
        for (const issue of error.errors) if (FIELDS.includes(issue.field as Field)) found[issue.field as Field] ??= issue.message
      }
      setErrors(found)
      requestAnimationFrame(() => focusFirst(found))
    },
  })
  function set(field: Field, value: string) {
    setForm(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: undefined }))
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() }
    const found: Partial<Record<Field, string>> = {}
    if (!values.firstName) found.firstName = 'Enter a first name.'
    if (!values.lastName) found.lastName = 'Enter a last name.'
    if (!isEmail(values.email)) found.email = 'Enter a valid email address.'
    setErrors(found)
    if (Object.keys(found).length) { focusFirst(found); return }
    save.mutate(values)
  }
  return <Modal title="Edit user" onClose={onClose} busy={save.isPending} size="lg">
    <form ref={ref} onSubmit={submit} noValidate className="grid gap-6">
      {save.isError && !Object.values(errors).some(Boolean) && <Notice tone="error">{adminError(save.error)}</Notice>}
      <fieldset disabled={save.isPending} className="grid min-w-0 gap-6">
        <UserProfileContent user={user} fields={{
          firstName: <TextField label="First name" name="firstName" value={form.firstName} onChange={event => set('firstName', event.target.value)} maxLength={NAME_MAX_LENGTH} error={errors.firstName} />,
          lastName: <TextField label="Last name" name="lastName" value={form.lastName} onChange={event => set('lastName', event.target.value)} maxLength={NAME_MAX_LENGTH} error={errors.lastName} />,
          email: <TextField label="Email address" name="email" type="email" value={form.email} onChange={event => set('email', event.target.value)} maxLength={EMAIL_MAX_LENGTH} error={errors.email} />,
        }} />
        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit">{save.isPending ? 'Saving…' : 'Save changes'}</Button></div>
      </fieldset>
    </form>
  </Modal>
}
