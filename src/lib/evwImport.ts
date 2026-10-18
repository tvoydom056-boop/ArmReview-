// Превращает собранные данные EVW (data/evw/*.json) в список записей для импорта — чистая функция,
// без обращения к базе (docs/changes/evw-import.md). Саму запись делает scripts/import-evw.ts.
import { slugify } from './slugify'

export type EvwAthlete = { name: string; country: string; photoFile: string | null }
export type EvwPerson = { name: string; country: string | null }
export type EvwMatch = {
  winner: EvwPerson
  loser: EvwPerson
  score: string
  arm: 'Right' | 'Left'
  weightClass: string
  worldTitle: boolean
}
export type EvwEvent = { event: string; date: string; location: string; matches: EvwMatch[] }
export type EvwExtra = {
  aliases: Record<string, string>
  countryOverrides: Record<string, string>
  locationsRu: Record<string, string>
}

export type PlannedAthlete = {
  name: string
  nameEn: string
  slug: string
  countryCode: string
  photoFile: string | null
}
export type PlannedMatch = {
  athlete1: string // slug борца
  athlete2: string
  hand: 'right' | 'left'
  weightClass: string | null
  isTitle: boolean
  score1: number
  score2: number
  winner: string // slug
  cardOrder: number
}
export type PlannedEvent = { title: string; slug: string; date: string; location: string; matches: PlannedMatch[] }
export type ImportPlan = {
  athletes: PlannedAthlete[]
  events: PlannedEvent[]
  // борцы без страны (поле обязательное) и матчи, которые из-за них пропущены
  skippedAthletes: string[]
  skippedMatches: string[]
  // всё, что нужно допилить руками: нет русского имени, страна не в таблице ISO, дубль slug
  problems: string[]
}

const ISO: Record<string, string> = {
  Armenia: 'AM',
  Australia: 'AU',
  Brazil: 'BR',
  Bulgaria: 'BG',
  Canada: 'CA',
  China: 'CN',
  Croatia: 'HR',
  France: 'FR',
  Georgia: 'GE',
  Germany: 'DE',
  Israel: 'IL',
  Italy: 'IT',
  Japan: 'JP',
  Kazakhstan: 'KZ',
  Latvia: 'LV',
  Lithuania: 'LT',
  Malaysia: 'MY',
  Malta: 'MT',
  Moldova: 'MD',
  Poland: 'PL',
  Romania: 'RO',
  Russia: 'RU',
  Singapore: 'SG',
  Slovakia: 'SK',
  'South Africa': 'ZA',
  Spain: 'ES',
  Sweden: 'SE',
  Thailand: 'TH',
  Türkiye: 'TR',
  UK: 'GB',
  USA: 'US',
  Ukraine: 'UA',
}

export function countryToIso(country: string | null | undefined): string | null {
  return (country && ISO[country]) || null
}

// Границы EVW — как в lib/weightClass.ts. Женский open — без лимита
const WEIGHT_LIMITS: Record<string, string | null> = {
  Featherweight: 'до 70 кг',
  Lightweight: 'до 77 кг',
  Welterweight: 'до 85 кг',
  Middleweight: 'до 95 кг',
  'Light Heavyweight': 'до 105 кг',
  Heavyweight: 'до 115 кг',
  'Super Heavyweight': 'свыше 115 кг',
  'Open Weight (women)': null,
}

export function toWeightLimit(label: string): string | null | undefined {
  return label in WEIGHT_LIMITS ? WEIGHT_LIMITS[label] : undefined
}

// slug борца: латиница без диакритики (Bajčiová → bajciova)
export function athleteSlug(nameEn: string): string {
  return slugify(nameEn.normalize('NFD').replace(/\p{M}/gu, ''))
}

// Меняем ли стороны местами: детерминированно по ключу матча (FNV-1a), примерно в половине матчей
export function shouldSwapSides(key: string): boolean {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193)
  return ((h >>> 0) & 1) === 1
}

export function parseScore(score: string): [number, number] | null {
  const m = /^(\d+)-(\d+)$/.exec(score)
  return m ? [Number(m[1]), Number(m[2])] : null
}

