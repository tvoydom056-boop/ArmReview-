import type { CollectionConfig, RelationshipFieldSingleValidation } from 'payload'

import { formatMatchTitle, validateDifferentAthletes, validateWinner } from '@/lib/matchRules'
import { refId } from '@/lib/refId'
import { validateWeightClass } from '@/lib/weightClass'

import { anyone, isAdminField } from './access'
import { techniqueField } from './fields/technique'

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
    // Техника: пусто при создании → основная техника борца, Влад правит только исключения.
    // Только при создании: у старых матчей техника — исторический факт, задним числом не подставляем
    // (docs/changes/vlad-feedback-2026-09-27.md, вопросы 22, 24)
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        const id1 = refId(data.athlete1 ?? originalDoc?.athlete1)
        const id2 = refId(data.athlete2 ?? originalDoc?.athlete2)
        const [a1, a2] = await Promise.all(
          [id1, id2].map((id) =>
            id === null ? null : req.payload.findByID({ collection: 'athletes', id, depth: 0, req }),
          ),
        )
        return {
          ...data,
          title: formatMatchTitle(a1?.name, a2?.name),
          ...(operation === 'create' && {
            technique1: data.technique1 || a1?.mainTechnique || null,
            technique2: data.technique2 || a2?.mainTechnique || null,
          }),
        }
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
    techniqueField('technique1', 'Техника борца 1', 'Пусто — подставится основная техника борца'),
    techniqueField('technique2', 'Техника борца 2', 'Пусто — подставится основная техника борца'),
    {
      name: 'weightClass',
      type: 'text',
      label: 'Весовая категория',
      // название («Полутяжёлый вес») вычисляется из лимита — lib/weightClass.ts
      admin: { description: 'Лимит: «до 85 кг» или «свыше 105 кг»' },
      validate: validateWeightClass,
    },
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
    {
      name: 'notes',
      type: 'textarea',
      label: 'Заметки',
      // Публичный REST отдавал поле анониму (аудит S10); на сайте заметки не выводятся
      access: { read: isAdminField },
      admin: { description: 'Внутренние: на сайте и в публичном API не показываются' },
    },
  ],
}
