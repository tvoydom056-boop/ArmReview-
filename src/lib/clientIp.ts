// IP берём только из заголовков, которые выставляет НАША инфраструктура (PROJECT.md § 9):
//  - VPS: Caddy — reverse_proxy localhost:3000 { header_up X-Client-IP {remote_host} }.
//    header_up перезаписывает значение, пришедшее от клиента, поэтому подделать его снаружи нельзя.
//  - Vercel: платформа сама выставляет x-real-ip и перезаписывает присланное клиентом. Доверяем ему
//    только когда приложение реально запущено на Vercel (process.env.VERCEL) — на VPS этот заголовок подделывается.
export const CLIENT_IP_HEADER = 'x-client-ip'
export const VERCEL_IP_HEADER = 'x-real-ip'

type Options = { isProduction: boolean; isVercel?: boolean }

// В production без доверенного заголовка — null: молча склеить всех в один ipHash хуже, чем упасть и заметить
export function getClientIp(headers: Headers, { isProduction, isVercel = false }: Options): string | null {
  // Граница доверия зависит от хостинга: на Vercel X-Client-IP присылает сам клиент.
  // Между заголовками разных прокси fallback недопустим (PROJECT.md § 9).
  const value = headers.get(isVercel ? VERCEL_IP_HEADER : CLIENT_IP_HEADER)?.trim()
  if (value) return value
  return isProduction ? null : '127.0.0.1'
}
