// Защита POST-роутов от запросов с чужого сайта (CSRF). Для голосования это накрутка: страница
// злоумышленника отправляет голос из браузера посетителя — с его IP, в обход лимитов по ipHash
// (docs/changes/security-audit-2026-09.md, S2).
// Алгоритм как у Go net/http CrossOriginProtection: Sec-Fetch-Site шлют все современные браузеры;
// без него сверяем Origin с Host; без обоих — не браузер, и чужой IP он подставить не может.
export type SameOriginCheck = 'ok' | 'cross_origin' | 'not_json'

export function checkSameOriginJson(headers: Headers): SameOriginCheck {
  const fetchSite = headers.get('sec-fetch-site')
  if (fetchSite !== null) {
    // same-site тоже чужой: поддомен (например, staging) — другой сайт с точки зрения доверия
    if (fetchSite !== 'same-origin') return 'cross_origin'
  } else {
    const origin = headers.get('origin')
    if (origin !== null && !isSameHost(origin, headers.get('host'))) return 'cross_origin'
  }

  // text/plain и формы не вызывают CORS-preflight — принимаем только JSON (его чужой сайт без preflight не пошлёт)
  const mediaType = headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  return mediaType === 'application/json' ? 'ok' : 'not_json'
}

function isSameHost(origin: string, host: string | null): boolean {
  if (host === null) return false
  try {
    return new URL(origin).host === host
  } catch {
    // Origin: null (sandbox-iframe, file://) не парсится — считаем чужим
    return false
  }
}