export function buildImportPlan(athletes: EvwAthlete[], events: EvwEvent[], extra: EvwExtra): ImportPlan {
  const canon = (name: string) => extra.aliases[name] ?? name
  const problems: string[] = []

  // страна и фото по каноническому имени: рейтинг → матчи → ручные правки (последние главнее)
  const info = new Map<string, { country: string | null; photoFile: string | null }>()
  const touch = (name: string) => {
    const key = canon(name)
    if (!info.has(key)) info.set(key, { country: null, photoFile: null })
    return info.get(key)!
  }
  for (const a of athletes) {
    const item = touch(a.name)
    item.country = a.country || item.country
    item.photoFile = a.photoFile ?? item.photoFile
  }
  for (const ev of events) {
    for (const m of ev.matches) {
      for (const p of [m.winner, m.loser]) {
        const item = touch(p.name)
        item.country ??= p.country
      }
    }
  }
  for (const [name, country] of Object.entries(extra.countryOverrides)) touch(name).country = country

  const planned: PlannedAthlete[] = []
  const skippedAthletes: string[] = []
  const slugs = new Map<string, string>()
  for (const [nameEn, { country, photoFile }] of [...info].sort(([a], [b]) => a.localeCompare(b))) {
    const countryCode = countryToIso(country)
    if (!country) {
      skippedAthletes.push(nameEn)
      continue
    }
    if (!countryCode) {
      problems.push(`Страна «${country}» (${nameEn}) не в таблице ISO — добавить в lib/evwImport.ts`)
      skippedAthletes.push(nameEn)
      continue
    }
    const slug = athleteSlug(nameEn)
    const clash = slugs.get(slug)
    if (clash) problems.push(`Одинаковый slug «${slug}»: ${clash} и ${nameEn}`)
    slugs.set(slug, nameEn)
    // Имена на сайте — латиницей, как в EVW (решение Danil; раньше было кириллицей по п.15 фидбэка Влада)
    planned.push({ name: nameEn, nameEn, slug, countryCode, photoFile })
  }

  const skipped = new Set(skippedAthletes)
  const skippedMatches: string[] = []
  const plannedEvents: PlannedEvent[] = []
  for (const ev of events) {
    const matches: PlannedMatch[] = []
    for (const m of ev.matches) {
      const w = canon(m.winner.name)
      const l = canon(m.loser.name)
      const label = `${ev.event}: ${w} — ${l}`
      const score = parseScore(m.score)
      const limit = toWeightLimit(m.weightClass)
      if (skipped.has(w) || skipped.has(l)) {
        skippedMatches.push(label)
        continue
      }
      if (!score || limit === undefined) {
        problems.push(`${label}: не разобрать счёт «${m.score}» или категорию «${m.weightClass}»`)
        continue
      }
      // В источнике победитель всегда первый, а на карте первое имя не должно выдавать исход
      // (PROJECT.md § 12), поэтому порядок сторон перемешиваем — детерминированно, чтобы повторный импорт не плодил дубли
      const swap = shouldSwapSides(`${ev.event}|${athleteSlug(w)}|${athleteSlug(l)}|${m.arm}`)
      matches.push({
        athlete1: athleteSlug(swap ? l : w),
        athlete2: athleteSlug(swap ? w : l),
        hand: m.arm === 'Left' ? 'left' : 'right',
        weightClass: limit,
        isTitle: m.worldTitle,
        score1: swap ? score[1] : score[0],
        score2: swap ? score[0] : score[1],
        winner: athleteSlug(w),
        cardOrder: matches.length + 1,
      })
    }
    plannedEvents.push({
      title: `East vs West ${ev.event.replace(/^EVW /, '')}`,
      slug: slugify(`east vs west ${ev.event.replace(/^EVW /, '')}`),
      date: `${ev.date}T12:00:00.000Z`,
      location: extra.locationsRu[ev.location] ?? ev.location,
      matches,
    })
  }

  return { athletes: planned, events: plannedEvents, skippedAthletes, skippedMatches, problems }
}
