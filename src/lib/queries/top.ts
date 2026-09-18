import { toMatchView, type MatchView } from '../matchView'
import { getPayloadClient } from '../payload'
import { rankRatings } from '../rating'
import { getRatingsByMatch } from './ratings'

export type TopMatch = { match: MatchView; eventTitle: string }

// Топ-100 по баллу; в него попадают только матчи, у которых баллы уже видны (от 5 голосов)
export async function getTopMatches(limit = 100): Promise<TopMatch[]> {
  const ratings = await getRatingsByMatch()
  const ids = rankRatings(ratings, limit)
  if (ids.length === 0) return []

  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    where: { id: { in: ids } },
    depth: 1,
    limit: ids.length,
    pagination: false,
  })
  const byId = new Map(docs.map((doc) => [doc.id, doc]))

  return ids.flatMap((id) => {
    const doc = byId.get(id)
    const rating = ratings.get(id)
    if (!doc || !rating || typeof doc.event !== 'object') return []
    const match = toMatchView(doc, rating)
    return match ? [{ match, eventTitle: doc.event.title }] : []
  })
}
