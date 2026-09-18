// IP берём ТОЛЬКО из заголовка, который выставляет наш Caddy (PROJECT.md § 9):
//   reverse_proxy localhost:3000 { header_up X-Client-IP {remote_host} }
// header_up перезаписывает значение, пришедшее от клиента, поэтому подделать его снаружи нельзя.
export const CLIENT_IP_HEADER = 'x-client-ip'

// В production без заголовка — null: молча склеить всех в один ipHash хуже, чем упасть и заметить
export function getClientIp(headers: Headers, isProduction: boolean): string | null {
  const value = headers.get(CLIENT_IP_HEADER)?.trim()
  if (value) return value
  return isProduction ? null : '127.0.0.1'
}
