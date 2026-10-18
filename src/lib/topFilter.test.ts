import { describe, expect, it } from 'vitest'

import { matchesTopFilter } from './topFilter'

const NOW = new Date('2026-10-18T12:00:00Z').getTime()
const recent = { hand: 'right', eventDate: '2026-03-01T12:00:00Z' } as const
const old = { hand: 'left', eventDate: '2024-05-01T12:00:00Z' } as const

describe('matchesTopFilter', () => {
  it('«Все» пропускает всё', () => {
    expect(matchesTopFilter(old, 'all', NOW)).toBe(true)
  })

  it('«За год» оставляет только турниры не старше года', () => {
    expect(matchesTopFilter(recent, 'year', NOW)).toBe(true)
    expect(matchesTopFilter(old, 'year', NOW)).toBe(false)
  })

  it('«За год» не берёт турнир из будущего', () => {
    expect(matchesTopFilter({ hand: 'right', eventDate: '2027-01-01T00:00:00Z' }, 'year', NOW)).toBe(false)
  })

  it('«Правая» и «Левая» — по руке матча', () => {
    expect(matchesTopFilter(recent, 'right', NOW)).toBe(true)
    expect(matchesTopFilter(recent, 'left', NOW)).toBe(false)
    expect(matchesTopFilter(old, 'left', NOW)).toBe(true)
  })
})
