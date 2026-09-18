import type { CollectionConfig } from 'payload'

// Только админы. Первого пользователя Payload предлагает создать при первом заходе в /admin.
export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  auth: true,
  fields: [],
}
