import type { CollectionConfig } from 'payload'

import { slugify } from '@/lib/slugify'

import { anyone } from './access'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Турнир', plural: 'Турниры' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'date', 'location'] },
  access: { read: anyone },
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug (для URL)',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Если пусто — берётся из названия латиницей' },
      hooks: {
        beforeValidate: [({ value, siblingData }) => value || slugify(String(siblingData.title || ''))],
      },
    },
    { name: 'date', type: 'date', label: 'Дата', required: true, index: true },
    { name: 'location', type: 'text', label: 'Место' },
    { name: 'poster', type: 'upload', relationTo: 'media', label: 'Постер' },
    { name: 'posterSource', type: 'text', label: 'Источник постера' },
  ],
}
