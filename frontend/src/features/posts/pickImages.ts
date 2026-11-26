import { IMAGE_MAX_BYTES, IMAGE_TYPES, IMAGES_MAX } from './messages'

export interface PickResult {
  /** The images to keep: the ones already picked, then the new ones that passed, up to the limit. */
  images: File[]
  /** Why some new files were left out, in words; null when all of them made it. */
  problem: string | null
}

/**
 * Adds newly chosen files to the ones already picked, by post-service's rules: JPEG or PNG, at most 5 MB each,
 * at most 3 in all. A file that breaks a rule is left out and named, so the author sees which one and why. The
 * server checks again; this only saves an upload that would be refused.
 */
export function pickImages(current: readonly File[], incoming: readonly File[]): PickResult {
  const images = [...current]
  const problems: string[] = []
  for (const file of incoming) {
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
      problems.push(`${file.name} is not a JPEG or PNG.`)
    } else if (file.size > IMAGE_MAX_BYTES) {
      problems.push(`${file.name} is over 5 MB.`)
    } else if (images.length >= IMAGES_MAX) {
      problems.push(`Only ${IMAGES_MAX} images fit in a post; ${file.name} was left out.`)
    } else {
      images.push(file)
    }
  }
  return { images, problem: problems.length > 0 ? problems.join(' ') : null }
}
