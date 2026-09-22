import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import { sql } from '@payloadcms/db-sqlite/drizzle'

import { DAY_MS, HOUR_MS, RATE_LIMITS } from './rateLimiting'
import type { VoteInput } from './schema'
import type { VoteContext } from './service'

// Договор и обход Local API: docs/changes/project-audit.md § B.
// Один statement получает блокировку записи до чтения квот; повтор не расходует квоту.
export async function writeVote(
  db: Pick<SQLiteAdapter['drizzle'], 'all'>,
  input: VoteInput,
  ctx: VoteContext,
): Promise<boolean> {
  const matchId = Number(input.matchId)
  const now = ctx.now.toISOString()
  const dayAgo = new Date(ctx.now.getTime() - DAY_MS).toISOString()
  const hourAgo = new Date(ctx.now.getTime() - HOUR_MS).toISOString()
  const statement = sql`
    INSERT INTO votes (match_id, device_id, ip_hash, spectacle, intrigue, technique, refereeing,
                       is_hidden, created_at, updated_at)
    SELECT ${matchId}, ${ctx.deviceId}, ${ctx.ipHash}, ${input.spectacle}, ${input.intrigue},
           ${input.technique}, ${input.refereeing}, ${0}, ${now}, ${now}
    WHERE EXISTS (SELECT 1 FROM votes WHERE match_id = ${matchId} AND device_id = ${ctx.deviceId})
       OR (
         (SELECT COUNT(*) FROM votes
          WHERE match_id = ${matchId} AND ip_hash = ${ctx.ipHash} AND created_at > ${dayAgo})
           < ${RATE_LIMITS.devicesPerMatchPerDay}
         AND (SELECT COUNT(*) FROM votes WHERE ip_hash = ${ctx.ipHash} AND created_at > ${hourAgo})
           < ${RATE_LIMITS.votesPerHour}
       )
    ON CONFLICT (match_id, device_id) DO UPDATE SET
      spectacle = excluded.spectacle, intrigue = excluded.intrigue,
      technique = excluded.technique, refereeing = excluded.refereeing,
      updated_at = excluded.updated_at
    RETURNING id
  `

  // busyTimeout адаптера ограничивает ожидание; любую ошибку передаём вызывающему коду.
  const rows = await db.all<{ id: number }>(statement)
  return rows.length === 1
}
