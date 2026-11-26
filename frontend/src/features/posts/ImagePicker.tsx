import { ImagePlus, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { IMAGE_TYPES, IMAGES_MAX } from './messages'
import { pickImages } from './pickImages'

export interface ImagePickerProps {
  images: readonly File[]
  onChange: (images: File[]) => void
  disabled?: boolean
}

/**
 * Up to three JPEG or PNG images, each shown as a preview with a button to take it out again. Files that break a
 * rule are left out with a reason under the picker.
 */
export function ImagePicker({ images, onChange, disabled = false }: ImagePickerProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)

  // One object URL per file for the previews, released again when the files change or the form goes away.
  const previews = useMemo(() => images.map(file => URL.createObjectURL(file)), [images])
  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews])

  function add(files: FileList | null) {
    const result = pickImages(images, Array.from(files ?? []))
    setProblem(result.problem)
    onChange(result.images)
    // Clear the input, so picking the same file again after removing it still counts as a change.
    if (input.current) input.current.value = ''
  }

  function remove(index: number) {
    setProblem(null)
    onChange(images.filter((_, i) => i !== index))
  }

  const full = images.length >= IMAGES_MAX

  return (
    <div className="grid gap-2">
      <span id={`${id}-label`} className="text-small font-medium text-ink">
        Images <span className="font-normal text-muted">(optional, up to {IMAGES_MAX}, JPEG or PNG, 5 MB each)</span>
      </span>

      {images.length > 0 && (
        <ul aria-labelledby={`${id}-label`} className="grid grid-cols-3 gap-2">
          {images.map((file, index) => (
            <li key={previews[index]} className="relative">
              <img src={previews[index]} alt={file.name} className="aspect-square w-full rounded-md border border-line bg-surface object-cover" />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="absolute top-1.5 right-1.5 grid size-7 cursor-pointer place-items-center rounded-full bg-ink/70 text-white hover:bg-ink disabled:cursor-wait"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <label
          htmlFor={`${id}-input`}
          className="flex w-fit cursor-pointer items-center gap-2 rounded-btn border border-line-strong px-3 py-2 text-small font-medium text-ink hover:bg-surface has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-action"
        >
          <ImagePlus className="size-4" aria-hidden="true" />
          {images.length === 0 ? 'Add images' : 'Add another'}
          <input
            ref={input}
            id={`${id}-input`}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            multiple
            disabled={disabled}
            onChange={event => add(event.target.files)}
            className="sr-only"
          />
        </label>
      )}

      <p role="status" className="text-small text-accent">{problem}</p>
    </div>
  )
}
