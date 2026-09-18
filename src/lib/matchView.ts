import type { Match } from '../../payload-types'

import type { MatchRating } from './rating'
import { refId } from './refId'

export type AthleteRef = { name: string; slug: string; countryCode: string }
// Результат — спойлер: строки лежат отдельно и показываются только по кнопке (PROJECT.md § 12)
export type MatchOutcome = { headline: string; score: string | null }
export type MatchView = {
  id: number
  athlete1: AthleteRef
  athlete2: AthleteRef
  hand: 'right' | 'left'
  weightClass: string | null
  isTitle: boolean
  outcome: MatchOutcome
  rating: MatchRating
}

const handLabel = { right: 'Правая рука', left: 'Левая рука' } as const
export const getHandLabel = (hand: 'right' | 'left') => handLabel[hand]

type OutcomeInput = {
  resultType: Match['resultType']
  score1: number | null | undefined
  score2: number | null | undefined
  winnerName: string | null
}

export function getMatchOutcome({ resultType, score1, score2, winnerName }: OutcomeInput): MatchOutcome {
  if (resultType === 'no_contest') return { headline: 'Матч не состоялся', score: null }

  const score = score1 != null && score2 != null ? `${score1}:${score2}` : null
  const winner = winnerName ? `Победил ${winnerName}` : 'Победитель не внесён'
  const prefix = resultType === 'injury' ? 'Травма. ' : resultType === 'dq' ? 'Дисквалификация. ' : ''
  return { headline: prefix + winner, score }
}

function toAthleteRef(value: Match['athlete1']): (AthleteRef & { id: number }) | null {
  if (typeof value !== 'object') return null
  return { id: value.id, name: value.name, slug: value.slug, countryCode: value.countryCode }
}

// Ждёт матч с depth ≥ 1 (борцы — объекты); иначе null
export function toMatchView(match: Match, rating: MatchRating): MatchView | null {
  const a1 = toAthleteRef(match.athlete1)
  const a2 = toAthleteRef(match.athlete2)
  if (!a1 || !a2) return null

  const winnerId = refId(match.winner)
  const winner = [a1, a2].find((a) => a.id === winnerId)

  return {
    id: match.id,
    athlete1: { name: a1.name, slug: a1.slug, countryCode: a1.countryCode },
    athlete2: { name: a2.name, slug: a2.slug, countryCode: a2.countryCode },
    hand: match.hand,
    weightClass: match.weightClass ?? null,
    isTitle: Boolean(match.isTitle),
    outcome: getMatchOutcome({
      resultType: match.resultType,
      score1: match.score1,
      score2: match.score2,
      winnerName: winner?.name ?? null,
    }),
    rating,
  }
}
