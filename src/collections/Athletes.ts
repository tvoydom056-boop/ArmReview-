import type { CollectionConfig } from 'payload'

import { anyone } from './access'
import { slugField } from './fields/slug'
import { techniqueField } from './fields/technique'

export const Athletes: CollectionConfig = {
  slug: 'athletes',
  labels: { singular: 'Борец', plural: 'Борцы' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'countryCode', 'isFeatured'] },
  access: { read: anyone },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Имя',
      required: true,
      // п.15 фидбэка Влада: в русской версии все имена по-русски, латиница — в nameEn
      admin: { description: 'Кириллицей, и у иностранцев тоже: «Эмре Йылдырым»' },
    },
    {
      name: 'nameEn',
      type: 'text',
      label: 'Имя латиницей',
      admin: { description: 'Для поиска и будущей английской версии; на странице не показывается' },
    },
    { name: 'nickname', type: 'text', label: 'Прозвище' },
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
    { name: 'weightKg', type: 'number', label: 'Актуальный вес, кг', min: 30, max: 250 },
    // TODO(вопрос 6): откуда брать технику (и рост/вес)
    techniqueField(
      'mainTechnique',
      'Основная техника',
      'Подставляется в новые матчи этого борца, если техника в матче не указана',
    ),
    // Архив свободного текста до справочника техник: удаляется миграцией после проверки Влада (вопрос 25)
    {
      name: 'style',
      type: 'text',
      label: 'Стиль (старый текст)',
      admin: { readOnly: true, description: 'Архив. Заменено полем «Основная техника»' },
    },
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
