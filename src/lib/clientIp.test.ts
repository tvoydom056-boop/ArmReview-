import { describe, expect, it } from 'vitest'

import { getClientIp } from './clientIp'

describe('getClientIp', () => {
  it('берёт IP из заголовка Caddy', () => {
    expect(getClientIp(new Headers({ 'x-client-ip': ' 5.6.7.8 ' }), true)).toBe('5.6.7.8')
  })

  it('не доверяет x-forwarded-for, который подделывается клиентом', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '9.9.9.9' }), true)).toBeNull()
  })

  it('без заголовка: в dev — заглушка, в production — null', () => {
    expect(getClientIp(new Headers(), false)).toBe('127.0.0.1')
    expect(getClientIp(new Headers(), true)).toBeNull()
  })
})
