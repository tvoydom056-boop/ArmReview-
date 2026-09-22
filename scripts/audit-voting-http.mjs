// Только сервер 127.0.0.1:3107 с той же временной БД после audit-db.ts.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createClient } from '@libsql/client'

const uri = process.env.DATABASE_URI ?? ''
const target = path.resolve(uri.replace(/^file:/, ''))
const relative = path.relative(tmpdir(), target)
assert(uri.startsWith('file:') && !relative.startsWith('..') && !path.isAbsolute(relative))
assert(path.basename(path.dirname(target)).startsWith('armreview-audit-'))
assert.equal(process.env.ARMREVIEW_AUDIT_DATABASE, uri)
assert.equal(process.env.ARMREVIEW_AUDIT_HTTP, '1')
assert(!process.env.DATABASE_AUTH_TOKEN && !process.env.BLOB_READ_WRITE_TOKEN)
const db = createClient({ url: uri })
const origin = 'http://127.0.0.1:3107'
const headers = { 'content-type': 'application/json', 'x-client-ip': '192.0.2.201' }
const input = { matchId: '1', spectacle: 1, intrigue: 2, technique: 3, refereeing: 4, openedAt: Date.now() - 10000 }
const cookie = () => `armreview_device=${randomBytes(16).toString('hex')}`
const device = cookie()
const deviceRows = async (cookieValue) => (await db.execute({ sql: 'SELECT * FROM votes WHERE device_id = ?', args: [cookieValue.split('=')[1]] })).rows
async function vote(body, deviceCookie = device, ipHeaders = headers) {
  const response = await fetch(origin + '/api/vote', {
    method: 'POST', headers: { ...ipHeaders, cookie: deviceCookie }, body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

try {
  assert.deepEqual(await vote(input), { status: 200, body: { ok: true } })
  const [before] = await deviceRows(device)
  assert(before, 'HTTP server must use exactly this temporary database')
  assert.equal(before.is_hidden, 0)
  assert.deepEqual(await vote({ ...input, spectacle: 5, intrigue: 4, technique: 2, refereeing: 1 }, device,
    { ...headers, 'x-client-ip': '192.0.2.202' }), { status: 200, body: { ok: true } })
  const [after] = await deviceRows(device)
  assert.equal((await deviceRows(device)).length, 1)
  for (const key of ['id', 'created_at', 'ip_hash', 'is_hidden']) assert.equal(after[key], before[key])
  assert.deepEqual([after.spectacle, after.intrigue, after.technique, after.refereeing], [5, 4, 2, 1])
  assert(after.updated_at > before.updated_at)
  console.log('PASS HTTP create/revote: one row, all scores changed, original metadata retained across IP change')

  const faults = ['SQLITE_IOERR', 'SQLITE_CONSTRAINT']
  for (const fault of faults) {
    // Настоящий abort до UPSERT; в тексте ошибки нет данных пользователя.
    await db.execute(`CREATE TRIGGER audit_http_failure BEFORE INSERT ON votes BEGIN SELECT RAISE(ABORT, '${fault} audit fault'); END`)
    const newDevice = cookie()
    try {
      for (const current of [device, newDevice]) {
        assert.deepEqual(await vote({ ...input, spectacle: 3 }, current), { status: 500, body: { error: 'INTERNAL_ERROR' } })
      }
    } finally { await db.execute('DROP TRIGGER audit_http_failure') }
    assert.deepEqual(await deviceRows(device), [after])
    assert.deepEqual(await deviceRows(newDevice), [])
  }
  // Настоящая блокировка другим соединением должна завершиться 500, без запасного update.
  await db.execute('BEGIN IMMEDIATE')
  try { assert.deepEqual(await vote(input), { status: 500, body: { error: 'INTERNAL_ERROR' } }) }
  finally { await db.execute('ROLLBACK') }
  assert.deepEqual(await deviceRows(device), [after])
  console.log('PASS HTTP B5: injected DB abort and real write lock -> controlled 500, no mutation')

  const nc = (await db.execute("SELECT id FROM matches WHERE result_type = 'no_contest' LIMIT 1")).rows[0]
  const future = (await db.execute("SELECT m.id FROM matches m JOIN events e ON e.id=m.event_id WHERE e.slug='audit-b6-future' LIMIT 1")).rows[0]
  assert(nc && future)
  const bot = cookie()
  assert.deepEqual(await vote({ ...input, website: 'bot' }, bot), { status: 200, body: { ok: true } })
  assert.deepEqual(await vote({ ...input, openedAt: Date.now() + 60000 }, bot), { status: 200, body: { ok: true } })
  assert.deepEqual(await vote({ ...input, matchId: String(nc.id) }, bot), { status: 409, body: { error: 'NOT_VOTABLE' } })
  assert.deepEqual(await vote({ ...input, matchId: String(future.id) }, bot), { status: 409, body: { error: 'TOO_EARLY' } })
  assert.deepEqual(await deviceRows(bot), [])
  console.log('PASS HTTP B6: honeypot/fast POST 200, no_contest/future 409, no rows')

  const raceHeaders = { ...headers, 'x-client-ip': '192.0.2.203' }
  const devices = Array.from({ length: 8 }, cookie)
  const results = await Promise.all(devices.map(d => vote(input, d, raceHeaders)))
  assert.equal(results.filter(r => r.status === 200 && r.body.ok === true).length, 5)
  assert.equal(results.filter(r => r.status === 429 && r.body.error === 'RATE_LIMITED').length, 3)
  const saved = await Promise.all(devices.map(deviceRows))
  assert.equal(saved.flat().length, 5)
  const repeated = devices[saved.findIndex(rows => rows.length === 1)]
  assert.deepEqual(await Promise.all([2, 5].map(spectacle => vote({ ...input, spectacle }, repeated, raceHeaders))),
    [{ status: 200, body: { ok: true } }, { status: 200, body: { ok: true } }])
  assert.equal((await deviceRows(repeated)).length, 1)
  console.log('PASS HTTP B1/B3: 5 success + 3 RATE_LIMITED; concurrent repeat at full quota succeeds twice')
} finally { db.close() }
