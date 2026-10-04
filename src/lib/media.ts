import type { Media } from '../../payload-types'

// position — CSS object-position из «Точки фокуса» в редакторе картинки Payload:
// при обрезке под круг/квадрат в кадре остаётся отмеченная область, а не центр
export type Photo = { url: string; alt: string; position: string }

// Связь upload при depth ≥ 1 приходит объектом, при depth 0 — id
export function getPhoto(photo: number | Media | null | undefined): Photo | null {
  if (!photo || typeof photo !== 'object') return null
  const url = photo.sizes?.card?.url ?? photo.url
  if (!url) return null
  return { url, alt: photo.alt, position: `${photo.focalX ?? 50}% ${photo.focalY ?? 50}%` }
}
