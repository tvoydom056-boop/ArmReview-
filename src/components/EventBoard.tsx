import Image from 'next/image'

import type { EventHeaderData } from '@/lib/eventView'
import type { MatchView } from '@/lib/matchView'
import { pluralize } from '@/lib/plural'
import { isVotingOpen } from '@/lib/votingWindow'

import styles from './EventBoard.module.css'
import { MatchRow } from './MatchRow'

// Шапка турнира и карта матчей: одна и та же на главной и на /events/[slug] (design/event.html)
export function EventBoard({ event, matches }: { event: EventHeaderData; matches: MatchView[] }) {
  const titleCount = matches.filter((m) => m.isTitle).length
  // статус выводится из даты турнира: турнир прошёл → оценки принимаются (design/event.html)
  const votingOpen = isVotingOpen(event.dateIso, new Date())

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
            {matches.length > 0
              ? ` · ${matches.length} ${pluralize(matches.length, ['матч', 'матча', 'матчей'])} в карте`
              : ''}
          </p>
          <div className={styles.pills}>
            <span className={styles.pill}>
              {votingOpen ? 'Голосование открыто' : 'Голосование откроется после турнира'}
            </span>
            {titleCount > 0 ? <span className={styles.pillGold}>Титульные матчи: {titleCount}</span> : null}
          </div>
          {event.poster && event.posterSource ? (
            <p className={styles.source}>Постер: {event.posterSource}</p>
          ) : null}
        </div>
      </header>
      <section>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Карта матчей</h2>
          {matches.length > 0 ? <span className={styles.sectionSub}>по порядку в карте</span> : null}
        </div>
        {matches.length === 0 ? (
          <p className={styles.empty}>Матчи ещё не внесены.</p>
        ) : (
          <>
            <p className={styles.note}>
              Счёт открывается в каждой строке отдельно — карту можно пролистать целиком, не узнав
              результат матча, который вы ещё не смотрели.
            </p>
            <ol className={styles.list}>
              {matches.map((m, i) => (
                <li key={m.id}>
                  <MatchRow match={m} cardNo={i + 1} />
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </>
  )
}
