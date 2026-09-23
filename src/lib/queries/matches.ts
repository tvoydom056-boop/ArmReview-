import type { Match } from '../../../payload-types'
import { toMatchView, type MatchView } from '../matchView'
import { getPhoto } from '../media'
import { getPayloadClient } from '../payload'
import { getVotingState, type VotingState } from '../votingWindow'
import { formatEventDate } from '../formatDate'
import { getRatingsByMatch, NO_VOTES } from './ratings'

type AthletePhoto = { url: string; alt: string } | null

export type MatchPanelData = {
  match: MatchView
  event: { title: string; slug: string; dateLabel: string }
  photos: { athlete1: AthletePhoto; athlete2: AthletePhoto }
  votingState: VotingState
}

// Всё, что нужно окну матча: и полной странице /matches/[id], и модалке поверх турнира
export async function getMatchPanelData(id: number): Promise<MatchPanelData | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    where: { id: { equals: id } },
    depth: 2, // фото борцов для противостояния: матч → борец → media
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
    photos: { athlete1: getAthletePhoto(doc.athlete1), athlete2: getAthletePhoto(doc.athlete2) },
    votingState: getVotingState(doc.resultType, doc.event.date, new Date()),
  }
}

function getAthletePhoto(athlete: Match['athlete1']): AthletePhoto {
  return typeof athlete === 'object' ? getPhoto(athlete.photo) : null
}
