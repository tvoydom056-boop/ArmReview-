import { describe, expect, it } from 'vitest'

import { voteInputSchema } from './schema'

const valid = {
  matchId: '12',
  spectacle: 5,
  intrigue: 4,
  technique: 3,
  refereeing: 2,
  openedAt: 1_700_000_000_000,
}

describe('voteInputSchema', () => {
  it('принимает корректный голос', () => {
    expect(voteInputSchema.safeParse(valid).success).toBe(true)
  })

  it('отклоняет оценки вне 1–5 и нецелые', () => {
    expect(voteInputSchema.safeParse({ ...valid, spectacle: 0 }).success).toBe(false)
    expect(voteInputSchema.safeParse({ ...valid, intrigue: 6 }).success).toBe(false)
    expect(voteInputSchema.safeParse({ ...valid, technique: 2.5 }).success).toBe(false)
  })

  it('отклоняет нечисловой matchId', () => {
    expect(voteInputSchema.safeParse({ ...valid, matchId: 'abc' }).success).toBe(false)
  })

  it('заполненный honeypot схема пропускает — его тихо гасит service', () => {
    expect(voteInputSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(true)
  })
})
