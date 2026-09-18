import { describe, expect, it } from 'vitest'

import { computeGlobalMean, computeScore, computeTotal, rankRatings } from './rating'

describe('computeTotal', () => {
  it('взвешивает шкалы 0.30 / 0.25 / 0.25 / 0.20', () => {
    expect(computeTotal({ spectacle: 5, intrigue: 5, technique: 5, refereeing: 5 })).toBeCloseTo(5)
    expect(computeTotal({ spectacle: 5, intrigue: 1, technique: 1, refereeing: 1 })).toBeCloseTo(2.2)
  })
})

describe('computeScore', () => {
  it('пример из PROJECT.md: 5 голосов по 5.0 → 4.3', () => {
    expect(computeScore(5, 5, 3.5)).toBe(4.3)
  })

  it('пример из PROJECT.md: 100 голосов со средним 4.7 → 4.6', () => {
    expect(computeScore(100, 4.7, 3.5)).toBe(4.6)
  })

  it('меньше 5 голосов — балл не показываем', () => {
    expect(computeScore(4, 5, 3.5)).toBeNull()
    expect(computeScore(0, 0, 3.5)).toBeNull()
  })
})

describe('computeGlobalMean', () => {
  it('меньше 3 матчей с 5+ голосами — 3.5', () => {
    expect(computeGlobalMean([{ votes: 10, total: 5 }, { votes: 9, total: 5 }])).toBe(3.5)
  })

  it('считает по матчам с 5+ голосами и игнорирует остальные', () => {
    const mean = computeGlobalMean([
      { votes: 10, total: 4 },
      { votes: 6, total: 3 },
      { votes: 5, total: 5 },
      { votes: 2, total: 1 },
    ])
    expect(mean).toBeCloseTo(4)
  })
})

describe('rankRatings', () => {
  it('сортирует по баллу, затем по числу голосов, и пропускает матчи без балла', () => {
    const ratings = new Map([
      [1, { votes: 10, score: 4.1 }],
      [2, { votes: 30, score: 4.5 }],
      [3, { votes: 3, score: null }],
      [4, { votes: 50, score: 4.1 }],
    ])
    expect(rankRatings(ratings, 100)).toEqual([2, 4, 1])
  })

  it('обрезает по лимиту', () => {
    const ratings = new Map([
      [1, { votes: 5, score: 4 }],
      [2, { votes: 5, score: 3 }],
    ])
    expect(rankRatings(ratings, 1)).toEqual([1])
  })
})
