import { EventBoard } from '@/components/EventBoard'
import { toEventHeader } from '@/lib/eventView'
import { getEventMatches, getLatestEvent } from '@/lib/queries/events'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const event = await getLatestEvent()
  if (!event) return <p>Турниров пока нет.</p>

  const matches = await getEventMatches(event.id)
  return <EventBoard event={toEventHeader(event)} matches={matches} />
}
