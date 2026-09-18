// Тестовые данные для локальной проверки Среза 0: npm run seed
// Пишет через Local API, поэтому не требует входа в админку. Вымышленные борцы.
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../payload.config'

const payload = await getPayload({ config })

const existing = await payload.count({ collection: 'athletes' })
if (existing.totalDocs > 0) {
  payload.logger.info('В базе уже есть борцы — seed пропущен')
  process.exit(0)
}

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

const ivan = await payload.create({
  collection: 'athletes',
  data: {
    name: 'Иван Тестов',
    nameEn: 'Ivan Testov',
    slug: 'ivan-testov',
    countryCode: 'ru',
    photo: photo.id,
    photoSource: 'сгенерировано скриптом seed',
    birthYear: 1990,
    heightCm: 185,
    weightKg: 100,
    style: 'Топ-ролл',
    achievements: 'Тестовое достижение 1\nТестовое достижение 2',
    isFeatured: true,
  },
})

const john = await payload.create({
  collection: 'athletes',
  data: {
    name: 'Джон Пример',
    nameEn: 'John Example',
    slug: 'john-example',
    countryCode: 'US',
    heightCm: 190,
    weightKg: 110,
    style: 'Хук',
    achievements: 'Тестовое достижение',
    isFeatured: true,
  },
})

await payload.create({
  collection: 'athletes',
  data: { name: 'Гиорги Образец', nameEn: 'Giorgi Sample', slug: '', countryCode: 'GE' },
})

const event = await payload.create({
  collection: 'events',
  data: { title: 'East vs West (тест)', slug: '', date: '2026-01-01T12:00:00.000Z', location: 'Тест' },
})

await payload.create({
  collection: 'matches',
  data: { event: event.id, athlete1: ivan.id, athlete2: john.id, hand: 'right', resultType: 'normal', winner: ivan.id, cardOrder: 1 },
})
await payload.create({
  collection: 'matches',
  data: { event: event.id, athlete1: john.id, athlete2: ivan.id, hand: 'left', resultType: 'normal', winner: john.id, cardOrder: 2 },
})

payload.logger.info('Seed готов: 3 борца, 1 турнир, 2 матча')
process.exit(0)
