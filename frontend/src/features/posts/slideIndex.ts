/**
 * Which slide a sideways-scrolling strip of equal-width slides shows: the one whose start is nearest the scroll
 * position, kept within 0..count-1 (a bounce past either end can't point outside).
 */
export function slideIndex(scrollLeft: number, slideWidth: number, count: number): number {
  if (slideWidth <= 0 || count <= 0) return 0
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / slideWidth)))
}
