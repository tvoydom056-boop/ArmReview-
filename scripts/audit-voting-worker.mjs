import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from '@payloadcms/db-sqlite/drizzle/libsql'
import { tsImport } from 'tsx/esm/api'

const { uri, input, ctx, busyTimeout } = JSON.parse(process.argv[2])
const target = path.resolve(uri.replace(/^file:/, ''))
const relative = path.relative(tmpdir(), target)
assert(uri.startsWith('file:') && !relative.startsWith('..') && !path.isAbsolute(relative))
assert(path.basename(path.dirname(target)).startsWith('armreview-audit-'))
assert.equal(process.env.ARMREVIEW_AUDIT_DATABASE, uri)
const client = createClient({ url: uri })
const db = drizzle(client)
const { writeVote } = await tsImport('../src/features/voting/writeVote.ts', import.meta.url)
await client.execute('PRAGMA foreign_keys = ON')
assert(Number.isSafeInteger(busyTimeout) && busyTimeout >= 0)
await client.execute(`PRAGMA busy_timeout = ${busyTimeout}`)
process.once('message', async () => {
  let result
  try {
    const written = await writeVote(db, input, { ...ctx, now: new Date(ctx.now) })
    result = written ? { ok: true } : { ok: false, code: 'RATE_LIMITED' }
  } catch (error) {
    result = { error: String(error) }
  } finally {
    client.close()
  }
  process.send(result, () => process.disconnect())
})
process.send('ready')
