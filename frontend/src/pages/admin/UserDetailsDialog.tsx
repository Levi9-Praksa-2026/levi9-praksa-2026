import { Pencil } from 'lucide-react'
import type { AdminUser } from '@/shared/api/admin'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { UserProfileContent } from './UserProfileContent'

export function UserDetailsDialog({ user, onClose, onEdit }: { user: AdminUser; onClose: () => void; onEdit: () => void }) {
  return <Modal title="User details" onClose={onClose} size="lg">
    <div className="grid gap-6">
      <UserProfileContent user={user} />
      <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {!user.deleted && <Button onClick={onEdit}><Pencil className="size-4" aria-hidden="true" />Edit user</Button>}
      </div>
    </div>
  </Modal>
}
