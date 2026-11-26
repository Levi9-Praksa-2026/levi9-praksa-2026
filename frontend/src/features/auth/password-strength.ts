import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import * as common from '@zxcvbn-ts/language-common'
import * as en from '@zxcvbn-ts/language-en'
import * as hr from '@zxcvbn-ts/language-hr'
import * as ro from '@zxcvbn-ts/language-ro'
import * as nl from '@zxcvbn-ts/language-nl-be'

export type Strength = 0 | 1 | 2 | 3 | 4

export const STRENGTH_LABELS: Record<Strength, string> = {
  0: 'Very weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
}

// Loaded with the strength bar, never needed by validation or sign-in.
// All estimation stays in the browser; no breach lookup or external requests.
const estimator = new ZxcvbnFactory({
  translations: en.translations,
  graphs: common.adjacencyGraphs,
  dictionary: {
    ...common.dictionary,
    ...en.dictionary,
    ...hr.dictionary,
    ...ro.dictionary,
    ...nl.dictionary,
    userInputs: ['levddit', 'levi9'],
  },
  // Accepted passwords cannot exceed 72 UTF-8 bytes. Bound work on pasted input too.
  maxLength: 72,
})

export function estimatePassword(password: string, userInputs: string[] = []) {
  const personalWords = userInputs.flatMap(input => [input.trim(), ...input.split(/[\s@._+-]+/u)])
    .filter(word => word.length >= 3)
  const result = estimator.check(password, personalWords)
  return {
    strength: result.score,
    warning: result.feedback.warning,
    suggestions: result.feedback.suggestions,
  }
}
