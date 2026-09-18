import { toMatchView, type MatchView } from '../matchView'
import { getPayloadClient } from '../payload'

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
  return docs.flatMap((doc) => toMatchView(doc) ?? [])
}
