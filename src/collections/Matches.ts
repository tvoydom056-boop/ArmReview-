import type { CollectionConfig, RelationshipFieldSingleValidation } from 'payload'

import { formatMatchTitle, validateDifferentAthletes, validateWinner } from '@/lib/matchRules'
import { refId } from '@/lib/refId'

import { anyone } from './access'

const differentAthletes: RelationshipFieldSingleValidation = (value, { siblingData }) =>
  validateDifferentAthletes(siblingData, value)

const winnerIsParticipant: RelationshipFieldSingleValidation = (value, { siblingData }) =>
  validateWinner(siblingData, value)

export const Matches: CollectionConfig = {
  slug: 'matches',
  labels: { singular: 'Матч', plural: 'Матчи' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'event', 'hand', 'cardOrder'] },
  access: { read: anyone },
  hooks: {
    // Название матча хранится в базе только ради читаемого списка в админке; в публичный код не попадает
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const id1 = refId(data.athlete1 ?? originalDoc?.athlete1)
        const id2 = refId(data.athlete2 ?? originalDoc?.athlete2)
        const [a1, a2] = await Promise.all(
          [id1, id2].map((id) =>
            id === null ? null : req.payload.findByID({ collection: 'athletes', id, depth: 0, req }),
          ),
        )
        return { ...data, title: formatMatchTitle(a1?.name, a2?.name) }
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', label: 'Название', admin: { readOnly: true, description: 'Заполняется автоматически' } },
    { name: 'event', type: 'relationship', relationTo: 'events', label: 'Турнир', required: true, index: true },
    { name: 'athlete1', type: 'relationship', relationTo: 'athletes', label: 'Борец 1', required: true, index: true },
    {
      name: 'athlete2',
      type: 'relationship',
      relationTo: 'athletes',
      label: 'Борец 2',
      required: true,
      index: true,
      validate: differentAthletes,
    },
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
    { name: 'score1', type: 'number', label: 'Счёт борца 1', min: 0 },
    { name: 'score2', type: 'number', label: 'Счёт борца 2', min: 0 },
    {
      name: 'winner',
      type: 'relationship',
      relationTo: 'athletes',
      label: 'Победитель',
      validate: winnerIsParticipant,
    },
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
