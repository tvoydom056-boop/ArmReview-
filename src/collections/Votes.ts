import type { CollectionConfig, NumberField } from 'payload'

import { isAdmin } from './access'

const scale = (name: string, label: string): NumberField => ({
  name,
  type: 'number',
  label,
  required: true,
  min: 1,
  max: 5,
})

// Payload по умолчанию открывает REST у каждой коллекции — публичный доступ закрываем.
// Голоса создаются только серверным кодом через Local API (он обходит access, Срез 2);
// в админке их можно смотреть, скрывать (isHidden) и удалять.
export const Votes: CollectionConfig = {
  slug: 'votes',
  labels: { singular: 'Голос', plural: 'Голоса' },
  admin: { defaultColumns: ['match', 'deviceId', 'isHidden', 'createdAt'] },
  access: {
    read: isAdmin,
    create: () => false,
    update: isAdmin,
    delete: isAdmin,
  },
  // Гонка «проверил — записал»: дубль голоса не пускает сама БД (STRUCTURE.md § 2)
  indexes: [{ fields: ['match', 'deviceId'], unique: true }],
  fields: [
    { name: 'match', type: 'relationship', relationTo: 'matches', label: 'Матч', required: true },
    { name: 'deviceId', type: 'text', label: 'Устройство (cookie)', required: true, index: true },
    { name: 'ipHash', type: 'text', label: 'Хеш IP', required: true, index: true },
    scale('spectacle', 'Зрелищность'),
    scale('intrigue', 'Интрига'),
    scale('technique', 'Техничность'),
    scale('refereeing', 'Судейство'),
    { name: 'isHidden', type: 'checkbox', label: 'Скрыть из подсчёта', defaultValue: false },
  ],
}
