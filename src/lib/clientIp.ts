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
  const value = (headers.get(CLIENT_IP_HEADER) ?? (isVercel ? headers.get(VERCEL_IP_HEADER) : null))?.trim()
  if (value) return value
  return isProduction ? null : '127.0.0.1'
}
