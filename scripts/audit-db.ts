// Проверка аудита на отдельной БД. Запуск и ограничения — docs/changes/project-audit.md.
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import type { SQLiteAdapter } from '@payloadcms/db-sqlite'

const uri = process.env.DATABASE_URI ?? ''
const target = path.resolve(uri.replace(/^file:/, ''))
const relative = path.relative(tmpdir(), target)
assert(uri.startsWith('file:') && !relative.startsWith('..') && !path.isAbsolute(relative))
assert(path.basename(path.dirname(target)).startsWith('armreview-audit-'))
assert.equal(process.env.ARMREVIEW_AUDIT_DATABASE, uri)
assert.equal(process.env.NODE_ENV, 'production')
assert(!process.env.DATABASE_AUTH_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN)

const { getPayloadClient } = await import('../src/lib/payload')
const { castVote } = await import('../src/features/voting/service')
const { getRatingsByMatch } = await import('../src/lib/queries/ratings')
const { sql } = await import('@payloadcms/db-sqlite/drizzle')
const { getTableConfig } = await import('@payloadcms/db-sqlite/drizzle/sqlite-core')
const payload = await getPayloadClient()
const isSqliteAdapter = (adapter: object): adapter is SQLiteAdapter => 'drizzle' in adapter
assert(isSqliteAdapter(payload.db))
const db = payload.db
// Проверяем конкретный установленный адаптер без подмены API.
const { default: config } = await import('../payload.config')
  const cfg = await config
assert.equal(cfg.db.name, 'sqlite')
const suffix = randomUUID().slice(0, 8)

