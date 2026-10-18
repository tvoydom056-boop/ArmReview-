import Image from 'next/image'
import Link from 'next/link'

import type { EventHeaderData } from '@/lib/eventView'
import { pluralize } from '@/lib/plural'
import { VOTING_ENABLED } from '@/lib/siteConfig'

import styles from './UpcomingEvent.module.css'

// Ближайший турнир на главной — design/home.html .upcoming
export function UpcomingEvent({ event, slug, matchCount }: { event: EventHeaderData; slug: string; matchCount: number }) {
  return (
    <article className={styles.card}>
      {event.poster ? (
        <div className={styles.poster}>
          <Image src={event.poster.url} alt={event.poster.alt || event.title} fill sizes="240px" unoptimized />
        </div>
      ) : null}
      <div>
        <h2 className={styles.title}>{event.title}</h2>
        <p className={styles.meta}>
          {event.dateLabel}
          {event.location ? ` · ${event.location}` : ''}
        </p>
        <div className={styles.pills}>
          {matchCount > 0 ? (
            <span className={styles.pill}>
              {matchCount} {pluralize(matchCount, ['матч', 'матча', 'матчей'])} в карте
            </span>
          ) : null}
          {VOTING_ENABLED ? <span className={styles.pillGold}>Голосование откроется после турнира</span> : null}
        </div>
        <Link href={`/events/${slug}`} className={styles.action}>
          Карта матчей
        </Link>
      </div>
    </article>
  )
}
