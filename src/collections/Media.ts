import type { CollectionConfig } from 'payload'

import { anyone } from './access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: anyone },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    imageSizes: [{ name: 'card', width: 600 }],
  },
  fields: [{ name: 'alt', type: 'text', label: 'Описание (alt)', required: true }],
}
