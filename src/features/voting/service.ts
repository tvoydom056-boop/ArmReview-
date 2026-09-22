import type { SQLiteAdapter } from '@payloadcms/db-sqlite'

import { getPayloadClient } from '@/lib/payload'
import { getVotingState } from '@/lib/votingWindow'
import type { VoteErrorCode } from '@/types/api'

import type { VoteInput } from './schema'
import { writeVote } from './writeVote'

export type VoteContext = { deviceId: string; ipHash: string; now: Date }
export type CastVoteResult = { ok: true } | { ok: false; code: VoteErrorCode }

const MIN_MS_BEFORE_SUBMIT = 3000

const fail = (code: VoteErrorCode): CastVoteResult => ({ ok: false, code })
const ok: CastVoteResult = { ok: true }
const isSqliteAdapter = (db: object): db is SQLiteAdapter => 'drizzle' in db

// Сценарий «принять голос»: порядок проверок — STRUCTURE.md § 4
export async function castVote(input: VoteInput, ctx: VoteContext): Promise<CastVoteResult> {
  // Бот-проверки отвечают как обычный успех — не выдаём, какую проверку не прошли
  if (input.website) return ok
  if (ctx.now.getTime() - input.openedAt < MIN_MS_BEFORE_SUBMIT) return ok

  const payload = await getPayloadClient()
  const matchId = Number(input.matchId)

  const { docs } = await payload.find({
    collection: 'matches',
    where: { id: { equals: matchId } },
    depth: 1,
    limit: 1,
  })
  const match = docs[0]
  if (!match || typeof match.event !== 'object') return fail('INVALID_INPUT')

  const state = getVotingState(match.resultType, match.event.date, ctx.now)
  if (state === 'not_votable') return fail('NOT_VOTABLE')

  if (state === 'too_early') return fail('TOO_EARLY')
  if (!isSqliteAdapter(payload.db)) throw new Error('Запись голоса рассчитана на SQLite-адаптер')
  return await writeVote(payload.db.drizzle, input, ctx) ? ok : fail('RATE_LIMITED')
}
