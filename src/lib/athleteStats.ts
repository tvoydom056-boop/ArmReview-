import { refId } from './refId'
import {
  TECHNIQUE_FAMILIES,
  getStyleByInsidePercent,
  getTechniqueFamily,
  getTechniqueStyle,
  isTechnique,
  type Technique,
  type TechniqueFamily,
  type WrestlingStyle,
} from './techniques'

// Меньше 3 матчей — проценты не показываем: 1 из 1 — это не «100% побед»
// (docs/changes/vlad-feedback-2026-09-27.md, вопрос 50)
export const MIN_MATCHES_FOR_PERCENT = 3

// Вкладка «Последние матчи» — первая: подробные данные Влад вносит сначала по свежим матчам (п.18)
export const RECENT_MATCHES = 10

// won/lost — матчи или раунды; percent — доля выигранных, null при малой выборке
export type Tally = { won: number; lost: number; percent: number | null }
export type HandStats = { matches: Tally; rounds: Tally }

// technique — семейство техники (technique-pyramid.md § 2); null — «Техника не указана»
export type TechniqueLine = { technique: TechniqueFamily | null; count: number; percent: number }
export type TechniqueStats = {
  matches: number // матчей с известной техникой борца
  fought: TechniqueLine[] // сколько раундов провёл в технике
  won: TechniqueLine[] // раунды, выигранные в технике («по пинам»)
  lost: TechniqueLine[]
}
export type AthleteStats = { total: HandStats; right: HandStats; left: HandStats; techniques: TechniqueStats }

export type StyleProfile =
  | { enough: true; style: WrestlingStyle; insidePercent: number; matches: number }
  | { enough: false; matches: number }

export type MatchLike = {
  athlete1: unknown
  athlete2: unknown
  winner?: unknown
  hand: 'right' | 'left'
  resultType?: 'normal' | 'injury' | 'dq' | 'no_contest' | null
  score1?: number | null
  score2?: number | null
  technique1?: string | null
  technique2?: string | null
}

// Матч глазами борца: его раунды, его техника. null — чужой или несостоявшийся матч
type OwnMatch = {
  hand: 'right' | 'left'
  won: boolean
  rounds: { won: number; lost: number } | null
  technique: Technique | null
}

function toOwnMatch(athleteId: number, m: MatchLike): OwnMatch | null {
  if (m.resultType === 'no_contest') return null
  const side = refId(m.athlete1) === athleteId ? 1 : refId(m.athlete2) === athleteId ? 2 : null
  if (side === null) return null

  const [own, other] = side === 1 ? [m.score1, m.score2] : [m.score2, m.score1]
  const technique = side === 1 ? m.technique1 : m.technique2
  return {
    hand: m.hand,
    won: refId(m.winner) === athleteId,
    rounds: own != null && other != null ? { won: own, lost: other } : null,
    technique: isTechnique(technique) ? technique : null,
  }
}

// Статистика по внесённым матчам (TODO(вопрос 7)); несостоявшиеся не считаем
export function computeAthleteStats(athleteId: number, matches: MatchLike[]): AthleteStats {
  const own = matches.map((m) => toOwnMatch(athleteId, m)).filter((m): m is OwnMatch => m !== null)
  return {
    total: handStats(own),
    right: handStats(own.filter((m) => m.hand === 'right')),
    left: handStats(own.filter((m) => m.hand === 'left')),
    techniques: techniqueStats(own),
  }
}

function handStats(own: OwnMatch[]): HandStats {
  const enough = own.length >= MIN_MATCHES_FOR_PERCENT
  const wins = own.filter((m) => m.won).length
  let roundsWon = 0
  let roundsLost = 0
  for (const m of own) {
    roundsWon += m.rounds?.won ?? 0
    roundsLost += m.rounds?.lost ?? 0
  }
  return {
    matches: tally(wins, own.length - wins, enough),
    rounds: tally(roundsWon, roundsLost, enough),
  }
}

function tally(won: number, lost: number, enough: boolean): Tally {
  const total = won + lost
  return { won, lost, percent: enough && total > 0 ? Math.round((won / total) * 100) : null }
}

