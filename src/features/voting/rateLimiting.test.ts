import { describe, expect, it } from 'vitest'

import { isRateLimited } from './rateLimiting'

const devices = (n: number) => new Set(Array.from({ length: n }, (_, i) => `d${i}`))

describe('isRateLimited', () => {
  it('пропускает, пока устройств меньше 5 и голосов в час меньше 60', () => {
    expect(isRateLimited({ deviceId: 'new', devicesForMatch: devices(4), votesLastHour: 59 })).toBe(false)
  })

  it('шестое устройство на один матч с одного ipHash — лимит', () => {
    expect(isRateLimited({ deviceId: 'new', devicesForMatch: devices(5), votesLastHour: 0 })).toBe(true)
  })

  it('60 голосов в час с одного ipHash — лимит', () => {
    expect(isRateLimited({ deviceId: 'new', devicesForMatch: devices(0), votesLastHour: 60 })).toBe(true)
  })

  it('повторный голос известного устройства лимитом не блокируется', () => {
    expect(isRateLimited({ deviceId: 'd0', devicesForMatch: devices(5), votesLastHour: 100 })).toBe(false)
  })
})
