/**
 * How long ago, short: "just now", "5m ago", "3h ago", "12d ago", "4mo ago", "2y ago". For post and comment dates;
 * show the full date next to it (a `<time>` title) for anyone who needs the exact moment.
 *
 * @param instant an ISO-8601 instant as the backend sends it; '' when it can't be read
 * @param now     the moment to count from, fixed in tests
 */
export function relativeTime(instant: string, now = new Date()): string {
  const at = Date.parse(instant)
  if (Number.isNaN(at)) return ''
  // A clock a little ahead of ours would give "-1m ago"; anything in the future counts as now.
  const minutes = Math.max(0, Math.floor((now.getTime() - at) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}
