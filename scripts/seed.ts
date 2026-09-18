// Тестовые данные для локальной проверки: npm run seed (можно запускать повторно)
// Пишет через Local API, поэтому не требует входа в админку. Борцы вымышленные.
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import sharp from 'sharp'

import config from '../payload.config'

const payload = await getPayload({ config })

async function findId(collection: 'athletes' | 'events', slug: string) {
  const { docs } = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  return docs[0]?.id ?? null
}

async function ensureAthlete(data: RequiredDataFromCollectionSlug<'athletes'>) {
  const existing = await findId('athletes', data.slug)
  if (existing !== null) return existing
  const created = await payload.create({ collection: 'athletes', data })
  return created.id
}

// Фото и профили
let photoId: number | undefined
const havePhoto = await payload.count({ collection: 'media' })
if (havePhoto.totalDocs === 0) {
  const png = await sharp({
    create: { width: 800, height: 1000, channels: 3, background: { r: 194, g: 65, b: 12 } },
  })
    .png()
    .toBuffer()
  const photo = await payload.create({
    collection: 'media',
    data: { alt: 'Тестовое фото' },
    file: { data: png, mimetype: 'image/png', name: 'test-photo.png', size: png.length },
  })
  photoId = photo.id
}

const ivan = await ensureAthlete({
  name: 'Иван Тестов',
  nameEn: 'Ivan Testov',
  slug: 'ivan-testov',
  countryCode: 'RU',
  photo: photoId,
  photoSource: 'сгенерировано скриптом seed',
  birthYear: 1990,
  heightCm: 185,
  weightKg: 100,
  style: 'Топ-ролл',
  achievements: 'Тестовое достижение 1\nТестовое достижение 2',
  isFeatured: true,
})
const john = await ensureAthlete({
  name: 'Джон Пример',
  nameEn: 'John Example',
  slug: 'john-example',
  countryCode: 'US',
  heightCm: 190,
  weightKg: 110,
  style: 'Хук',
  achievements: 'Тестовое достижение',
  isFeatured: true,
})
const giorgi = await ensureAthlete({
  name: 'Гиорги Образец',
  nameEn: 'Giorgi Sample',
  slug: 'giorgi-sample',
  countryCode: 'GE',
})

// Турнир 1 — обычные матчи
if ((await findId('events', 'east-vs-west')) === null) {
  const event = await payload.create({
    collection: 'events',
    data: { title: 'East vs West (тест)', slug: 'east-vs-west', date: '2026-01-01T12:00:00.000Z', location: 'Тест' },
  })
  await payload.create({
    collection: 'matches',
    data: { event: event.id, athlete1: ivan, athlete2: john, hand: 'right', resultType: 'normal', winner: ivan, cardOrder: 1 },
  })
  await payload.create({
    collection: 'matches',
    data: { event: event.id, athlete1: john, athlete2: ivan, hand: 'left', resultType: 'normal', winner: john, cardOrder: 2 },
  })
}

// Турнир 2 — все типы исходов
if ((await findId('events', 'east-vs-west-ii')) === null) {
  const event = await payload.create({
    collection: 'events',
    data: { title: 'East vs West II (тест)', slug: 'east-vs-west-ii', date: '2026-03-15T12:00:00.000Z', location: 'Москва' },
  })
  const make = (order: number, data: Record<string, unknown>) =>
    payload.create({
      collection: 'matches',
      data: { event: event.id, athlete1: ivan, athlete2: giorgi, hand: 'right', resultType: 'normal', cardOrder: order, ...data },
    })
  await make(1, { isTitle: true, weightClass: 'до 100 кг', score1: 3, score2: 2, winner: ivan })
  await make(2, { athlete1: john, athlete2: giorgi, hand: 'left', weightClass: 'свыше 100 кг', score1: 1, score2: 0, winner: john })
  await make(3, { athlete1: giorgi, athlete2: ivan, resultType: 'injury', winner: ivan, notes: 'травма кисти' })
  await make(4, { athlete1: giorgi, athlete2: john, resultType: 'dq', winner: john })
  await make(5, { athlete1: ivan, athlete2: john, resultType: 'no_contest' })
}

// Голоса: у первого матча турнира II хватает для балла (5+), у второго — «мало оценок»
if ((await payload.count({ collection: 'votes' })).totalDocs === 0) {
  const { docs: matches } = await payload.find({
    collection: 'matches',
    where: { 'event.slug': { equals: 'east-vs-west-ii' } },
    sort: 'cardOrder',
    limit: 2,
    depth: 0,
  })
  const hex = (n: number) => n.toString(16).padStart(32, '0')
  const scores = [
    [5, 4, 4, 5],
    [4, 4, 5, 3],
    [5, 5, 4, 4],
    [4, 3, 4, 5],
    [5, 4, 5, 4],
    [4, 5, 4, 4],
  ]
  for (const [i, [spectacle, intrigue, technique, refereeing]] of scores.entries()) {
    await payload.create({
      collection: 'votes',
      data: { match: matches[0].id, deviceId: hex(i + 1), ipHash: 'seed', spectacle, intrigue, technique, refereeing },
    })
  }
  for (const i of [0, 1]) {
    await payload.create({
      collection: 'votes',
      data: { match: matches[1].id, deviceId: hex(100 + i), ipHash: 'seed', spectacle: 3, intrigue: 4, technique: 3, refereeing: 4 },
    })
  }
}

payload.logger.info('Seed готов')
process.exit(0)
