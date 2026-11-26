import type { CSSProperties } from 'react'

export type CssVars = Partial<Record<`--${string}`, string | number | undefined>>

/** CSS custom properties as a typed style object: `style={cssVars({ '--h': 2 })}`. */
export function cssVars(vars: CssVars, style?: CSSProperties): CSSProperties {
  const out: Record<string, string | number> = { ...(style as Record<string, string | number> | undefined) }
  for (const [name, value] of Object.entries(vars)) if (value !== undefined) out[name] = value
  return out as CSSProperties
}
