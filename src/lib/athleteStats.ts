export type HandStats = { matches: number; wins: number }
export type AthleteStats = { right: HandStats; left: HandStats }

type Ref = number | { id: number }

type MatchLike = {
  athlete1: Ref
  athlete2: Ref
  winner?: Ref | null
  hand: 'right' | 'left'
  resultType?: 'normal' | 'injury' | 'dq' | 'no_contest' | null
}

const idOf = (ref: Ref | null | undefined) => (typeof ref === 'object' && ref ? ref.id : ref)

// Статистика только по внесённым матчам East vs West (TODO(вопрос 7)); несостоявшиеся не считаем
export function computeAthleteStats(athleteId: number, matches: MatchLike[]): AthleteStats {
  const stats: AthleteStats = {
    right: { matches: 0, wins: 0 },
    left: { matches: 0, wins: 0 },
  }
  for (const m of matches) {
    if (m.resultType === 'no_contest') continue
    if (idOf(m.athlete1) !== athleteId && idOf(m.athlete2) !== athleteId) continue
    const bucket = stats[m.hand]
    bucket.matches += 1
    if (idOf(m.winner) === athleteId) bucket.wins += 1
  }
  return stats
}