try {
  assert.equal((await payload.count({ collection: 'matches' })).totalDocs, 0, 'Нужна новая пустая БД: рейтинг использует глобальное среднее')
  for (const table of Object.values(db.tables)) {
    const expected = getTableConfig(table)
    const columns = await db.drizzle.all<{ name: string; type: string; notnull: number }>(
      sql`SELECT name, type, "notnull" FROM pragma_table_info(${expected.name})`,
    )
    assert.deepEqual(columns.map(c => c.name).sort(), expected.columns.map(c => c.name).sort(), expected.name)
    for (const column of expected.columns) {
      const actual = columns.find(c => c.name === column.name)
      assert.equal(actual?.type.toLowerCase(), column.getSQLType().toLowerCase(), `${expected.name}.${column.name}`)
      assert.equal(Boolean(actual?.notnull), column.notNull, `${expected.name}.${column.name} NOT NULL`)
    }
    const indexes = await db.drizzle.all<{ name: string; unique: number }>(
      sql`SELECT name, "unique" FROM pragma_index_list(${expected.name})`,
    )
    for (const index of expected.indexes) {
      const actual = indexes.find(i => i.name === index.config.name)
      assert(actual, index.config.name)
      assert.equal(Boolean(actual.unique), index.config.unique, index.config.name)
    }
  }
  console.log('PASS migration schema: all adapter tables/columns/types/nullability and declared index names/uniqueness match')
  const athlete1 = await payload.create({ collection: 'athletes', data: {
    name: 'Аудит Один', slug: `audit-one-${suffix}`, countryCode: 'RU', isFeatured: true,
  } })
  const athlete2 = await payload.create({ collection: 'athletes', data: {
    name: 'Аудит Два', slug: `audit-two-${suffix}`, countryCode: 'RU',
  } })
  const event = await payload.create({ collection: 'events', data: {
    title: 'Турнир аудита', slug: `audit-event-${suffix}`, date: '2020-01-01T00:00:00.000Z',
  } })
  async function makeMatch(resultType: 'normal' | 'no_contest' = 'normal') {
    return payload.create({ collection: 'matches', data: {
      event: event.id, athlete1: athlete1.id, athlete2: athlete2.id, hand: 'right', resultType,
      ...(resultType === 'normal' ? { score1: 3, score2: 1, winner: athlete1.id } : {}),
    } })
  }
  const match = await makeMatch()
  const now = new Date()
  const scores = { spectacle: 5, intrigue: 5, technique: 5, refereeing: 5 }
  const input = { matchId: String(match.id), ...scores, website: '', openedAt: now.getTime() - 5000 }
  const ctx = { deviceId: `audit-${suffix}`, ipHash: `audit-hash-${suffix}`, now }
  const count = async (id = match.id) => (await payload.count({ collection: 'votes', where: { match: { equals: id } } })).totalDocs

  for (const collection of ['votes', 'users'] as const) {
    await assert.rejects(payload.find({ collection, overrideAccess: false, depth: 0 }), { status: 403 })
  }
  await assert.rejects(payload.create({ collection: 'athletes', overrideAccess: false,
    data: { name: 'Anonymous', slug: `anon-${suffix}`, countryCode: 'RU' } }), { status: 403 })
  const publicMatch = await payload.findByID({ collection: 'matches', id: match.id, overrideAccess: false, depth: 0 })
  assert.equal(publicMatch.score1, 3)
  assert.equal(publicMatch.title, 'Аудит Один vs Аудит Два')
  console.log('PASS access: anonymous votes/users/write denied; match result/title public')

  assert.deepEqual(await castVote({ ...input, website: 'bot' }, ctx), { ok: true })
  assert.deepEqual(await castVote({ ...input, openedAt: now.getTime() }, ctx), { ok: true })
  assert.equal(await count(), 0)
  assert.deepEqual(await castVote(input, ctx), { ok: true })
  assert.deepEqual(await castVote({ ...input, spectacle: 2 }, ctx), { ok: true })
  assert.equal(await count(), 1)
  const stored = await payload.find({ collection: 'votes', where: { match: { equals: match.id } }, depth: 0 })
  assert.equal(stored.docs[0].spectacle, 2)
  await payload.update({ collection: 'votes', id: stored.docs[0].id, data: { isHidden: true } })
  await castVote(input, ctx)
  assert.equal((await getRatingsByMatch()).has(match.id), false)
  await payload.update({ collection: 'votes', id: stored.docs[0].id, data: { isHidden: false } })
  assert.equal((await getRatingsByMatch()).get(match.id)?.score, null)
  console.log('PASS vote: honeypot/timer discard; update keeps one row and hidden moderation')

  for (let i = 0; i < 4; i++) assert.deepEqual(await castVote(input, { ...ctx, deviceId: `${ctx.deviceId}-${i}` }), { ok: true })
  assert.deepEqual(await castVote(input, { ...ctx, deviceId: `${ctx.deviceId}-sixth` }), { ok: false, code: 'RATE_LIMITED' })
  assert.equal((await getRatingsByMatch()).get(match.id)?.score, 4.3)
  const noContest = await makeMatch('no_contest')
  assert.deepEqual(await castVote({ ...input, matchId: String(noContest.id) }, ctx), { ok: false, code: 'NOT_VOTABLE' })
  console.log('PASS limits: sequential sixth device rejected; five votes score 4.3; no_contest rejected')

  const concurrent = await makeMatch()
  const sameDevice = await Promise.allSettled([0, 1].map(() => castVote({ ...input, matchId: String(concurrent.id) }, ctx)))
  assert.equal(await count(concurrent.id), 1)
  console.log('OBSERVED same-device concurrency', JSON.stringify(sameDevice.map(r => r.status === 'fulfilled' ? r.value : { rejected: true })))

  const race = await makeMatch()
  const raceResults = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => castVote(
    { ...input, matchId: String(race.id) }, { ...ctx, deviceId: `race-${suffix}-${i}`, ipHash: `race-${suffix}` },
  )))
  console.log('OBSERVED eight-device concurrency', JSON.stringify({ rows: await count(race.id),
    responses: raceResults.map(r => r.status === 'fulfilled' ? r.value : { rejected: true }) }))

  const oldMatch = await makeMatch()
  const oldVote = await payload.create({ collection: 'votes', data: { match: oldMatch.id, ...scores,
    deviceId: `old-${suffix}`, ipHash: `old-ip-${suffix}`, createdAt: '2020-01-01T00:00:00.000Z' } })
  // Обновление ipHash не меняет createdAt — воспроизводим потерю свежего действия из окна лимита.
  await castVote({ ...input, matchId: String(oldMatch.id) }, { ...ctx, deviceId: oldVote.deviceId, ipHash: `new-ip-${suffix}` })
  const recent = await payload.count({ collection: 'votes', where: { ipHash: { equals: `new-ip-${suffix}` },
    createdAt: { greater_than: new Date(now.getTime() - 3600000).toISOString() } } })
  assert.equal(recent.totalDocs, 0)
  console.log('OBSERVED old vote edited from new IP: recent count = 0')

  const hourlyMatch = await makeMatch()
  for (let i = 0; i < 60; i++) await payload.create({ collection: 'votes', data: {
    match: hourlyMatch.id, ...scores, deviceId: `hour-${suffix}-${i}`, ipHash: `hour-ip-${suffix}`,
  } })
  assert.deepEqual(await castVote({ ...input, matchId: String(oldMatch.id) }, {
    ...ctx, deviceId: oldVote.deviceId, ipHash: `hour-ip-${suffix}`,
  }), { ok: false, code: 'RATE_LIMITED' })
  console.log('OBSERVED old existing device cannot edit after changing to IP with 60 new votes/hour')
  await assert.rejects(payload.delete({ collection: 'matches', id: hourlyMatch.id }))
  console.log('OBSERVED deleting a match with votes fails (NOT NULL relationship + ON DELETE SET NULL)')

  // PRAGMA читают только временную БД; raw SQL используется исключительно для диагностики.
  if ('all' in db.drizzle && typeof db.drizzle.all === 'function') {
    console.log('PRAGMA integrity_check', JSON.stringify(await db.drizzle.all(sql`PRAGMA integrity_check`)))
    console.log('PRAGMA foreign_key_check', JSON.stringify(await db.drizzle.all(sql`PRAGMA foreign_key_check`)))
    console.log('PRAGMA votes indexes', JSON.stringify(await db.drizzle.all(sql`PRAGMA index_list(votes)`)))
    console.log('EXPLAIN ratings', JSON.stringify(await db.drizzle.all(sql`EXPLAIN QUERY PLAN SELECT match_id, COUNT(*) FROM votes WHERE COALESCE(is_hidden, 0) = 0 GROUP BY match_id`)))
  }
  console.log('FIXTURES', JSON.stringify({ matchId: match.id, eventSlug: event.slug, athleteSlug: athlete1.slug }))
} finally {
  await payload.destroy()
}
