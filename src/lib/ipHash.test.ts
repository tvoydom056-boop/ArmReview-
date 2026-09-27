import { describe, expect, it } from 'vitest'

import { hashIp, toRateLimitKey } from './ipHash'

describe('hashIp', () => {
  it('детерминирован и выдаёт sha256 в hex', () => {
    expect(hashIp('1.2.3.4', 'salt')).toBe(hashIp('1.2.3.4', 'salt'))
    expect(hashIp('1.2.3.4', 'salt')).toMatch(/^[a-f0-9]{64}$/)
  })

  it('зависит и от IP, и от соли, и не содержит сырой IP', () => {
    expect(hashIp('1.2.3.4', 'salt')).not.toBe(hashIp('1.2.3.5', 'salt'))
    expect(hashIp('1.2.3.4', 'salt')).not.toBe(hashIp('1.2.3.4', 'other'))
    expect(hashIp('1.2.3.4', 'salt')).not.toContain('1.2.3.4')
  })

  it('адреса одной IPv6-сети /64 дают один хеш, соседней /64 — другой', () => {
    expect(hashIp('2001:db8:abcd:12::1', 'salt')).toBe(hashIp('2001:db8:abcd:12:ffff:ffff:ffff:ffff', 'salt'))
    expect(hashIp('2001:db8:abcd:12::1', 'salt')).not.toBe(hashIp('2001:db8:abcd:13::1', 'salt'))
  })
})

describe('toRateLimitKey', () => {
  it('IPv4 — сам адрес', () => {
    expect(toRateLimitKey(' 1.2.3.4 ')).toBe('1.2.3.4')
  })

  it('IPv6 — сеть /64 в одной записи для любой формы адреса', () => {
    const key = '2001:db8:0:0::/64'
    for (const ip of ['2001:db8::1', '2001:0DB8:0000:0000:0000:0000:0000:0001', '[2001:db8::2]', '2001:db8::ffff:1.2.3.4']) {
      expect(toRateLimitKey(ip)).toBe(key)
    }
    expect(toRateLimitKey('2001:db8:abcd:12:1:2:3:4')).toBe('2001:db8:abcd:12::/64')
    expect(toRateLimitKey('fe80::1%eth0')).toBe('fe80:0:0:0::/64')
  })

  it('IPv4 внутри IPv6 — как обычный IPv4', () => {
    expect(toRateLimitKey('::ffff:1.2.3.4')).toBe('1.2.3.4')
    expect(toRateLimitKey('::ffff:0102:0304')).toBe('1.2.3.4')
  })

  it('не IP (сломанный прокси) — строка как есть, без исключения', () => {
    expect(toRateLimitKey('unknown')).toBe('unknown')
  })
})
