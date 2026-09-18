import type { CollectionConfig } from 'payload'

import { anyone } from './access'
import { slugField } from './fields/slug'

export const Athletes: CollectionConfig = {
  slug: 'athletes',
  labels: { singular: 'Борец', plural: 'Борцы' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'countryCode', 'isFeatured'] },
  access: { read: anyone },
  fields: [
    { name: 'name', type: 'text', label: 'Имя', required: true },
    { name: 'nameEn', type: 'text', label: 'Имя латиницей' },
    slugField(['nameEn', 'name']),
    {
      name: 'countryCode',
      type: 'text',
      label: 'Страна (ISO-2, например RU)',
      required: true,
      maxLength: 2,
      validate: (value: string | null | undefined) =>
        /^[A-Za-z]{2}$/.test(value ?? '') || 'Двухбуквенный код страны, например RU',
      hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.toUpperCase() : value)] },
    },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Фото' },
    {
      name: 'photoSource',
      type: 'text',
      label: 'Источник фото',
      admin: { description: 'Юр. минимум: у каждого фото должен быть источник' },
    },
    { name: 'birthYear', type: 'number', label: 'Год рождения', min: 1900, max: 2100 },
    { name: 'heightCm', type: 'number', label: 'Рост, см', min: 100, max: 250 },
    { name: 'weightKg', type: 'number', label: 'Вес, кг', min: 30, max: 250 },
    // TODO(вопрос 6): откуда брать стиль (и рост/вес) — пока свободный текст
    { name: 'style', type: 'text', label: 'Стиль' },
    { name: 'achievements', type: 'textarea', label: 'Достижения' },
    {
      name: 'isFeatured',
      type: 'checkbox',
      label: 'Известный борец (подробный профиль)',
      defaultValue: false,
      index: true,
    },
  ],
}
