// Однократно: привести порядок сторон в уже импортированных матчах EVW к плану (npm run fix:evw-order).
// Первый импорт ставил победителя первым — на карте это выдавало исход (PROJECT.md § 12), см. shouldSwapSides.
// Меняет местами athlete1/athlete2, score1/score2 и technique1/technique2; победителя и остальное не трогает.
// По умолчанию только показывает, что поменяет; писать в базу — EVW_APPLY=1. На облачную базу — после бэкапа
// и с NODE_ENV=production (как у import-evw.ts). Повторный запуск безопасен: совпавшие с планом матчи пропускаются.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { getPayload } from 'payload'

import config from '../payload.config'
import { buildImportPlan, type EvwAthlete, type EvwEvent, type EvwExtra } from '../src/lib/evwImport'
import { refId } from '../src/lib/refId'

const apply = process.env.EVW_APPLY === '1'
const databaseUri = process.env.DATABASE_URI || 'file:./armreview.db'
console.log(`База: ${databaseUri}; режим: ${apply ? 'ЗАПИСЬ' : 'только показать (EVW_APPLY=1 — записать)'}`)
if (databaseUri.startsWith('libsql:') && process.env.NODE_ENV !== 'production') {
  console.error('Облачная база: сначала  $env:NODE_ENV = "production"  — остановлено')
  process.exit(1)
}

const read = <T>(file: string): T => JSON.parse(readFileSync(join(process.cwd(), 'data/evw', file), 'utf8')) as T
const plan = buildImportPlan(
  read<EvwAthlete[]>('athletes.json'),
  read<{ events: EvwEvent[] }>('events.json').events,
  read<EvwExtra>('extra.json'),
)

const payload = await getPayload({ config })

const slugToId = async (collection: 'athletes' | 'events', slug: string): Promise<number | null> => {
  const { docs } = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  return docs[0]?.id ?? null
}

let swapped = 0
let inPlace = 0
let missing = 0
for (const e of plan.events) {
  const eventId = await slugToId('events', e.slug)
  if (eventId === null) continue
  for (const m of e.matches) {
    const a1 = await slugToId('athletes', m.athlete1)
    const a2 = await slugToId('athletes', m.athlete2)
    if (a1 === null || a2 === null) continue
    const { docs } = await payload.find({
      collection: 'matches',
      where: { and: [{ event: { equals: eventId } }, { hand: { equals: m.hand } }] },
      limit: 20,
      depth: 0,
      pagination: false,
    })
    const row = docs.find((d) => [refId(d.athlete1), refId(d.athlete2)].sort().join() === [a1, a2].sort().join())
    if (!row) {
      missing++
      console.log(`нет в базе: ${e.title} — ${m.athlete1} / ${m.athlete2}`)
      continue
    }
    if (refId(row.athlete1) === a1) {
      inPlace++
      continue
    }
    swapped++
    console.log(`поменять: ${e.title} #${row.id} ${m.athlete2} / ${m.athlete1}  →  ${m.athlete1} / ${m.athlete2}`)
    if (apply) {
      await payload.update({
        collection: 'matches',
        id: row.id,
        data: {
          athlete1: a1,
          athlete2: a2,
          score1: row.score2,
          score2: row.score1,
          technique1: row.technique2,
          technique2: row.technique1,
        },
      })
    }
  }
}

console.log(`Готово: ${apply ? 'поменяно' : 'будет поменяно'} ${swapped}, уже в порядке ${inPlace}, не найдено ${missing}`)
process.exit(0)
