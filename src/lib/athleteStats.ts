import { refId } from './refId'

export type HandStats = { matches: number; wins: number }
export type AthleteStats = { right: HandStats; left: HandStats }

type MatchLike = {
  athlete1: unknown
  athlete2: unknown
  winner?: unknown
  hand: 'right' | 'left'
  resultType?: 'normal' | 'injury' | 'dq' | 'no_contest' | null
}

// Статистика только по внесённым матчам East vs West (TODO(вопрос 7)); несостоявшиеся не считаем
export function computeAthleteStats(athleteId: number, matches: MatchLike[]): AthleteStats {
  const stats: AthleteStats = {
    right: { matches: 0, wins: 0 },
    left: { matches: 0, wins: 0 },
  }
  for (const m of matches) {
    if (m.resultType === 'no_contest') continue
    if (refId(m.athlete1) !== athleteId && refId(m.athlete2) !== athleteId) continue
    const bucket = stats[m.hand]
    bucket.matches += 1
    if (refId(m.winner) === athleteId) bucket.wins += 1
  }
  return stats
}
