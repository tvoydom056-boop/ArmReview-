// Голосовать можно только после даты турнира (PROJECT.md § 5).
// TODO(вопрос к Владу — «когда открывается голосование»): пока с 00:00 МСК следующих суток;
// возможно, лучше открывать вручную после выхода записи на YouTube.
const MSK_OFFSET_MS = 3 * 60 * 60 * 1000

export type VotingState = 'open' | 'too_early' | 'not_votable'

export function getVotingOpensAt(eventDateIso: string): Date {
  const msk = new Date(new Date(eventDateIso).getTime() + MSK_OFFSET_MS)
  const nextDayStart = Date.UTC(msk.getUTCFullYear(), msk.getUTCMonth(), msk.getUTCDate() + 1)
  return new Date(nextDayStart - MSK_OFFSET_MS)
}

export function isVotingOpen(eventDateIso: string, now: Date): boolean {
  return now.getTime() >= getVotingOpensAt(eventDateIso).getTime()
}

// TODO(вопрос 11): голосовать нельзя только за несостоявшиеся матчи; за травму и ДК — можно
export function getVotingState(
  resultType: 'normal' | 'injury' | 'dq' | 'no_contest' | null | undefined,
  eventDateIso: string,
  now: Date,
): VotingState {
  if (resultType === 'no_contest') return 'not_votable'
  return isVotingOpen(eventDateIso, now) ? 'open' : 'too_early'
}
