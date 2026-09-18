import { getPayloadClient } from '@/lib/payload'
import { getVotingState } from '@/lib/votingWindow'
import type { VoteErrorCode } from '@/types/api'

import { DAY_MS, HOUR_MS, isRateLimited } from './rateLimiting'
import type { VoteInput } from './schema'

export type VoteContext = { deviceId: string; ipHash: string; now: Date }
export type CastVoteResult = { ok: true } | { ok: false; code: VoteErrorCode }

const MIN_MS_BEFORE_SUBMIT = 3000

const fail = (code: VoteErrorCode): CastVoteResult => ({ ok: false, code })
const ok: CastVoteResult = { ok: true }

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

  const dayAgo = new Date(ctx.now.getTime() - DAY_MS).toISOString()
  const hourAgo = new Date(ctx.now.getTime() - HOUR_MS).toISOString()
  const [sameMatchVotes, votesLastHour] = await Promise.all([
    payload.find({
      collection: 'votes',
      where: {
        match: { equals: matchId },
        ipHash: { equals: ctx.ipHash },
        createdAt: { greater_than: dayAgo },
      },
      select: { deviceId: true },
      depth: 0,
      pagination: false,
    }),
    payload.count({
      collection: 'votes',
      where: { ipHash: { equals: ctx.ipHash }, createdAt: { greater_than: hourAgo } },
    }),
  ])
  const devicesForMatch = new Set(sameMatchVotes.docs.map((v) => v.deviceId))
  if (isRateLimited({ deviceId: ctx.deviceId, devicesForMatch, votesLastHour: votesLastHour.totalDocs })) {
    return fail('RATE_LIMITED')
  }

  if (state === 'too_early') return fail('TOO_EARLY')

  const scores = {
    spectacle: input.spectacle,
    intrigue: input.intrigue,
    technique: input.technique,
    refereeing: input.refereeing,
  }

  // Пишем сразу, а не «проверил — записал»: дубль не пустит уникальный индекс (match, deviceId)
  try {
    await payload.create({
      collection: 'votes',
      data: { match: matchId, deviceId: ctx.deviceId, ipHash: ctx.ipHash, ...scores },
    })
  } catch (error) {
    const existing = await payload.find({
      collection: 'votes',
      where: { match: { equals: matchId }, deviceId: { equals: ctx.deviceId } },
      depth: 0,
      limit: 1,
    })
    const id = existing.docs[0]?.id
    if (id === undefined) throw error
    await payload.update({ collection: 'votes', id, data: { ipHash: ctx.ipHash, ...scores } })
  }

  return ok
}
