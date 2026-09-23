import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import { sql } from '@payloadcms/db-sqlite/drizzle'
import { z } from 'zod'

import { getPayloadClient } from '../payload'
import { computeGlobalMean, computeScore, computeTotal, type MatchRating } from '../rating'

const rowSchema = z.object({
  match_id: z.number(),
  votes: z.number(),
  spectacle: z.number(),
  intrigue: z.number(),
  technique: z.number(),
  refereeing: z.number(),
})

const isSqliteAdapter = (db: object): db is SQLiteAdapter => 'drizzle' in db

export const NO_VOTES: MatchRating = { votes: 0, score: null }

// Балл считаем SQL-агрегатом при запросе, без денормализации (PROJECT.md § 9).
// Скрытые админом голоса (isHidden) не учитываются.
export async function getRatingsByMatch(): Promise<Map<number, MatchRating>> {
  const payload = await getPayloadClient()
  if (!isSqliteAdapter(payload.db)) throw new Error('Агрегат рейтинга рассчитан на SQLite-адаптер')

  const rawRows = await payload.db.drizzle.all(sql`
    SELECT match_id,
           COUNT(*)        AS votes,
           AVG(spectacle)  AS spectacle,
           AVG(intrigue)   AS intrigue,
           AVG(technique)  AS technique,
           AVG(refereeing) AS refereeing
    FROM votes
    WHERE COALESCE(is_hidden, 0) = 0
    GROUP BY match_id
  `)

  const matches = z
    .array(rowSchema)
    .parse(rawRows)
    .map(({ match_id, votes, ...scales }) => ({ id: match_id, votes, scales, total: computeTotal(scales) }))

  const globalMean = computeGlobalMean(matches)
  return new Map(
    matches.map((m) => [m.id, { votes: m.votes, score: computeScore(m.votes, m.total, globalMean), scales: m.scales }]),
  )
}
