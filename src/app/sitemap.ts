import type { MetadataRoute } from 'next'

import { getEnv } from '@/lib/env'
import { getPayloadClient } from '@/lib/payload'
import { VOTING_ENABLED } from '@/lib/siteConfig'

// Страницы матчей и результат в карту не попадают: матч открывается из турнира, а счёт за спойлером.
// Без кеша: ссылки на борцов и турниры меняются в админке
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getEnv().SITE_URL.replace(/\/$/, '')
  const payload = await getPayloadClient()
  const [events, athletes] = await Promise.all([
    payload.find({ collection: 'events', depth: 0, limit: 1000, pagination: false, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'athletes', depth: 0, limit: 5000, pagination: false, select: { slug: true, updatedAt: true } }),
  ])
  return [
    { url: `${base}/` },
    { url: `${base}/events` },
    { url: `${base}/athletes` },
    ...(VOTING_ENABLED ? [{ url: `${base}/top` }] : []),
    ...events.docs.map((e) => ({ url: `${base}/events/${e.slug}`, lastModified: e.updatedAt })),
    ...athletes.docs.map((a) => ({ url: `${base}/athletes/${a.slug}`, lastModified: a.updatedAt })),
  ]
}
