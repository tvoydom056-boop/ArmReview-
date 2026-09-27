import type { CollectionConfig } from 'payload'

// Только админы. Первого пользователя Payload предлагает создать при первом заходе в /admin.
export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  // По умолчанию Payload ставит cookie без Secure: при заходе по http:// токен админа ушёл бы
  // открытым текстом до редиректа на https (docs/changes/security-audit-2026-09.md, S5)
  auth: { cookies: { secure: process.env.NODE_ENV === 'production' } },
  fields: [],
}
