import { toMatchView, type MatchView } from '../matchView'
import { getPayloadClient } from '../payload'
import { getRatingsByMatch, NO_VOTES } from './ratings'

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
  return Promise.all(
    docs.map(async (event) => {
      const { totalDocs } = await payload.count({ collection: 'matches', where: { event: { equals: event.id } } })
      return { event, matchCount: totalDocs }
    }),
  )
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
  const ratings = await getRatingsByMatch()
  return docs.flatMap((doc) => toMatchView(doc, ratings.get(doc.id) ?? NO_VOTES) ?? [])
}
