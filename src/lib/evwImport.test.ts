import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { validateWeightClass } from './weightClass'
import {
  athleteSlug,
  buildImportPlan,
  countryToIso,
  parseScore,
  toWeightLimit,
  type EvwAthlete,
  type EvwEvent,
  type EvwExtra,
} from './evwImport'

const person = (name: string, country: string | null) => ({ name, country })
const extra: EvwExtra = {
  aliases: { 'Vlad K': 'Vladislav K' },
  countryOverrides: {},
  locationsRu: { 'Jiaxing, China': 'Цзясин, Китай' },
}
const event = (matches: EvwEvent['matches']): EvwEvent => ({
  event: 'EVW 9',
  date: '2026-01-02',
  location: 'Jiaxing, China',
  matches,
})
const match = (w: string, l: string, over: Partial<EvwEvent['matches'][number]> = {}) => ({
  winner: person(w, 'USA'),
  loser: person(l, 'Georgia'),
  score: '3-1',
  arm: 'Right' as const,
  weightClass: 'Middleweight',
  worldTitle: false,
  ...over,
})

describe('мелкие функции', () => {
  it('страна → ISO-2; неизвестная — null', () => {
    expect(countryToIso('Türkiye')).toBe('TR')
    expect(countryToIso('UK')).toBe('GB')
    expect(countryToIso('Atlantis')).toBeNull()
    expect(countryToIso(null)).toBeNull()
  })

  it('категория EVW → лимит, который принимает валидатор коллекции', () => {
    const limits = ['Featherweight', 'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight', 'Super Heavyweight']
    for (const label of limits) expect(validateWeightClass(toWeightLimit(label))).toBe(true)
    expect(toWeightLimit('Middleweight')).toBe('до 95 кг')
    expect(toWeightLimit('Super Heavyweight')).toBe('свыше 115 кг')
    expect(toWeightLimit('Open Weight (women)')).toBeNull()
    expect(toWeightLimit('Weird')).toBeUndefined()
  })

  it('slug без диакритики', () => {
    expect(athleteSlug('Barbora Bajčiová')).toBe('barbora-bajciova')
    expect(athleteSlug('Ömer Kozakoğlu')).toBe('omer-kozakoglu')
  })

  it('счёт', () => {
    expect(parseScore('4-3')).toEqual([4, 3])
    expect(parseScore('abc')).toBeNull()
  })
})

describe('buildImportPlan', () => {
  const athletes: EvwAthlete[] = [{ name: 'Ann Bee', country: 'USA', photoFile: 'photos/ann-bee.webp' }]

  it('собирает борцов, турнир и матч; победитель — один из участников', () => {
    const plan = buildImportPlan(athletes, [event([match('Ann Bee', 'Cid Dee', { worldTitle: true })])], extra)
    expect(plan.problems).toEqual([])
    expect(plan.athletes.map((a) => [a.slug, a.name, a.countryCode, a.photoFile])).toEqual([
      ['ann-bee', 'Ann Bee', 'US', 'photos/ann-bee.webp'],
      ['cid-dee', 'Cid Dee', 'GE', null],
    ])
    expect(plan.events[0]).toMatchObject({ title: 'East vs West 9', slug: 'east-vs-west-9', location: 'Цзясин, Китай' })
    const m = plan.events[0].matches[0]
    expect([m.athlete1, m.athlete2]).toContain(m.winner)
    expect(m).toMatchObject({ hand: 'right', weightClass: 'до 95 кг', isTitle: true, cardOrder: 1 })
    // счёт идёт за своей стороной: у победителя 3, у соперника 1
    expect(m.winner === m.athlete1 ? [m.score1, m.score2] : [m.score2, m.score1]).toEqual([3, 1])
  })

  it('алиас имени сводит двух «разных» борцов в одного', () => {
    const plan = buildImportPlan([], [event([match('Vlad K', 'Cid Dee'), match('Cid Dee', 'Vladislav K')])], extra)
    expect(plan.athletes.map((a) => a.slug)).toEqual(['cid-dee', 'vladislav-k'])
  })

  it('нет страны — борец и его матчи пропускаются, а не создаются с пустым полем', () => {
    const plan = buildImportPlan([], [event([match('Ann Bee', 'Cid Dee', { loser: person('Cid Dee', null) })])], extra)
    expect(plan.skippedAthletes).toEqual(['Cid Dee'])
    expect(plan.skippedMatches).toHaveLength(1)
    expect(plan.events[0].matches).toEqual([])
  })

  it('ручная правка страны главнее данных источника', () => {
    const plan = buildImportPlan(athletes, [], { ...extra, countryOverrides: { 'Ann Bee': 'Canada' } })
    expect(plan.athletes[0].countryCode).toBe('CA')
  })

  it('неизвестная страна и непонятная категория — в problems', () => {
    const plan = buildImportPlan(
      [{ name: 'Ann Bee', country: 'Atlantis', photoFile: null }],
      [event([match('Cid Dee', 'Eve Fox', { weightClass: 'Weird' })])],
      extra,
    )
    expect(plan.problems.join('\n')).toMatch(/Atlantis/)
    expect(plan.problems.join('\n')).toMatch(/Weird/)
  })
})

describe('реальные данные data/evw', () => {
  const read = <T>(file: string): T => JSON.parse(readFileSync(join(process.cwd(), 'data/evw', file), 'utf8')) as T
  const plan = buildImportPlan(
    read<EvwAthlete[]>('athletes.json'),
    read<{ events: EvwEvent[] }>('events.json').events,
    read<EvwExtra>('extra.json'),
  )

  it('без проблем; не хватает только страны Grigorii Liashchuk', () => {
    expect(plan.problems).toEqual([])
    expect(plan.skippedAthletes).toEqual(['Grigorii Liashchuk'])
    expect(plan.skippedMatches).toEqual(['EVW 25: Daniyar Roman — Grigorii Liashchuk'])
  })

  it('3 турнира, 44 матча, все борцы матчей созданы', () => {
    expect(plan.events.map((e) => [e.slug, e.matches.length])).toEqual([
      ['east-vs-west-26', 15],
      ['east-vs-west-25', 14],
      ['east-vs-west-24', 15],
    ])
    const slugs = new Set(plan.athletes.map((a) => a.slug))
    for (const m of plan.events.flatMap((e) => e.matches)) {
      expect(slugs.has(m.athlete1)).toBe(true)
      expect(slugs.has(m.athlete2)).toBe(true)
      expect(m.athlete1).not.toBe(m.athlete2)
    }
  })

  it('порядок борцов не выдаёт победителя: первым стоит и победитель, и проигравший', () => {
    const matches = plan.events.flatMap((e) => e.matches)
    const winnerFirst = matches.filter((m) => m.winner === m.athlete1).length
    expect(winnerFirst).toBeGreaterThan(matches.length * 0.3)
    expect(winnerFirst).toBeLessThan(matches.length * 0.7)
    // при обмене сторон счёт переехал вместе с ними: у победителя раундов не меньше
    for (const m of matches) expect((m.winner === m.athlete1 ? m.score1 - m.score2 : m.score2 - m.score1) >= 0).toBe(true)
  })

  it('имена — латиницей, slug уникальны', () => {
    for (const a of plan.athletes) expect(a.name).toBe(a.nameEn)
    expect(new Set(plan.athletes.map((a) => a.slug)).size).toBe(plan.athletes.length)
  })
})
