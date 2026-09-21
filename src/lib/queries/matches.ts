import { toMatchView, type MatchView } from '../matchView'
import { getPayloadClient } from '../payload'
import { getVotingState, type VotingState } from '../votingWindow'
import { formatEventDate } from '../formatDate'
import { getRatingsByMatch, NO_VOTES } from './ratings'

export type MatchPanelData = {
  match: MatchView
  event: { title: string; slug: string; dateLabel: string }
  votingState: VotingState
}

// Всё, что нужно окну матча: и полной странице /matches/[id], и модалке поверх турнира
export async function getMatchPanelData(id: number): Promise<MatchPanelData | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    where: { id: { equals: id } },
    depth: 1,
    limit: 1,
  })
  const doc = docs[0]
  if (!doc || typeof doc.event !== 'object') return null

  const ratings = await getRatingsByMatch()
  const match = toMatchView(doc, ratings.get(doc.id) ?? NO_VOTES)
  if (!match) return null

  return {
    match,
    event: { title: doc.event.title, slug: doc.event.slug, dateLabel: formatEventDate(doc.event.date) },
    votingState: getVotingState(doc.resultType, doc.event.date, new Date()),
  }
}
