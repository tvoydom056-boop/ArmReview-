import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import type { Payload } from 'payload'
import type { SQLiteAdapter } from '@payloadcms/db-sqlite'
import { sql } from '@payloadcms/db-sqlite/drizzle'

import { castVote, type VoteContext } from '../src/features/voting/service'
import { writeVote } from '../src/features/voting/writeVote'
import type { VoteInput } from '../src/features/voting/schema'
import { DAY_MS, HOUR_MS } from '../src/features/voting/rateLimiting'

// Только после guard/migrations/schema checks в audit-db.ts.
export async function auditVoting(payload: Payload, db: SQLiteAdapter, makeMatch: () => Promise<{ id: number }>) {
  const now = new Date()
  const scores = { spectacle: 4, intrigue: 3, technique: 2, refereeing: 1 }
  const inputFor = (id: number): VoteInput => ({ matchId: String(id), ...scores, openedAt: now.getTime() - 5000 })
  const context = (deviceId: string, ipHash: string): VoteContext => ({ deviceId, ipHash, now })
  const count = async (ipHash: string) => (await payload.count({ collection: 'votes', where: { ipHash: { equals: ipHash } } })).totalDocs
  const rows = async (id: number) => (await payload.find({ collection: 'votes', where: { match: { equals: id } }, depth: 0, pagination: false })).docs
  async function seed(match: number, ipHash: string, n: number, createdAt = now.toISOString(), isHidden = false) {
    for (let i = 0; i < n; i++) await payload.create({ collection: 'votes', data: {
      match, ...scores, deviceId: `${ipHash}-${match}-${i}`, ipHash, createdAt, isHidden,
    } })
  }
  async function concurrent(jobs: { input: VoteInput; ctx: VoteContext }[]) {
    const workers = jobs.map(job => fork(new URL('./audit-voting-worker.mjs', import.meta.url),
      [JSON.stringify({ uri: process.env.DATABASE_URI, busyTimeout: db.busyTimeout, ...job })], { execArgv: [], windowsHide: true }))
    let timer: ReturnType<typeof setTimeout>
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Worker timeout')), 30000) })
    try {
      await Promise.race([timeout, Promise.all(workers.map(async worker => {
        const [ready] = await once(worker, 'message')
        assert.equal(ready, 'ready')
      }))])
      const results = workers.map(worker => once(worker, 'message'))
      for (const worker of workers) worker.send('start')
      return (await Promise.race([timeout, Promise.all(results)])).map(([result]) => result)
    } finally {
      clearTimeout(timer!)
      for (const worker of workers) worker.kill()
    }
  }

  const b1 = await makeMatch()
  const b1Results = await concurrent(Array.from({ length: 8 }, (_, i) => ({ input: inputFor(b1.id), ctx: context(`b1-${i}`, 'b1') })))
  assert.equal(b1Results.filter(r => r.ok === true).length, 5)
  assert.equal(b1Results.filter(r => r.code === 'RATE_LIMITED').length, 3)
  assert.equal(await count('b1'), 5)
  console.log('PASS B1 independent connections: 5 success, 3 RATE_LIMITED, 5 rows')

  // 59 голосов распределены по матчам, не нарушая квоту 5/матч.
  for (let i = 0; i < 12; i++) await seed((await makeMatch()).id, 'b2', i === 11 ? 4 : 5)
  const b2 = await makeMatch()
  const b2Results = await concurrent([0, 1].map(i => ({ input: inputFor(b2.id), ctx: context(`b2-new-${i}`, 'b2') })))
  assert.equal(b2Results.filter(r => r.ok === true).length, 1)
  assert.equal(b2Results.filter(r => r.code === 'RATE_LIMITED').length, 1)
  assert.equal(await count('b2'), 60)
  console.log('PASS B2 independent connections: 59 -> 60, one RATE_LIMITED')

  const b3 = await makeMatch()
  const same = [1, 5].map(spectacle => ({ input: { ...inputFor(b3.id), spectacle }, ctx: context('b3', 'b3') }))
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(await concurrent(same), [{ ok: true }, { ok: true }])
    assert.equal(await count('b3'), 1)
    assert([1, 5].includes((await rows(b3.id))[0].spectacle))
  }
  console.log('PASS B3 independent connections: same new/existing pair, both success, one row')

  const b4 = await makeMatch()
  await seed(b4.id, 'b4-new-ip', 5, now.toISOString(), true)
  for (let i = 0; i < 11; i++) await seed((await makeMatch()).id, 'b4-new-ip', 5, now.toISOString(), true)
  for (const isHidden of [false, true]) {
    const old = await payload.create({ collection: 'votes', data: {
      match: b4.id, ...scores, deviceId: `b4-old-${isHidden}`, ipHash: 'b4-original', isHidden,
      createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z',
    } })
    const before = await payload.findByID({ collection: 'votes', id: old.id, depth: 0 })
    const editCtx = { ...context(old.deviceId, 'b4-new-ip'), now: new Date(now.getTime() + 1000) }
    assert.deepEqual(await castVote({ ...inputFor(b4.id), spectacle: 1, intrigue: 2, technique: 3, refereeing: 5 }, editCtx), { ok: true })
    const after = await payload.findByID({ collection: 'votes', id: old.id, depth: 0 })
    for (const field of ['id', 'createdAt', 'ipHash', 'isHidden'] as const) assert.equal(after[field], before[field], field)
    assert.equal(after.updatedAt, editCtx.now.toISOString())
    assert.notEqual(after.updatedAt, before.updatedAt)
    assert.deepEqual([after.spectacle, after.intrigue, after.technique, after.refereeing], [1, 2, 3, 5])
  }
  assert.equal(await count('b4-new-ip'), 60)
  assert.equal(await count('b4-original'), 2)
  assert.deepEqual(await castVote(inputFor(b4.id), context('b4-new', 'b4-new-ip')), { ok: false, code: 'RATE_LIMITED' })
  console.log('PASS B4 old visible/hidden votes: both quotas full, fields preserved; hidden votes count')

  const b5 = await makeMatch()
  const b5Input = inputFor(b5.id)
  const b5Ctx = context('b5', 'b5')
  await castVote(b5Input, b5Ctx)
  const beforeFailure = await rows(b5.id)
  await db.drizzle.run(sql`CREATE TRIGGER audit_vote_failure BEFORE INSERT ON votes BEGIN SELECT RAISE(ABORT, 'audit fault'); END`)
  try {
    await assert.rejects(castVote({ ...b5Input, spectacle: 5 }, b5Ctx))
    await assert.rejects(castVote(b5Input, context('b5-new', 'b5')))
  } finally { await db.drizzle.run(sql`DROP TRIGGER audit_vote_failure`) }
  assert.deepEqual(await rows(b5.id), beforeFailure)
  const realAll = db.drizzle.all.bind(db.drizzle)
  for (const code of ['SQLITE_IOERR', 'SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_BUSY']) {
    let attempts = 0
    db.drizzle.all = () => { attempts++; throw Object.assign(new Error('audit fault'), { code }) }
    try {
      await assert.rejects(writeVote(db.drizzle, b5Input, b5Ctx))
      assert.equal(attempts, 1)
    } finally { db.drizzle.all = realAll }
  }
  console.log('PASS B5 DB abort propagates, no fallback/update/retry; all errors one attempt')

  const eligible = await makeMatch()
  const future = await payload.create({ collection: 'events', data: {
    title: 'Будущий аудит B6', slug: 'audit-b6-future', date: '2099-01-01T00:00:00.000Z',
  } })
  const futureMatch = await makeMatch()
  await payload.update({ collection: 'matches', id: futureMatch.id, data: { event: future.id } })
  const nc = await makeMatch()
  await payload.update({ collection: 'matches', id: nc.id, data: { resultType: 'no_contest', winner: null, score1: null, score2: null } })
  const b6Ctx = context('b6', 'b6')
  assert.deepEqual(await castVote({ ...inputFor(eligible.id), website: 'bot' }, b6Ctx), { ok: true })
  assert.deepEqual(await castVote({ ...inputFor(eligible.id), openedAt: now.getTime() }, b6Ctx), { ok: true })
  assert.deepEqual(await castVote(inputFor(nc.id), b6Ctx), { ok: false, code: 'NOT_VOTABLE' })
  assert.deepEqual(await castVote(inputFor(futureMatch.id), b6Ctx), { ok: false, code: 'TOO_EARLY' })
  assert.equal(await count('b6'), 0)
  for (const [id, code] of [[nc.id, 'NOT_VOTABLE'], [futureMatch.id, 'TOO_EARLY']] as const) {
    await seed(id, 'b6-repeat', 1)
    const before = await rows(id)
    assert.deepEqual(await castVote(inputFor(id), context(`b6-repeat-${id}-0`, 'b6-repeat')), { ok: false, code })
    assert.deepEqual(await rows(id), before)
  }
  console.log('PASS B6 honeypot/timer discard; no_contest/future reject new and repeated votes')

  for (const [window, limit] of [[HOUR_MS, 60], [DAY_MS, 5]]) {
    for (const offset of [-1, 0, 1]) {
      const match = await makeMatch()
      const ip = `boundary-${window}-${offset}`
      const createdAt = new Date(now.getTime() - window + offset).toISOString()
      if (window === HOUR_MS) {
        for (let i = 0; i < 12; i++) await seed((await makeMatch()).id, ip, 5, createdAt)
      } else await seed(match.id, ip, limit, createdAt)
      assert.deepEqual(await castVote(inputFor(match.id), context(`${ip}-new`, ip)),
        offset > 0 ? { ok: false, code: 'RATE_LIMITED' } : { ok: true })
    }
  }
  assert.deepEqual(await castVote(inputFor(b1.id), context('independent-ip', 'independent-ip')), { ok: true })
  assert.deepEqual(await castVote(inputFor(b1.id), context("device' OR 1=1 --", "ip'")), { ok: true })
  assert.equal(await count("ip'"), 1)
  console.log('PASS boundaries at +/-1ms, independent IP, parameterized values')
  console.log('HTTP_FIXTURES', JSON.stringify({ normal: eligible.id, noContest: nc.id, future: futureMatch.id }))
}
