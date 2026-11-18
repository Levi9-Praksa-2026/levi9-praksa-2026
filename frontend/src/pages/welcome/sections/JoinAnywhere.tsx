import { Section } from '@/shared/ui/Section'
import { LiveWord } from '@/shared/ui/hero/LiveWord'
import { ButtonRow } from '@/shared/ui/Button'
import type { ActionItem } from '@/shared/ui/types'
import '@/pages/welcome/sections/join-anywhere.css'

export interface JoinAnywhereProps {
  /** The fixed start of the statement: "Join us from". */
  lead: string
  /** The word at rest first ("anywhere."), then the places it turns through. */
  words: readonly [string, string, ...string[]]
  sub: string
  /** The offices, set small along the foot of the band. */
  places: readonly string[]
  register: ActionItem
}

/**
 * The brand band: one large statement whose last word slides through the offices out of a mask and
 * rests on "anywhere.", the Levi9 9 large and faint behind it, the offices and the one action ruled
 * along its foot. Under reduced motion the word at rest stands.
 */
export function JoinAnywhere({ lead, words, sub, places, register }: JoinAnywhereProps) {
  return (
    <Section id="anywhere" screens={1} ground="brand" className="lv-anywhere">
      <div className="lv-any">
        <h2 className="lv-any__title">
          <span className="lv-any__fixed">{lead}</span>
          <LiveWord words={words} />
        </h2>
        <p className="lv-any__sub">{sub}</p>
        <div className="lv-any__foot">
          <ul className="lv-any__places" aria-label="Offices">
            {places.map(p => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <ButtonRow primary={register} arrow size="hero" primaryClassName="shadow-[0_14px_30px_-12px_rgb(5_10_40/0.5)]" />
        </div>
      </div>
    </Section>
  )
}