// Последние RECENT_MATCHES состоявшихся матчей (вход — новые сверху); null — если их не больше
export function pickRecentMatches<T extends Pick<MatchLike, 'resultType'>>(matches: T[]): T[] | null {
  const played = matches.filter((m) => m.resultType !== 'no_contest')
  return played.length > RECENT_MATCHES ? played.slice(0, RECENT_MATCHES) : null
}

// Раунд относим к технике борца в этом матче: пораундовой разметки нет (там же, вопрос 51).
// Считаем по семействам: соседние точки пирамиды различают не всегда (technique-pyramid.md § 2,
// TODO(вопрос 59) — проверка на 10 раундах может перевести статистику на точки)
function techniqueStats(own: OwnMatch[]): TechniqueStats {
  const fought = new Map<TechniqueFamily | null, number>()
  const won = new Map<TechniqueFamily | null, number>()
  const lost = new Map<TechniqueFamily | null, number>()
  for (const m of own) {
    if (!m.rounds) continue
    const family = m.technique ? getTechniqueFamily(m.technique) : null
    add(fought, family, m.rounds.won + m.rounds.lost)
    add(won, family, m.rounds.won)
    add(lost, family, m.rounds.lost)
  }
  return {
    matches: own.filter((m) => m.technique !== null).length,
    fought: toLines(fought),
    won: toLines(won),
    lost: toLines(lost),
  }
}

function add(map: Map<TechniqueFamily | null, number>, key: TechniqueFamily | null, n: number) {
  if (n > 0) map.set(key, (map.get(key) ?? 0) + n)
}

// По убыванию, при равенстве — порядок пирамиды; «не указана» всегда последней
const ORDER = new Map<TechniqueFamily | null, number>(TECHNIQUE_FAMILIES.map((f, i) => [f.value, i]))

function toLines(counts: Map<TechniqueFamily | null, number>): TechniqueLine[] {
  const entries = [...counts.entries()].sort(
    ([a, na], [b, nb]) =>
      Number(a === null) - Number(b === null) || nb - na || (ORDER.get(a) ?? 0) - (ORDER.get(b) ?? 0),
  )
  const percents = sharePercents(entries.map(([, n]) => n))
  return entries.map(([technique, count], i) => ({ technique, count, percent: percents[i] }))
}

// Доли в процентах, которые в сумме дают ровно 100: остаток округления — самым большим дробным частям
export function sharePercents(counts: number[]): number[] {
  const total = counts.reduce((s, n) => s + n, 0)
  if (total === 0) return counts.map(() => 0)
  const exact = counts.map((n) => (n / total) * 100)
  const result = exact.map(Math.floor)
  const rest = 100 - result.reduce((s, n) => s + n, 0)
  exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
    .slice(0, rest)
    .forEach(({ i }) => (result[i] += 1))
  return result
}

// Стиль считаем по матчам, а не по раундам: так он не выдаёт счёт и может стоять в шапке
// без спойлера (там же, К2). Матч — это техника борца в нём.
export function computeStyleProfile(athleteId: number, matches: MatchLike[]): StyleProfile {
  const techniques = matches
    .map((m) => toOwnMatch(athleteId, m)?.technique ?? null)
    .filter((t): t is Technique => t !== null)
  if (techniques.length < MIN_MATCHES_FOR_PERCENT) return { enough: false, matches: techniques.length }

  const inside = techniques.filter((t) => getTechniqueStyle(t) === 'inside').length
  const insidePercent = Math.round((inside / techniques.length) * 100)
  return { enough: true, style: getStyleByInsidePercent(insidePercent), insidePercent, matches: techniques.length }
}

// Рекорды соперников для истории матчей: id борца → доля побед (null — меньше 3 матчей)
export function computeWinRates(athleteIds: number[], matches: MatchLike[]): Map<number, number | null> {
  return new Map(
    athleteIds.map((id) => {
      const own = matches.map((m) => toOwnMatch(id, m)).filter((m): m is OwnMatch => m !== null)
      const wins = own.filter((m) => m.won).length
      return [id, tally(wins, own.length - wins, own.length >= MIN_MATCHES_FOR_PERCENT).percent]
    }),
  )
}
