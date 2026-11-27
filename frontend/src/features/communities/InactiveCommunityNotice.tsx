import { CircleAlert } from 'lucide-react'
import { Button } from '@/shared/ui/Button'

export interface InactiveCommunityNoticeProps {
  name: string
  onReactivate: () => void
  pending?: boolean
  error?: string | null
}

/** What an admin sees for a shut-down community: an explanation and the reactivate endpoint. */
export function InactiveCommunityNotice({ name, onReactivate, pending, error }: InactiveCommunityNoticeProps) {
  return (
    <div className="rounded-lg border border-line bg-bg px-card-pad py-10 text-center">
      <CircleAlert className="mx-auto size-8 text-muted" aria-hidden="true" />
      <h2 className="mt-2 text-h3">l/{name} is inactive</h2>
      <p className="mt-2 text-small text-muted">
        Its posts are hidden from everyone. Nothing was deleted — as an admin you can reactivate it.
      </p>
      {error && <p role="alert" className="mt-2 text-small font-medium text-accent">{error}</p>}
      <Button className="mt-4" onClick={onReactivate} disabled={pending}>
        {pending ? 'Reactivating…' : 'Reactivate community'}
      </Button>
    </div>
  )
}
