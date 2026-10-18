'use client'

import Link from 'next/link'
import { useState } from 'react'

import { getHandLabel, type AthleteRef, type MatchView } from '@/lib/matchView'
import { matchesTopFilter, type TopFilter } from '@/lib/topFilter'

import { CountryFlag } from './CountryFlag'
import { EmptyState } from './EmptyState'
import { RatingBadge } from './RatingBadge'
import styles from './TopList.module.css'

export type TopListItem = { match: MatchView; eventTitle: string; eventDate: string }

const FILTERS: { value: TopFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'year', label: 'За год' },
  { value: 'right', label: 'Правая' },
  { value: 'left', label: 'Левая' },
]

// Список топа с фильтрами — design/top.html. Место считается заново внутри фильтра:
// «топ среди левой руки» начинается с первого, а не с места в общем рейтинге
export function TopList({ items }: { items: TopListItem[] }) {
  // «сейчас» фиксируем в момент клика: Date.now() в рендере нечист (react-hooks/purity)
  const [{ filter, now }, setState] = useState<{ filter: TopFilter; now: number }>({ filter: 'all', now: 0 })
  const visible = items.filter(({ match, eventDate }) => matchesTopFilter({ hand: match.hand, eventDate }, filter, now))

  return (
    <>
      <div className={styles.chips} role="group" aria-label="Фильтр топа">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={styles.chip}
            aria-pressed={filter === f.value}
            onClick={() => setState({ filter: f.value, now: Date.now() })}
          >
            {f.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState
          title="В этом срезе пока пусто"
          hint="Матч попадает в топ от 5 голосов. Выберите другой фильтр или вернитесь к полному списку."
        />
      ) : (
        <ol className={styles.list}>
          {visible.map(({ match, eventTitle }, i) => (
            <li key={match.id}>
              <Link href={`/matches/${match.id}`} className={styles.row}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.main}>
                  <Fighter athlete={match.athlete1} />
                  <Fighter athlete={match.athlete2} />
                  <span className={styles.sub}>
                    {eventTitle} · {getHandLabel(match.hand)}
                  </span>
                </span>
                <RatingBadge rating={match.rating} compact />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

function Fighter({ athlete }: { athlete: AthleteRef }) {
  return (
    <span className={styles.fighter}>
      <CountryFlag code={athlete.countryCode} />
      {athlete.name}
    </span>
  )
}
