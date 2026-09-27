import { describe, expect, it } from 'vitest'

import {
  computeAthleteStats,
  computeStyleProfile,
  computeWinRates,
  pickRecentMatches,
  sharePercents,
  type MatchLike,
} from './athleteStats'

const match = (over: Partial<MatchLike>): MatchLike => ({
  athlete1: 1,
  athlete2: 2,
  winner: 1,
  hand: 'right',
  resultType: 'normal',
  ...over,
})

describe('computeAthleteStats', () => {
  it('раздельно считает правую и левую руку', () => {
    const stats = computeAthleteStats(1, [
      match({}),
      match({ hand: 'left', winner: 2 }),
      match({ athlete1: 2, athlete2: 1, winner: 1 }),
    ])
    expect(stats.right.matches).toMatchObject({ won: 2, lost: 0 })
    expect(stats.left.matches).toMatchObject({ won: 0, lost: 1 })
    expect(stats.total.matches).toEqual({ won: 2, lost: 1, percent: 67 })
  })

  it('пропускает несостоявшиеся матчи и чужие матчи', () => {
    const stats = computeAthleteStats(1, [
      match({ resultType: 'no_contest', winner: null, score1: 3, score2: 0, technique1: 'hook' }),
      match({ athlete1: 3, athlete2: 2 }),
    ])
    expect(stats.total.matches).toMatchObject({ won: 0, lost: 0 })
    expect(stats.total.rounds).toMatchObject({ won: 0, lost: 0 })
    expect(stats.techniques.matches).toBe(0)
  })

  it('понимает связи, пришедшие объектами', () => {
    const stats = computeAthleteStats(1, [match({ athlete1: { id: 1 }, winner: { id: 1 } })])
    expect(stats.right.matches).toMatchObject({ won: 1, lost: 0 })
  })

  it('считает раунды по счёту, со своей стороны', () => {
    const stats = computeAthleteStats(1, [
      match({ score1: 3, score2: 2 }),
      match({ score1: 3, score2: 0 }),
      match({ athlete1: 2, athlete2: 1, winner: 2, score1: 3, score2: 1 }),
    ])
    expect(stats.total.rounds).toEqual({ won: 7, lost: 5, percent: 58 })
  })

  it('матч без счёта идёт в W–L, но не в раунды', () => {
    const stats = computeAthleteStats(1, [match({}), match({ score1: 3, score2: 1 })])
    expect(stats.total.matches).toMatchObject({ won: 2, lost: 0 })
    expect(stats.total.rounds).toMatchObject({ won: 3, lost: 1 })
  })

  it('меньше 3 матчей — без процентов', () => {
    const stats = computeAthleteStats(1, [match({ score1: 3, score2: 0 }), match({ score1: 3, score2: 1 })])
    expect(stats.total.matches.percent).toBeNull()
    expect(stats.total.rounds.percent).toBeNull()
  })

  it('раскладывает раунды по технике борца, «не указана» — последней', () => {
    const stats = computeAthleteStats(1, [
      match({ score1: 3, score2: 1, technique1: 'hook', technique2: 'top_roll' }),
      match({ athlete1: 2, athlete2: 1, winner: 2, score1: 3, score2: 2, technique1: 'hook', technique2: 'flop_press' }),
      match({ score1: 3, score2: 0 }),
      match({ score1: 3, score2: 0, technique1: 'нечто' }),
    ])
    const t = stats.techniques
    expect(t.matches).toBe(2)
    expect(t.fought).toEqual([
      { technique: 'press', count: 5, percent: 33 },
      { technique: 'hook', count: 4, percent: 27 },
      { technique: null, count: 6, percent: 40 },
    ])
    expect(t.won.map((l) => [l.technique, l.count])).toEqual([
      ['hook', 3],
      ['press', 2],
      [null, 6],
    ])
    expect(t.lost.map((l) => [l.technique, l.count])).toEqual([
      ['press', 3],
      ['hook', 1],
    ])
  })

  it('точки пирамиды одного семейства — одна строка', () => {
    const stats = computeAthleteStats(1, [
      match({ score1: 3, score2: 1, technique1: 'hook' }),
      match({ score1: 3, score2: 0, technique1: 'hook_drive' }),
      match({ score1: 3, score2: 2, technique1: 'high_hook' }),
    ])
    expect(stats.techniques.fought).toEqual([{ technique: 'hook', count: 12, percent: 100 }])
  })
})

describe('sharePercents', () => {
  it('в сумме ровно 100', () => {
    expect(sharePercents([1, 1, 1])).toEqual([34, 33, 33])
    expect(sharePercents([2, 1])).toEqual([67, 33])
  })

  it('пустой набор — нули', () => {
    expect(sharePercents([0, 0])).toEqual([0, 0])
  })
})

describe('computeStyleProfile', () => {
  it('меньше 3 матчей с техникой — данных недостаточно', () => {
    const profile = computeStyleProfile(1, [match({ technique1: 'hook' }), match({ technique1: 'shoulder_press' }), match({})])
    expect(profile).toEqual({ enough: false, matches: 2 })
  })

  it('3 из 4 инсайдом — инсайд, 75%', () => {
    const profile = computeStyleProfile(1, [
      match({ technique1: 'hook' }),
      match({ technique1: 'high_hook' }),
      match({ athlete1: 2, athlete2: 1, technique1: 'top_roll', technique2: 'flop_press' }),
      match({ technique1: 'top_roll' }),
    ])
    expect(profile).toEqual({ enough: true, style: 'inside', insidePercent: 75, matches: 4 })
  })

  it('половина на половину — универсал', () => {
    const profile = computeStyleProfile(1, [
      match({ technique1: 'hook' }),
      match({ technique1: 'top_roll' }),
      match({ technique1: 'hook' }),
      match({ technique1: 'kings_move' }),
    ])
    expect(profile).toMatchObject({ style: 'universal', insidePercent: 50 })
  })
})

describe('computeWinRates', () => {
  it('доля побед соперника, меньше 3 матчей — null', () => {
    const rates = computeWinRates(
      [2, 3],
      [
        match({ winner: 2 }),
        match({ winner: 1 }),
        match({ athlete1: 2, athlete2: 4, winner: 2 }),
        match({ athlete1: 3, athlete2: 4, winner: 3 }),
      ],
    )
    expect(rates.get(2)).toBe(67)
    expect(rates.get(3)).toBeNull()
  })
})

describe('pickRecentMatches', () => {
  it('10 последних состоявшихся; не больше 10 — вкладка не нужна', () => {
    const played = Array.from({ length: 11 }, () => match({}))
    const recent = pickRecentMatches([match({ resultType: 'no_contest' }), ...played])
    expect(recent).toHaveLength(10)
    expect(recent?.every((m) => m.resultType === 'normal')).toBe(true)
    expect(pickRecentMatches(played.slice(0, 10))).toBeNull()
  })
})
