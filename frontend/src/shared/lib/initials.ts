/** Up to two letters for an avatar circle: "demo_user" → "DU", "frontend" → "FR". */
export function initials(name: string): string {
  const words = name.split(/[\s_.-]+/).filter(Boolean)
  const letters = words.length > 1 ? (words[0]![0] ?? '') + (words[1]![0] ?? '') : name.slice(0, 2)
  return letters.toUpperCase() || '?'
}
