// Импорт борцов и матчей East vs West 24–26 из data/evw/: npm run import:evw
// Переменные окружения (аргументы `payload run` не пробрасывает): EVW_PHOTOS=1 — загрузить фото
// (обрезаются до лица), EVW_PHOTOS=replace — ещё и заменить ранее загруженные этим скриптом,
// EVW_DRY_RUN=1 — только показать план, в базу ничего не писать, EVW_SYNC_NAMES=1 — привести имена
// уже созданных борцов к плану (иначе существующих не трогаем).
// Пишет через Local API, повторный запуск ничего не дублирует (ключи: slug борца и турнира, пара борцов + рука в матче).
// Что и почему — docs/changes/evw-import.md. На боевой сервер — только после бэкапа (deploy/DEPLOY.md).
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import { getPayload, type Where } from 'payload'
import sharp from 'sharp'

import config from '../payload.config'
import { buildImportPlan, type EvwAthlete, type EvwEvent, type EvwExtra } from '../src/lib/evwImport'

const DATA = join(process.cwd(), 'data/evw')
// 1 — загрузить фото тем, у кого его нет; replace — ещё и заменить фото, загруженные этим скриптом
const replacePhotos = process.env.EVW_PHOTOS === 'replace'
const withPhotos = process.env.EVW_PHOTOS === '1' || replacePhotos
const PHOTO_SOURCE = 'evwsports.com (рейтинг EVW)'
// Исходники 300×300 — по пояс, голова вверху по центру. В аватарке-круге нужно лицо, как в списке на сайте EVW
// (там то же делает CSS: ~92 px из 300 по центру сверху). Берём чуть шире, потому что круг срезает углы
const FACE_CROP = { left: 95, top: 0, width: 110, height: 110 }
const dryRun = process.env.EVW_DRY_RUN === '1'
const syncNames = process.env.EVW_SYNC_NAMES === '1'

const read = <T>(file: string): T => JSON.parse(readFileSync(join(DATA, file), 'utf8')) as T
const plan = buildImportPlan(
  read<EvwAthlete[]>('athletes.json'),
  read<{ events: EvwEvent[] }>('events.json').events,
  read<EvwExtra>('extra.json'),
)

const matchCount = plan.events.reduce((sum, e) => sum + e.matches.length, 0)
console.log(
  `План: ${plan.athletes.length} борцов, ${plan.events.length} турнира, ${matchCount} матчей; ` +
    `фото: ${withPhotos ? plan.athletes.filter((a) => a.photoFile).length : 'не загружаем (нужен EVW_PHOTOS=1)'}`,
)
// Куда будет писать скрипт — видно до записи (только адрес, токен не печатаем); та же логика выбора, что в payload.config.ts
const databaseUri = process.env.DATABASE_URI || 'file:./armreview.db'
console.log(`База: ${databaseUri}`)
// Не в production Payload сам «пушит» схему кода в базу (drizzle push) — на живой облачной базе это
// изменение схемы мимо миграций. Поэтому в облако — только с NODE_ENV=production (там схему ведут миграции)
if (databaseUri.startsWith('libsql:') && process.env.NODE_ENV !== 'production') {
  console.error('Облачная база: сначала  $env:NODE_ENV = "production"  (иначе Payload может изменить схему) — импорт остановлен')
  process.exit(1)
}
if (withPhotos && databaseUri.startsWith('libsql:') && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Фото в облачную базу: нужен BLOB_READ_WRITE_TOKEN, иначе файлы не сохранятся — импорт остановлен')
  process.exit(1)
}
if (plan.skippedAthletes.length) console.log('Пропущены борцы без страны/имени:', plan.skippedAthletes.join(', '))
if (plan.skippedMatches.length) console.log('Пропущены матчи:', plan.skippedMatches.join('; '))
if (plan.problems.length) {
  console.error('Проблемы — импорт остановлен:\n' + plan.problems.map((p) => `  - ${p}`).join('\n'))
  process.exit(1)
}
if (dryRun) {
  console.log('EVW_DRY_RUN: в базу ничего не записано')
  process.exit(0)
}

const payload = await getPayload({ config })

// EVW_CHECK=1 — только чтение: что уже лежит в базе и кого импорт задублирует (другой slug у того же имени)
if (process.env.EVW_CHECK === '1') {
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
  // depth 1 — чтобы видеть, что у фото есть файл (url), а не только связь с media
  const existing = (await payload.find({ collection: 'athletes', limit: 2000, depth: 1, pagination: false })).docs
  const bySlug = new Set(existing.map((e) => e.slug))
  const byName = new Map(existing.flatMap((e) => [e.name, e.nameEn].filter(Boolean).map((n) => [fold(n as string), e] as const)))
  const reuse = plan.athletes.filter((a) => bySlug.has(a.slug))
  const dupes = plan.athletes.filter((a) => !bySlug.has(a.slug) && byName.has(fold(a.nameEn)))
  const planned = new Set(plan.athletes.map((a) => a.slug))
  const others = existing.filter((e) => !planned.has(e.slug) && !dupes.some((d) => byName.get(fold(d.nameEn))?.id === e.id))
  console.log(`\nВ базе борцов: ${existing.length}. Совпадут по slug (будут использованы как есть): ${reuse.length}`)
  console.log(`Дубли (то же имя, другой slug): ${dupes.length}`)
  for (const d of dupes) console.log(`  - ${d.nameEn}: в базе slug «${byName.get(fold(d.nameEn))?.slug}», импорт создаст «${d.slug}»`)
  console.log(`Борцы в базе, которых нет в плане импорта: ${others.length}`)
  for (const o of others) console.log(`  · ${o.name} (${o.slug}, ${o.countryCode})`)
  const hasUrl = (e: (typeof existing)[number]) => typeof e.photo === 'object' && e.photo !== null && Boolean(e.photo.url)
  const noPhoto = existing.filter((e) => !e.photo)
  const brokenPhoto = existing.filter((e) => e.photo && !hasUrl(e))
  const fileOf = new Map(plan.athletes.map((a) => [a.slug, a.photoFile]))
  console.log(`\nБез фото: ${noPhoto.length}; фото привязано, но файла нет: ${brokenPhoto.length}`)
  for (const e of noPhoto) console.log(`  - ${e.name} (${e.slug}): файл в data/evw ${fileOf.get(e.slug) ? 'есть' : 'НЕТ'}`)
  for (const e of brokenPhoto) console.log(`  ! ${e.name} (${e.slug}): связь с media есть, url пустой`)
  const events = (await payload.find({ collection: 'events', limit: 200, depth: 0, pagination: false })).docs
  console.log(`\nТурниры в базе: ${events.length}`)
  for (const e of events) console.log(`  · ${e.title} (${e.slug}, ${e.date.slice(0, 10)})`)
  const matches = await payload.count({ collection: 'matches' })
  console.log(`Матчей в базе: ${matches.totalDocs}`)
  console.log('\nEVW_CHECK: в базу ничего не записано')
  process.exit(0)
}

