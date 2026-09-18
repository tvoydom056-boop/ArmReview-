import type { CollectionConfig } from 'payload'

import { anyone } from './access'

export const Matches: CollectionConfig = {
  slug: 'matches',
  labels: { singular: 'Матч', plural: 'Матчи' },
  admin: { defaultColumns: ['event', 'athlete1', 'athlete2', 'hand', 'cardOrder'] },
  access: { read: anyone },
  fields: [
    { name: 'event', type: 'relationship', relationTo: 'events', label: 'Турнир', required: true, index: true },
    { name: 'athlete1', type: 'relationship', relationTo: 'athletes', label: 'Борец 1', required: true, index: true },
    { name: 'athlete2', type: 'relationship', relationTo: 'athletes', label: 'Борец 2', required: true, index: true },
    {
      name: 'hand',
      type: 'select',
      label: 'Рука',
      required: true,
      options: [
        { label: 'Правая', value: 'right' },
        { label: 'Левая', value: 'left' },
      ],
    },
    { name: 'weightClass', type: 'text', label: 'Весовая категория' },
    { name: 'isTitle', type: 'checkbox', label: 'Титульный', defaultValue: false },
    { name: 'score1', type: 'number', label: 'Счёт борца 1' },
    { name: 'score2', type: 'number', label: 'Счёт борца 2' },
    { name: 'winner', type: 'relationship', relationTo: 'athletes', label: 'Победитель' },
    {
      name: 'resultType',
      type: 'select',
      label: 'Тип исхода',
      required: true,
      defaultValue: 'normal',
      options: [
        { label: 'Обычный', value: 'normal' },
        { label: 'Травма', value: 'injury' },
        { label: 'Дисквалификация', value: 'dq' },
        { label: 'Не состоялся', value: 'no_contest' },
      ],
    },
    { name: 'cardOrder', type: 'number', label: 'Порядок в карте матчей' },
    { name: 'notes', type: 'textarea', label: 'Заметки' },
  ],
}
