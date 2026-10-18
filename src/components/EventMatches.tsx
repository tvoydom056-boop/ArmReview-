'use client'

import { useState, type ReactNode } from 'react'

import type { MatchView } from '@/lib/matchView'

import styles from './EventMatches.module.css'
import { MatchRow } from './MatchRow'

type Filter = 'all' | 'right' | 'left' | 'title'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'right', label: 'Правая рука' },
  { value: 'left', label: 'Левая рука' },
  { value: 'title', label: 'Титульные' },
]

const matchesFilter = (match: MatchView, filter: Filter) =>
  filter === 'all' || (filter === 'title' ? match.isTitle : match.hand === filter)

// Фильтр карты матчей — design/event.html «Фильтр карты матчей». Номер в карте не пересчитывается:
// «Карта 7» остаётся седьмым, даже когда виден один матч. intro — заголовок и подпись секции (серверная разметка)
export function EventMatches({ matches, intro }: { matches: MatchView[]; intro: ReactNode }) {
  const [filter, setFilter] = useState<Filter>('all')
  const visible = matches.flatMap((match, i) => (matchesFilter(match, filter) ? [{ match, cardNo: i + 1 }] : []))

  return (
    <>
      <div className={styles.chips} role="group" aria-label="Фильтр карты матчей">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={styles.chip}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <section>
        {intro}
        {visible.length === 0 ? (
          <p className={styles.empty}>В карте нет таких матчей</p>
        ) : (
          <ol className={styles.list}>
            {visible.map(({ match, cardNo }) => (
              <li key={match.id}>
                <MatchRow match={match} cardNo={cardNo} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}
