import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
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
    client: { url: process.env.DATABASE_URI || 'file:./armreview.db' },
    // В production схема применяется только миграциями: npm run payload migrate
    prodMigrations: migrations,
  }),
  sharp,
})
