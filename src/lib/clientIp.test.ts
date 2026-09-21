import { describe, expect, it } from 'vitest'

import { getClientIp } from './clientIp'

const prod = { isProduction: true }

describe('getClientIp', () => {
  it('берёт IP из заголовка Caddy', () => {
    expect(getClientIp(new Headers({ 'x-client-ip': ' 5.6.7.8 ' }), prod)).toBe('5.6.7.8')
  })

  it('не доверяет x-forwarded-for, который подделывается клиентом', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '9.9.9.9' }), prod)).toBeNull()
  })

  it('без заголовка: в dev — заглушка, в production — null', () => {
    expect(getClientIp(new Headers(), { isProduction: false })).toBe('127.0.0.1')
    expect(getClientIp(new Headers(), prod)).toBeNull()
  })

  it('x-real-ip принимает только на Vercel', () => {
    const headers = new Headers({ 'x-real-ip': '1.2.3.4' })
    expect(getClientIp(headers, { isProduction: true, isVercel: true })).toBe('1.2.3.4')
    expect(getClientIp(headers, prod)).toBeNull()
  })

  it('на Vercel игнорирует присланный клиентом заголовок Caddy', () => {
    const headers = new Headers({ 'x-client-ip': '5.6.7.8', 'x-real-ip': '1.2.3.4' })
    expect(getClientIp(headers, { isProduction: true, isVercel: true })).toBe('1.2.3.4')
    expect(getClientIp(headers, prod)).toBe('5.6.7.8')
  })

  it('на Vercel без заголовка платформы не откатывается к заголовку Caddy', () => {
    expect(getClientIp(new Headers({ 'x-client-ip': '5.6.7.8' }), {
      isProduction: true, isVercel: true,
    })).toBeNull()
  })

  it('пустой заголовок платформы не заменяется недоверенным значением', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': ' ', 'x-client-ip': '5.6.7.8' }), {
      isProduction: true, isVercel: true,
    })).toBeNull()
  })
})
