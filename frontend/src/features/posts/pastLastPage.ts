/**
 * The page to move to when the URL asks for one past the end (a shared link after posts were removed), or null to
 * stay. Only an answer for the requested page counts: while it loads, the previous page's answer is on screen
 * (`isPlaceholderData`), and its page count may be out of date, so a page that exists now would be "corrected".
 *
 * @param totalPages from the answer on screen; undefined before the first one
 * @param stale      that answer belongs to the previous page (`isPlaceholderData`)
 */
export function pastLastPage(page: number, totalPages: number | undefined, stale: boolean): number | null {
  if (stale || totalPages === undefined || totalPages === 0 || page < totalPages) return null
  return totalPages - 1
}
