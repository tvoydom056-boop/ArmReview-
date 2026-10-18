import { toMatchView, type MatchView } from '../matchView'
import { getPayloadClient } from '../payload'
import { refId } from '../refId'
import { getDisplayedRatings, NO_VOTES } from './ratings'

export async function getEvents() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'events',
    sort: '-date',
    depth: 0,
    limit: 100,
    pagination: false,
  })
  return docs
}

// Турниры (новые первыми) с числом матчей в карте — для главной (design/home.html)
export async function getEventsWithMatchCount() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'events',
    sort: '-date',
    depth: 1,
    limit: 100,
    pagination: false,
  })
  // Один запрос на все матчи вместо count на каждый турнир
  const { docs: matches } = await payload.find({
    collection: 'matches',
    depth: 0,
    limit: 10000,
    pagination: false,
    select: { event: true },
  })
  const counts = new Map<number, number>()
  for (const m of matches) {
    const eventId = refId(m.event)
    if (eventId !== null) counts.set(eventId, (counts.get(eventId) ?? 0) + 1)
  }
  return docs.map((event) => ({ event, matchCount: counts.get(event.id) ?? 0 }))
}

export async function getEventBySlug(slug: string) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

export async function getLatestEvent() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'events',
    sort: '-date',
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
}

export async function getEventMatches(eventId: number): Promise<MatchView[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    where: { event: { equals: eventId } },
    sort: ['cardOrder', 'id'],
    depth: 1,
    limit: 100,
    pagination: false,
  })
  const ratings = await getDisplayedRatings()
  return docs.flatMap((doc) => toMatchView(doc, ratings.get(doc.id) ?? NO_VOTES) ?? [])
}
