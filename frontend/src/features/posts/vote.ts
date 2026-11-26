import type { VoteValue } from '@/shared/api/contracts/common'

/** Your vote after clicking an arrow: the same arrow again takes the vote back, the other one switches it. */
export function nextVote(current: VoteValue | null, clicked: VoteValue): VoteValue | null {
  return current === clicked ? null : clicked
}

/**
 * The score to show once your vote changed, from the score the server sent (which already counts the vote it knew
 * about). Moves by new minus old, like post-service does: switching from down to up moves it by 2.
 */
export function scoreWith(serverScore: number, serverVote: VoteValue | null, vote: VoteValue | null): number {
  return serverScore - (serverVote ?? 0) + (vote ?? 0)
}
