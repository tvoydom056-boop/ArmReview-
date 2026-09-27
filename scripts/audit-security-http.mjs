// Локальные проверки безопасности ArmReview (dev-сервер). Ничего не пишет в БД:
// голос отправляется только с заполненным honeypot — service отвечает 200 без записи.
const BASE = process.env.BASE ?? 'http://localhost:3001'
const out = (name, value) => console.log(`${name.padEnd(34)} ${typeof value === 'string' ? value : JSON.stringify(value)}`)

async function req(path, init = {}) {
  const t = performance.now()
  const res = await fetch(BASE + path, { redirect: 'manual', ...init })
  const text = await res.text()
  return { status: res.status, headers: res.headers, text, ms: Math.round(performance.now() - t) }
}

// 1–3. Закрытые коллекции и состояние bootstrap
for (const p of ['/api/votes', '/api/users', '/api/users/me', '/api/users/init', '/api/graphql']) {
  const r = await req(p)
  out(`GET ${p}`, `${r.status} ${r.text.slice(0, 120)}`)
}

// 4. Какие поля матча видит аноним
const m = await req('/api/matches?limit=1&depth=0')
const match = JSON.parse(m.text).docs?.[0]
out('GET /api/matches fields', match ? Object.keys(match) : 'нет матчей')
out('  score/winner/notes public?', match ? { score1: match.score1, winner: match.winner, notes: match.notes ?? null } : '-')

// 5. Запись в публичную коллекцию без авторизации
const w = await req('/api/athletes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"probe","countryCode":"RU"}' })
out('POST /api/athletes (anon)', `${w.status} ${w.text.slice(0, 100)}`)

// 6. CSRF: кросс-сайтовый «простой» запрос (text/plain без preflight), honeypot заполнен → без записи
const vote = { matchId: String(match?.id ?? 1), spectacle: 5, intrigue: 5, technique: 5, refereeing: 5, openedAt: Date.now() - 60_000, website: 'x' }
const csrfHeaders = { 'content-type': 'text/plain;charset=UTF-8', origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }
const c1 = await req('/api/vote', { method: 'POST', headers: csrfHeaders, body: JSON.stringify(vote) })
out('POST /api/vote text/plain+evil', `${c1.status} ${c1.text} set-cookie=${c1.headers.get('set-cookie') ? 'yes' : 'no'} (ждём 403)`)
const c2 = await req('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify(vote) })
out('  json + чужой Origin', `${c2.status} ${c2.text} (ждём 403)`)
const c3 = await req('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-site' }, body: JSON.stringify(vote) })
out('  json + same-site (поддомен)', `${c3.status} ${c3.text} (ждём 403)`)
const c4 = await req('/api/vote', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(vote) })
out('  text/plain без Origin', `${c4.status} ${c4.text} (ждём 415)`)
const c5 = await req('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify(vote) })
out('  свой сайт, honeypot', `${c5.status} ${c5.text} (ждём 200, без записи)`)

// 7. Размер тела: 30 МБ мусора
const big = 'x'.repeat(30 * 1024 * 1024)
const b = await req('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: big })
out('POST /api/vote 30MB body', `${b.status} за ${b.ms} мс`)

// 8. Заголовки ответа страницы
const home = await req('/')
const h = (n) => home.headers.get(n) ?? '—'
out('GET / status', home.status)
for (const n of ['x-powered-by', 'content-security-policy', 'x-frame-options', 'strict-transport-security', 'x-content-type-options', 'referrer-policy']) out(`  ${n}`, h(n))

// 9. Стоимость OG-картинки
if (match) {
  const times = []
  let cc = ''
  for (let i = 0; i < 5; i++) {
    const r = await req(`/matches/${match.id}/opengraph-image`)
    times.push(r.ms)
    cc = `${r.status} cache-control=${r.headers.get('cache-control')}`
  }
  out('OG image x5 (ms)', `${times.join(', ')} | ${cc}`)
}

// 10. SSRF через оптимизатор картинок
const ssrf = await req('/_next/image?url=' + encodeURIComponent('http://169.254.169.254/latest/meta-data/') + '&w=64&q=75')
out('/_next/image external url', `${ssrf.status} ${ssrf.text.slice(0, 80)}`)

// 11. Перечисление пользователей через forgot-password (несуществующий адрес)
const fp = await req('/api/users/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"email":"nobody-probe@example.invalid"}' })
out('forgot-password (unknown email)', `${fp.status} ${fp.text.slice(0, 120)}`)

// 12. Массовая выборка публичных данных
const all = await req('/api/matches?limit=100000&depth=3&pagination=false')
out('GET /api/matches limit=1e5 depth=3', `${all.status} ${all.text.length} байт за ${all.ms} мс`)
