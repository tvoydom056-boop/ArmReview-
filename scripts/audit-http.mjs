// Только локальная сборка аудита на фиксированном порту; см. docs/changes/project-audit.md.
import assert from 'node:assert/strict'

assert.equal(process.env.ARMREVIEW_AUDIT_HTTP, '1')
const origin = 'http://127.0.0.1:3107'
const input = { matchId: '1', spectacle: 4, intrigue: 4, technique: 4, refereeing: 4, website: '', openedAt: Date.now() - 5000 }
const headers = { 'content-type': 'application/json', 'x-client-ip': '192.0.2.111' }
async function request(path, options, expected) {
  const response = await fetch(origin + path, options)
  assert.equal(response.status, expected, path)
  return response
}

for (const path of ['/api/votes', '/api/users']) await request(path, undefined, 403)
for (const collection of ['athletes', 'events', 'matches', 'media', 'users', 'votes']) {
  await request(`/api/${collection}`, { method: 'POST', headers, body: '{}' }, 403)
}
const publicMatch = await (await request('/api/matches/1?depth=0', undefined, 200)).json()
assert.equal(publicMatch.score1, 3)
assert(!('deviceId' in publicMatch) && !('ipHash' in publicMatch))
console.log('PASS HTTP access: all anonymous collection writes denied; votes/users reads denied')

await request('/api/vote', { method: 'POST', headers, body: '{' }, 400)
await request('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }, 500)
const first = await request('/api/vote', { method: 'POST', headers, body: JSON.stringify(input) }, 200)
const cookie = first.headers.get('set-cookie')
assert(cookie?.includes('HttpOnly') && cookie.includes('Secure') && cookie.includes('SameSite=lax'))
await request('/api/vote', { method: 'POST', headers: { ...headers, cookie: cookie.split(';')[0] }, body: JSON.stringify({ ...input, spectacle: 2 }) }, 200)
const huge = await fetch(origin + '/api/vote', { method: 'POST', headers, body: JSON.stringify({ ...input, matchId: '9'.repeat(400) }) })
assert.equal(huge.status, 400)
assert.deepEqual(await huge.json(), { error: 'INVALID_INPUT' })
console.log('PASS huge matchId rejected with 400 INVALID_INPUT')
console.log('PASS HTTP vote: invalid JSON 400; missing trusted IP 500; create/update 200; cookie flags')

for (const path of ['/', '/athletes', '/events', '/top', '/privacy', '/contacts', '/matches/1', '/manifest.webmanifest']) {
  await request(path, undefined, 200)
}
await request('/matches/not-an-id', undefined, 404)
await request('/matches/' + '9'.repeat(400), undefined, 404)
const html = await (await request('/matches/1', undefined, 200)).text()
const visibleMarkup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
assert(visibleMarkup.includes('Показать счёт'))
assert(!visibleMarkup.includes('Победил Аудит Один'))
assert(!/<title>[^<]*(?:3:1|Победил)/.test(html))
console.log('PASS HTTP pages, SSR spoiler button and title; browser interaction not covered')
const imagePath = /property="og:image" content="([^"]+)"/.exec(html)?.[1]
assert(imagePath)
const og = await fetch(new URL(imagePath.replaceAll('&amp;', '&'), origin))
assert.equal(og.status, 200)
assert(og.headers.get('content-type')?.includes('image/png'))
console.log('PASS match OG image response')
