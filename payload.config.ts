import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

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
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  // STRUCTURE.md § 7: GraphQL не нужен, лишнюю поверхность API не открываем
  graphQL: { disable: true },
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URI || 'file:./armreview.db' },
  }),
  sharp,
})
