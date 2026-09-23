import type { Event } from '../../payload-types'

import { formatEventDate } from './formatDate'
import { getPhoto } from './media'

export type EventHeaderData = {
  title: string
  dateIso: string
  dateLabel: string
  location: string | null
  poster: { url: string; alt: string } | null
  posterSource: string | null
}

// Ждёт событие с depth ≥ 1, иначе постера не будет
export function toEventHeader(event: Event): EventHeaderData {
  return {
    title: event.title,
    dateIso: event.date,
    dateLabel: formatEventDate(event.date),
    location: event.location ?? null,
    poster: getPhoto(event.poster),
    posterSource: event.posterSource ?? null,
  }
}
