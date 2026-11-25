import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export interface PaginationProps {
  page: number
  totalPages: number
  totalElements?: number
  /** What one item is called in the summary, e.g. "communities". */
  itemLabel?: string
  label?: string
  className?: string
  onChange: (page: number) => void
}

/** Previous/Next controls for a paged list. Renders nothing when there is only one page. */
export function Pagination({
  page,
  totalPages,
  totalElements,
  itemLabel = 'items',
  label = 'Pages',
  className,
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label={label} className={cn('flex items-center justify-between gap-3', className)}>
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
        className="flex cursor-pointer items-center gap-1 rounded-btn px-3 py-2 text-small font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeft className="size-4" aria-hidden="true" /> Previous
      </button>
      <span className="text-small text-muted">
        Page {page + 1} of {totalPages}{totalElements === undefined ? '' : ` · ${totalElements} ${itemLabel}`}
      </span>
      <button
        type="button"
        disabled={page + 1 >= totalPages}
        onClick={() => onChange(page + 1)}
        className="flex cursor-pointer items-center gap-1 rounded-btn px-3 py-2 text-small font-medium text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
