import { cache } from 'react'

import type { Match } from '../../../payload-types'
import { computeStyleProfile, computeWinRates } from '../athleteStats'
import { getPayloadClient } from '../payload'
import { refId } from '../refId'
import type { WrestlingStyle } from '../techniques'

// Общий запрос страницы и generateMetadata (AGENTS § 5)
export const getAthleteBySlug = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'athletes',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1, // фото
    pagination: false,
  })
  return docs[0] ?? null
})

// Матчи борца, новые сверху: по дате турнира, внутри турнира — по карте с конца.
// depth 1 — борцы и турнир объектами, для истории матчей
export async function getAthleteMatches(athleteId: number): Promise<Match[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    where: { or: [{ athlete1: { equals: athleteId } }, { athlete2: { equals: athleteId } }] },
    depth: 1,
    limit: 1000,
    pagination: false,
  })
  return docs.sort((a, b) => eventTime(b) - eventTime(a) || (b.cardOrder ?? 0) - (a.cardOrder ?? 0))
}

function eventTime(match: Match): number {
  return typeof match.event === 'object' ? new Date(match.event.date).getTime() : 0
}

// Доля побед каждого соперника — один запрос на всех (п.11 фидбэка Влада)
export async function getWinRates(athleteIds: number[]): Promise<Map<number, number | null>> {
  if (athleteIds.length === 0) return new Map()
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    where: { or: [{ athlete1: { in: athleteIds } }, { athlete2: { in: athleteIds } }] },
    depth: 0,
    limit: 10000,
    pagination: false,
    select: { athlete1: true, athlete2: true, winner: true, hand: true, resultType: true },
  })
  return computeWinRates(athleteIds, docs)
}

// id соперников из матчей борца — для getWinRates
export function getOpponentIds(athleteId: number, matches: Match[]): number[] {
  const ids = new Set<number>()
  for (const m of matches) {
    const opponent = refId(m.athlete1) === athleteId ? refId(m.athlete2) : refId(m.athlete1)
    if (opponent !== null) ids.add(opponent)
  }
  return [...ids]
}

// Какой рукой борец выходил в матчах — для фильтра «Правая / Левая» в списке борцов.
// Отдельного поля «основная рука» нет: рука — свойство матча (design/athletes.html)
export async function getHandsByAthlete(): Promise<Map<number, Set<'right' | 'left'>>> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    depth: 0,
    limit: 10000,
    pagination: false,
    select: { athlete1: true, athlete2: true, hand: true },
  })
  const hands = new Map<number, Set<'right' | 'left'>>()
  for (const m of docs) {
    for (const id of [refId(m.athlete1), refId(m.athlete2)]) {
      if (id === null) continue
      hands.set(id, (hands.get(id) ?? new Set()).add(m.hand))
    }
  }
  return hands
}

// Стиль борца для обводки и бейджа в списке. Как и в профиле, считаем только для известных борцов
// (isFeatured) и только когда техник в матчах хватает — иначе борца в карте нет
export async function getStyleByAthlete(featuredIds: number[]): Promise<Map<number, WrestlingStyle>> {
  const styles = new Map<number, WrestlingStyle>()
  if (featuredIds.length === 0) return styles
  // Один запрос на всех вместо запроса на каждого борца; computeStyleProfile сам отбирает матчи борца
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    where: { or: [{ athlete1: { in: featuredIds } }, { athlete2: { in: featuredIds } }] },
    depth: 0,
    limit: 10000,
    pagination: false,
    select: { athlete1: true, athlete2: true, winner: true, hand: true, resultType: true, technique1: true, technique2: true },
  })
  for (const id of featuredIds) {
    const profile = computeStyleProfile(id, docs)
    if (profile.enough) styles.set(id, profile.style)
  }
  return styles
}
