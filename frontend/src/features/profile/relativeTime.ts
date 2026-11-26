/** "12d ago", as the short dates on the profile's plain post rows. */
export function relativeTime(instant: string, now = new Date()): string {
  const at = Date.parse(instant)
  if (Number.isNaN(at)) return ''
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
