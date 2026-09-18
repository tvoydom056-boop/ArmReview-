import type { TextField } from 'payload'

import { slugify } from '@/lib/slugify'

// Если slug не введён — берём первое непустое из sourceFields (например nameEn, потом name)
export const slugField = (sourceFields: string[]): TextField => ({
  name: 'slug',
  type: 'text',
  label: 'Slug (для URL)',
  required: true,
  unique: true,
  index: true,
  admin: { description: 'Латиницей. Если пусто — берётся из имени/названия, поэтому кириллицу заполните латиницей вручную' },
  hooks: {
    beforeValidate: [
      ({ value, siblingData }) => {
        if (value) return value
        for (const field of sourceFields) {
          const slug = slugify(String(siblingData[field] ?? ''))
          if (slug) return slug
        }
        return value
      },
    ],
  },
  validate: (value: string | null | undefined) =>
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value ?? '') ||
    'Slug: латиница, цифры и дефис. Заполните поле вручную или введите имя латиницей',
})
