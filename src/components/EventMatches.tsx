'use client'

import { useState, useSyncExternalStore, type ReactNode } from 'react'

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

// «Я смотрел этот турнир» помним в localStorage, как тему: только у этого зрителя. Сервер счёт не раскрывает и
// о localStorage не знает, поэтому на сервере и при гидрации — false. Если хранилище недоступно, держим в памяти
const watchedInMemory = new Set<string>()
const watchedListeners = new Set<() => void>()
const watchedStorageKey = (key: string) => `watched:${key}`

function readWatched(key: string): boolean {
  try {
    return localStorage.getItem(watchedStorageKey(key)) === '1' || watchedInMemory.has(key)
  } catch {
    return watchedInMemory.has(key)
  }
}

function writeWatched(key: string, value: boolean) {
  if (value) watchedInMemory.add(key)
  else watchedInMemory.delete(key)
  try {
    if (value) localStorage.setItem(watchedStorageKey(key), '1')
    else localStorage.removeItem(watchedStorageKey(key))
  } catch {
    // хранилище недоступно — остаётся память вкладки
  }
  watchedListeners.forEach((listener) => listener())
}

function subscribeWatched(listener: () => void) {
  watchedListeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    watchedListeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function useWatched(key: string): [boolean, (value: boolean) => void] {
  const watched = useSyncExternalStore(subscribeWatched, () => readWatched(key), () => false)
  return [watched, (value) => writeWatched(key, value)]
}

// Фильтр карты матчей — design/event.html «Фильтр карты матчей». Номер в карте не пересчитывается:
// «Карта 7» остаётся седьмым, даже когда виден один матч. intro — заголовок и подпись секции (серверная разметка)
export function EventMatches({
  matches,
  intro,
  watchedKey,
}: {
  matches: MatchView[]
  intro: ReactNode
  // slug турнира: по нему помним в браузере «я смотрел этот турнир» (только у этого зрителя, как тема)
  watchedKey: string
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [watched, setWatched] = useWatched(watchedKey)
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
        <button type="button" className={styles.chip} aria-pressed={watched} onClick={() => setWatched(!watched)}>
          Я смотрел этот турнир
        </button>
      </div>
      <section>
        {intro}
        {visible.length === 0 ? (
          <p className={styles.empty}>В карте нет таких матчей</p>
        ) : (
          <ol className={styles.list}>
            {visible.map(({ match, cardNo }) => (
              <li key={match.id}>
                <MatchRow match={match} cardNo={cardNo} revealed={watched} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  )
}
