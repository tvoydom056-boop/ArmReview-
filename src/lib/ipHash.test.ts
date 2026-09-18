import { describe, expect, it } from 'vitest'

import { hashIp } from './ipHash'

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
})
