import type { Match } from '../../payload-types'

import { formatEventDate } from './formatDate'
import type { AthleteRef } from './matchView'
import { refId } from './refId'
import { toWeightClassView, type WeightClassView } from './weightClass'

// Строка истории матчей глазами борца (design/athlete.html «Матчи»). Результат — спойлер,
// компонент показывает строки только за кнопкой (PROJECT.md § 12)
export type HistoryRow = {
  id: number
  result: 'win' | 'loss' | 'none' // none — победитель не внесён или матч не состоялся
  score: string | null // свой счёт первым: «3–1»
  note: string | null
  opponent: AthleteRef
  opponentWinRate: number | null // п.11 Влада: уровень соперника; null — меньше 3 матчей
  hand: 'right' | 'left'
  weightClass: string | null
  isTitle: boolean
  event: { title: string; dateLabel: string; year: string }
}

const NOTES = { injury: 'травма', dq: 'дисквалификация', no_contest: 'не состоялся' } as const

const yearFormatter = new Intl.DateTimeFormat('ru-RU', { year: 'numeric', timeZone: 'Europe/Moscow' })

// Ждёт матч с depth ≥ 1 (борцы и турнир — объекты); иначе null
export function toHistoryRow(
  athleteId: number,
  match: Match,
  winRates: ReadonlyMap<number, number | null>,
): HistoryRow | null {
  const isFirst = refId(match.athlete1) === athleteId
  const opponent = isFirst ? match.athlete2 : match.athlete1
  if (typeof opponent !== 'object' || typeof match.event !== 'object') return null

  const [own, other] = isFirst ? [match.score1, match.score2] : [match.score2, match.score1]
  const winnerId = refId(match.winner)
  const played = match.resultType !== 'no_contest'

  return {
    id: match.id,
    result: !played || winnerId === null ? 'none' : winnerId === athleteId ? 'win' : 'loss',
    score: played && own != null && other != null ? `${own}–${other}` : null,
    note: match.resultType === 'normal' ? null : NOTES[match.resultType],
    opponent: { name: opponent.name, slug: opponent.slug, countryCode: opponent.countryCode },
    opponentWinRate: winRates.get(opponent.id) ?? null,
    hand: match.hand,
    weightClass: toWeightClassView(match.weightClass)?.label ?? null,
    isTitle: Boolean(match.isTitle),
    event: {
      title: match.event.title,
      dateLabel: formatEventDate(match.event.date),
      year: yearFormatter.format(new Date(match.event.date)),
    },
  }
}

// Категория в шапке — по последнему матчу с указанной категорией (п.3 Влада, вопрос 48).
// matches — новые сверху (getAthleteMatches)
export function getCurrentWeightClass(matches: Pick<Match, 'weightClass'>[]): WeightClassView | null {
  for (const m of matches) {
    const view = toWeightClassView(m.weightClass)
    if (view) return view
  }
  return null
}
