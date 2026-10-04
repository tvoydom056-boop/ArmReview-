import type { CollectionConfig } from 'payload'

import { anyone } from './access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: anyone },
  admin: {
    // Встроенный редактор Payload не умеет поворот и квадрат — добавляем свою кнопку рядом
    components: { edit: { Upload: '/components/admin/MediaUpload#MediaUpload' } },
  },
  upload: {
    // На сервере — вне папки релиза (/var/lib/armreview/media), иначе картинки «уедут» вместе с
    // releases/<версия> при следующей выкатке. Payload не резолвит путь: относительный — от cwd процесса
    staticDir: process.env.MEDIA_DIR || 'media',
    mimeTypes: ['image/*'],
    imageSizes: [{ name: 'card', width: 600 }],
  },
  fields: [{ name: 'alt', type: 'text', label: 'Описание (alt)', required: true }],
}
