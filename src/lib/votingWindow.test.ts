import { describe, expect, it } from 'vitest'

import { getVotingOpensAt, getVotingState } from './votingWindow'

const eventDate = '2026-01-01T12:00:00.000Z' // 1 января, 15:00 МСК

describe('getVotingOpensAt', () => {
  it('открывается в 00:00 МСК следующих суток', () => {
    expect(getVotingOpensAt(eventDate).toISOString()).toBe('2026-01-01T21:00:00.000Z')
  })
})

describe('getVotingState', () => {
  it('до открытия — too_early, после — open', () => {
    expect(getVotingState('normal', eventDate, new Date('2026-01-01T20:59:59Z'))).toBe('too_early')
    expect(getVotingState('normal', eventDate, new Date('2026-01-01T21:00:00Z'))).toBe('open')
  })

  it('травма и дисквалификация — голосовать можно, несостоявшийся матч — нет', () => {
    const later = new Date('2026-02-01T00:00:00Z')
    expect(getVotingState('injury', eventDate, later)).toBe('open')
    expect(getVotingState('dq', eventDate, later)).toBe('open')
    expect(getVotingState('no_contest', eventDate, later)).toBe('not_votable')
  })
})
