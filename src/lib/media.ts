import type { Media } from '../../payload-types'

// Связь upload при depth ≥ 1 приходит объектом, при depth 0 — id
export function getPhoto(photo: number | Media | null | undefined) {
  if (!photo || typeof photo !== 'object') return null
  const url = photo.sizes?.card?.url ?? photo.url
  return url ? { url, alt: photo.alt } : null
}
