import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { EventBoard } from '@/components/EventBoard'
import { toEventHeader } from '@/lib/eventView'
import { getEventBySlug, getEventMatches } from '@/lib/queries/events'

import styles from './event.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const loadEvent = cache(getEventBySlug)

// В title только название турнира — без результатов (PROJECT.md § 12)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await loadEvent((await params).slug)
  if (!event) return { title: 'Турнир не найден' }
  const poster = toEventHeader(event).poster
  return {
    title: event.title,
    openGraph: {
      title: event.title,
      description: 'Карта матчей и оценки зрителей',
      ...(poster ? { images: [poster.url] } : {}),
    },
  }
}

export default async function EventPage({ params }: Props) {
  const event = await loadEvent((await params).slug)
  if (!event) notFound()

  const matches = await getEventMatches(event.id)

  return (
    <>
      <Link href="/events" className={styles.back}>
        ← Все турниры
      </Link>
      <EventBoard event={toEventHeader(event)} matches={matches} />
    </>
  )
}
