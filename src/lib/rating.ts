// Формула рейтинга — PROJECT.md § 6. Только чтение: считает по уже записанным голосам.

export const RATING_WEIGHTS = {
  spectacle: 0.3,
  intrigue: 0.25,
  technique: 0.25,
  refereeing: 0.2,
} as const

export type ScaleKey = keyof typeof RATING_WEIGHTS
export type ScaleValues = Record<ScaleKey, number>

export const MIN_VOTES_TO_SHOW = 5 // балл показываем от 5 голосов
const SMOOTHING_M = 5
const DEFAULT_MEAN = 3.5
const MIN_MATCHES_FOR_MEAN = 3

export type MatchRating = { votes: number; score: number | null }

// Итог — взвешенная сумма шкал; работает и для одного голоса, и для средних по матчу
export function computeTotal(scales: ScaleValues): number {
  const keys = Object.keys(RATING_WEIGHTS) as ScaleKey[]
  return keys.reduce((sum, key) => sum + RATING_WEIGHTS[key] * scales[key], 0)
}

// C — средний Итог по матчам с 5+ голосами; если таких меньше 3 — 3.5
export function computeGlobalMean(matches: { votes: number; total: number }[]): number {
  const eligible = matches.filter((m) => m.votes >= MIN_VOTES_TO_SHOW)
  if (eligible.length < MIN_MATCHES_FOR_MEAN) return DEFAULT_MEAN
  return eligible.reduce((sum, m) => sum + m.total, 0) / eligible.length
}

// Балл = (v·Итог + m·C) / (v + m), округление до 0.1; меньше 5 голосов — null
export function computeScore(votes: number, total: number, globalMean: number): number | null {
  if (votes < MIN_VOTES_TO_SHOW) return null
  const raw = (votes * total + SMOOTHING_M * globalMean) / (votes + SMOOTHING_M)
  return Math.round(raw * 10) / 10
}

// Топ матчей: id по убыванию балла, при равенстве — больше голосов; без балла (мало голосов) в топ не попадает
export function rankRatings(ratings: ReadonlyMap<number, MatchRating>, limit: number): number[] {
  return [...ratings.entries()]
    .filter(([, rating]) => rating.score !== null)
    .sort(([idA, a], [idB, b]) => (b.score ?? 0) - (a.score ?? 0) || b.votes - a.votes || idA - idB)
    .slice(0, limit)
    .map(([id]) => id)
}
