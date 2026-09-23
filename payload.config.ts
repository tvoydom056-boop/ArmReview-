import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { ru } from '@payloadcms/translations/languages/ru'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { migrations } from './src/migrations'
import { Athletes } from './src/collections/Athletes'
import { Events } from './src/collections/Events'
import { Matches } from './src/collections/Matches'
import { Media } from './src/collections/Media'
import { Users } from './src/collections/Users'
import { Votes } from './src/collections/Votes'

const dirname = path.dirname(fileURLToPath(import.meta.url))
// Локально и на VPS — файл SQLite; на Vercel — libsql://… из Turso (файловая система там только для чтения)
const databaseUri = process.env.DATABASE_URI || 'file:./armreview.db'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname, 'src') },
  },
  collections: [Athletes, Events, Matches, Votes, Media, Users],
  editor: lexicalEditor(),
  // Админкой пользуется Влад — интерфейс на русском
  i18n: { supportedLanguages: { ru }, fallbackLanguage: 'ru' },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  // STRUCTURE.md § 7: GraphQL не нужен, лишнюю поверхность API не открываем
  graphQL: { disable: true },
  db: sqliteAdapter({
    // Ожидание блокировки файла SQLite; повтор statement после BUSY не нужен (аудит § B).
    // Только для file: — адаптер шлёт PRAGMA busy_timeout при подключении, а на удалённой Turso
    // блокировками управляет сервер и эта PRAGMA не проверена (аудит: «Turso не проверен»)
    busyTimeout: databaseUri.startsWith('file:') ? 1000 : 0,
    client: { url: databaseUri, authToken: process.env.DATABASE_AUTH_TOKEN },
    // В production схема применяется только миграциями: npm run payload migrate
    prodMigrations: migrations,
  }),
  // Картинки: есть BLOB_READ_WRITE_TOKEN (Vercel) — уходят в Vercel Blob, иначе лежат в папке media/.
  // alwaysInsertFields: схема БД не зависит от токена, миграции одинаковы везде
  plugins: [
    vercelBlobStorage({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      collections: { media: true },
      alwaysInsertFields: true,
    }),
  ],
  sharp,
})
