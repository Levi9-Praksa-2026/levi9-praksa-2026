import type { ReactNode } from 'react'
import { adminError } from './errors'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Notice } from '@/shared/ui/Notice'

export function ConfirmAction({ title, children, label, pending, error, onConfirm, onClose }: { title: string; children: ReactNode; label: string; pending: boolean; error: unknown; onConfirm: () => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose} busy={pending}>
    <div className="grid gap-5">
      <div className="text-small text-muted">{children}</div>
      {error != null && <Notice tone="error">{adminError(error)}</Notice>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" disabled={pending} onClick={onClose}>Cancel</Button>
        <Button disabled={pending} onClick={onConfirm}>{pending ? 'Saving…' : label}</Button>
      </div>
    </div>
  </Modal>
}
