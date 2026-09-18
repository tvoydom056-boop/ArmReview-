// Контракт ответов POST /api/vote (STRUCTURE.md § 5). Бот-проверки (honeypot, «слишком быстро»)
// кодов не имеют — они отвечают обычным 200, чтобы не выдавать себя.
export const VOTE_ERROR_CODES = ['INVALID_INPUT', 'TOO_EARLY', 'RATE_LIMITED', 'NOT_VOTABLE'] as const
export type VoteErrorCode = (typeof VOTE_ERROR_CODES)[number]

export const VOTE_ERROR_MESSAGES: Record<VoteErrorCode, string> = {
  INVALID_INPUT: 'Проверьте оценки',
  TOO_EARLY: 'Голосование ещё не началось',
  RATE_LIMITED: 'Слишком много голосов, попробуйте позже',
  NOT_VOTABLE: 'За этот матч голосовать нельзя',
}

export const VOTE_FALLBACK_MESSAGE = 'Не удалось отправить оценку. Попробуйте позже'

export type VoteResponse = { ok: true } | { error: VoteErrorCode }

export function isVoteErrorCode(value: unknown): value is VoteErrorCode {
  return VOTE_ERROR_CODES.some((code) => code === value)
}
