import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

export interface SelectProps<T extends string> {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  id?: string
  className?: string
  disabled?: boolean
}

/**
 * A labelled single-choice dropdown. It is a real listbox, not a native `<select>`: the trigger
 * keeps focus semantics, arrow keys move through the options, Enter/Space picks one, Escape closes
 * it, and a click or focus outside closes it too.
 */
export function Select<T extends string>({ label, value, options, onChange, id, className, disabled }: SelectProps<T>) {
  const fallbackId = useId()
  const selectId = id ?? fallbackId
  const listId = `${selectId}-options`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)

  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  const [active, setActive] = useState(selectedIndex)

  function openList(index = selectedIndex) {
    setActive(index)
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    optionRefs.current[active]?.focus()
  }, [open, active])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openList(event.key === 'ArrowUp' ? options.length - 1 : selectedIndex)
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (!open) {
        event.preventDefault() // the button's own click would toggle it straight back closed
        openList()
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    }
  }

  function onOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const move = (next: number) => {
      event.preventDefault()
      setActive((next + options.length) % options.length)
    }
    switch (event.key) {
      case 'ArrowDown': move(index + 1); break
      case 'ArrowUp': move(index - 1); break
      case 'Home': move(0); break
      case 'End': move(options.length - 1); break
      case 'Enter':
      case ' ': event.preventDefault(); choose(index); break
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
      case 'Tab': setOpen(false); break
    }
  }

  const current = options.find(option => option.value === value)

  return (
    <div
      ref={rootRef}
      className={cn('relative flex flex-col gap-1.5', className)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <span id={`${selectId}-label`} className="text-small font-medium text-ink">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-labelledby={`${selectId}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => { if (open) setOpen(false); else openList() }}
        onKeyDown={onTriggerKeyDown}
        className="flex h-12 w-full cursor-pointer items-center justify-between gap-4 rounded-md border border-line-strong bg-bg px-3 text-left text-small text-ink outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{current?.label ?? ''}</span>
        <ChevronDown className={cn('ml-2 size-4 flex-none text-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-labelledby={`${selectId}-label`}
          className="absolute top-full left-0 z-50 mt-1 w-full min-w-max rounded-md border border-line bg-bg p-1 shadow-[0_16px_40px_-16px_rgb(20_24_51/0.25)]"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              ref={element => { optionRefs.current[index] = element }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={-1}
              onClick={() => choose(index)}
              onKeyDown={event => onOptionKeyDown(event, index)}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-small text-ink hover:bg-surface aria-selected:bg-surface',
                option.value === value && 'font-medium text-accent',
              )}
            >
              {option.label}
              {option.value === value && <Check className="size-4 flex-none" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
