import type { Match } from '../../payload-types'

import type { MatchRating } from './rating'
import { refId } from './refId'
import { toWeightClassView, type WeightClassView } from './weightClass'

export type AthleteRef = { name: string; slug: string; countryCode: string }
// Рост и вес — только в окне матча: в строках списков им не место (design/match.html .versus)
export type MatchSide = AthleteRef & { heightCm: number | null; weightKg: number | null }
// Результат — спойлер: строки лежат отдельно и показываются только по кнопке (PROJECT.md § 12)
export type MatchOutcome = { headline: string; score: string | null }
export type MatchView = {
  id: number
  athlete1: MatchSide
  athlete2: MatchSide
  hand: 'right' | 'left'
  weightClass: WeightClassView | null
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

// id нужен только чтобы найти победителя, наружу в MatchSide он не попадает
function toMatchSide(value: Match['athlete1']): { id: number; side: MatchSide } | null {
  if (typeof value !== 'object') return null
  return {
    id: value.id,
    side: {
      name: value.name,
      slug: value.slug,
      countryCode: value.countryCode,
      heightCm: value.heightCm ?? null,
      weightKg: value.weightKg ?? null,
    },
  }
}

// Ждёт матч с depth ≥ 1 (борцы — объекты); иначе null
export function toMatchView(match: Match, rating: MatchRating): MatchView | null {
  const a1 = toMatchSide(match.athlete1)
  const a2 = toMatchSide(match.athlete2)
  if (!a1 || !a2) return null

  const winnerId = refId(match.winner)
  const winner = [a1, a2].find((a) => a.id === winnerId)

  return {
    id: match.id,
    athlete1: a1.side,
    athlete2: a2.side,
    hand: match.hand,
    weightClass: toWeightClassView(match.weightClass),
    isTitle: Boolean(match.isTitle),
    outcome: getMatchOutcome({
      resultType: match.resultType,
      score1: match.score1,
      score2: match.score2,
      winnerName: winner?.side.name ?? null,
    }),
    rating,
  }
}