const created = { athletes: 0, photos: 0, events: 0, matches: 0, renamed: 0 }

async function findAthlete(slug: string) {
  const { docs } = await payload.find({ collection: 'athletes', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  return docs[0]
}

async function findEvent(slug: string) {
  const { docs } = await payload.find({ collection: 'events', where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  return docs[0]
}

async function uploadPhoto(file: string, alt: string) {
  const data = await sharp(join(DATA, file))
    .extract(FACE_CROP)
    .resize(300, 300, { kernel: 'lanczos3' })
    .webp({ quality: 90 })
    .toBuffer()
  const media = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype: 'image/webp', name: basename(file), size: data.length },
  })
  created.photos++
  console.log(`  фото ${created.photos}: ${alt}`)
  return media.id
}

const athleteIds = new Map<string, number>()
for (const a of plan.athletes) {
  const existing = await findAthlete(a.slug)
  if (existing) {
    athleteIds.set(a.slug, existing.id)
    // имена перезаписываем только по явной просьбе — не затираем правки из админки
    if (syncNames && existing.name !== a.name) {
      await payload.update({ collection: 'athletes', id: existing.id, data: { name: a.name } })
      created.renamed++
    }
    // фото догружаем тем, у кого его нет; заменяем только загруженные этим скриптом (по источнику) — чужое не трогаем
    const oldPhotoId = existing.photo
    const ours = existing.photoSource === PHOTO_SOURCE
    if (withPhotos && a.photoFile && (!oldPhotoId || (replacePhotos && ours))) {
      await payload.update({
        collection: 'athletes',
        id: existing.id,
        data: { photo: await uploadPhoto(a.photoFile, a.nameEn), photoSource: PHOTO_SOURCE },
      })
      if (oldPhotoId) await payload.delete({ collection: 'media', id: typeof oldPhotoId === 'object' ? oldPhotoId.id : oldPhotoId })
    }
    continue
  }
  const photo = withPhotos && a.photoFile ? await uploadPhoto(a.photoFile, a.nameEn) : undefined
  const doc = await payload.create({
    collection: 'athletes',
    data: {
      name: a.name,
      nameEn: a.nameEn,
      slug: a.slug,
      countryCode: a.countryCode,
      ...(photo !== undefined && { photo, photoSource: PHOTO_SOURCE }),
      isFeatured: false,
    },
  })
  athleteIds.set(a.slug, doc.id)
  created.athletes++
  console.log(`борец ${created.athletes}: ${a.nameEn}`)
}

for (const e of plan.events) {
  const existing = await findEvent(e.slug)
  const eventId =
    existing?.id ??
    (await payload.create({ collection: 'events', data: { title: e.title, slug: e.slug, date: e.date, location: e.location } })).id
  if (!existing) created.events++
  console.log(`турнир: ${e.title} (${existing ? 'уже есть' : 'создан'}), матчей в плане: ${e.matches.length}`)

  for (const m of e.matches) {
    const athlete1 = athleteIds.get(m.athlete1)
    const athlete2 = athleteIds.get(m.athlete2)
    const winner = athleteIds.get(m.winner)
    if (athlete1 === undefined || athlete2 === undefined || winner === undefined) {
      throw new Error(`Нет борца для матча ${e.title}: ${m.athlete1} — ${m.athlete2}`)
    }
    // пара ищется в обоих порядках: стороны перемешаны (fix-evw-order.ts), а старые строки могли остаться как были
    const pair = (a: number, b: number): Where => ({ and: [{ athlete1: { equals: a } }, { athlete2: { equals: b } }] })
    const dup = await payload.count({
      collection: 'matches',
      where: { and: [{ event: { equals: eventId } }, { hand: { equals: m.hand } }, { or: [pair(athlete1, athlete2), pair(athlete2, athlete1)] }] },
    })
    if (dup.totalDocs > 0) continue
    await payload.create({
      collection: 'matches',
      data: {
        event: eventId,
        athlete1,
        athlete2,
        hand: m.hand,
        weightClass: m.weightClass,
        isTitle: m.isTitle,
        score1: m.score1,
        score2: m.score2,
        winner,
        resultType: 'normal',
        cardOrder: m.cardOrder,
      },
    })
    created.matches++
  }
}

payload.logger.info(`Импорт EVW готов: создано ${JSON.stringify(created)}`)
process.exit(0)
