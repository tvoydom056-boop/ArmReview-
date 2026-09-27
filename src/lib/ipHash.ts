import { createHash } from 'node:crypto'
import { isIPv4, isIPv6 } from 'node:net'

// Сырой IP не храним и не логируем — это ПД (PROJECT.md § 7); в базу идёт только хеш с солью
export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(toRateLimitKey(ip) + salt).digest('hex')
}

// Лимиты считаем по сети клиента, а не по адресу: IPv6 выдают целой /64 (2⁶⁴ адресов), и смена адреса
// внутри неё обходила бы лимиты по ipHash (docs/changes/security-audit-2026-09.md, S4).
// IPv4 внутри IPv6 (::ffff:1.2.3.4) — тот же клиент, что и 1.2.3.4.
export function toRateLimitKey(ip: string): string {
  const address = ip.trim().replace(/^\[|\]$/g, '').split('%')[0]
  if (!isIPv6(address)) return address

  const groups = expandIpv6(address)
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff].join('.')
  }
  return `${groups.slice(0, 4).map((group) => group.toString(16)).join(':')}::/64`
}

// «2001:db8::1» → 8 чисел по 16 бит; хвост вида 1.2.3.4 даёт две последние группы.
// Адрес уже проверен isIPv6, поэтому разбор без обработки ошибок
function expandIpv6(address: string): number[] {
  const parse = (part: string): number[] =>
    part === ''
      ? []
      : part.split(':').flatMap((group) => {
          if (!isIPv4(group)) return [parseInt(group, 16)]
          const [a, b, c, d] = group.split('.').map(Number)
          return [(a << 8) | b, (c << 8) | d]
        })

  const [head, tail] = address.split('::')
  if (tail === undefined) return parse(head)
  const headGroups = parse(head)
  const tailGroups = parse(tail)
  return [...headGroups, ...Array<number>(8 - headGroups.length - tailGroups.length).fill(0), ...tailGroups]
}
