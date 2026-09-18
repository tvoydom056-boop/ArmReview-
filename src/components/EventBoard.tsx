import Image from 'next/image'

import type { EventHeaderData } from '@/lib/eventView'
import type { MatchView } from '@/lib/matchView'

import styles from './EventBoard.module.css'
import { MatchCard } from './MatchCard'

// Шапка турнира и карта матчей: одна и та же на главной и на /events/[slug]
export function EventBoard({ event, matches }: { event: EventHeaderData; matches: MatchView[] }) {
  return (
    <>
      <header className={styles.header}>
        {event.poster ? (
          <div className={styles.poster}>
            <Image src={event.poster.url} alt={event.poster.alt || event.title} fill sizes="200px" unoptimized />
          </div>
        ) : null}
        <div>
          <h1 className={styles.title}>{event.title}</h1>
          <p className={styles.meta}>
            {event.dateLabel}
            {event.location ? ` · ${event.location}` : ''}
          </p>
          {event.poster && event.posterSource ? (
            <p className={styles.source}>Постер: {event.posterSource}</p>
          ) : null}
        </div>
      </header>
      <h2 className={styles.subtitle}>Карта матчей</h2>
      {matches.length === 0 ? (
        <p className={styles.empty}>Матчи ещё не внесены.</p>
      ) : (
        <ul className={styles.list}>
          {matches.map((m) => (
            <li key={m.id}>
              <MatchCard match={m} href={`/matches/${m.id}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
