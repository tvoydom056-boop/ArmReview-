import type { CollectionConfig } from 'payload'

import { anyone } from './access'
import { slugField } from './fields/slug'

export const Events: CollectionConfig = {
  slug: 'events',
  labels: { singular: 'Турнир', plural: 'Турниры' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'date', 'location'] },
  access: { read: anyone },
  fields: [
    { name: 'title', type: 'text', label: 'Название', required: true },
    slugField(['title']),
    {
      name: 'date',
      type: 'date',
      label: 'Дата',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
    },
    { name: 'location', type: 'text', label: 'Место' },
    { name: 'poster', type: 'upload', relationTo: 'media', label: 'Постер' },
    { name: 'posterSource', type: 'text', label: 'Источник постера' },
  ],
}
