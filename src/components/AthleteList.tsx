'use client'

import { useState } from 'react'

import { matchesAthleteSearch } from '@/lib/athleteSearch'
import { getCountryName } from '@/lib/country'
import type { Photo } from '@/lib/media'
import { pluralize } from '@/lib/plural'

import { AthleteCard } from './AthleteCard'
import styles from './AthleteList.module.css'
import { EmptyState } from './EmptyState'

export type AthleteListItem = {
  id: number
  slug: string
  name: string
  nameEn: string | null
  countryCode: string
  weightKg: number | null
  photo: Photo | null
  isFeatured: boolean
  hands: ('right' | 'left')[]
}

type Filter = 'all' | 'right' | 'left' | 'countries'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'right', label: 'Правая' },
  { value: 'left', label: 'Левая' },
  { value: 'countries', label: 'По странам' },
]

// Фото первого ряда сетки (на десктопе) — в первом экране, грузим без ленивой подгрузки
const EAGER_PHOTOS = 6

// Поиск и фильтры списка борцов — design/athletes.html. «Правая / Левая» — выходил ли борец этой рукой
// в матчах из базы; «По странам» — тот же список, сгруппированный по странам
export function AthleteList({ athletes }: { athletes: AthleteListItem[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const visible = athletes.filter(
    (a) =>
      matchesAthleteSearch(a, query) &&
      (filter === 'right' || filter === 'left' ? a.hands.includes(filter) : true),
  )

  return (
    <>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Имя борца — Сагинашвили или Saginashvili"
          aria-label="Поиск борца"
        />
        <div className={styles.chips} role="group" aria-label="Фильтр борцов">
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
      </div>
      <p className={styles.count}>
        {visible.length} из {athletes.length} {pluralize(athletes.length, ['борца', 'борцов', 'борцов'])}
      </p>
      {visible.length === 0 ? (
        <EmptyState
          title="Никого не нашли"
          hint="Попробуйте другое написание: поиск работает и по кириллице, и по латинице."
        />
      ) : filter === 'countries' ? (
        <ByCountry athletes={visible} />
      ) : (
        <Grid athletes={visible} />
      )}
    </>
  )
}

function Grid({ athletes, eagerCount = EAGER_PHOTOS }: { athletes: AthleteListItem[]; eagerCount?: number }) {
  return (
    <ul className={styles.grid}>
      {athletes.map((a, i) => (
        <li key={a.id}>
          <AthleteCard
            eager={i < eagerCount}
            slug={a.slug}
            name={a.name}
            countryCode={a.countryCode}
            weightKg={a.weightKg}
            photo={a.photo}
            isFeatured={a.isFeatured}
          />
        </li>
      ))}
    </ul>
  )
}

function ByCountry({ athletes }: { athletes: AthleteListItem[] }) {
  const groups = new Map<string, AthleteListItem[]>()
  for (const a of athletes) {
    const country = getCountryName(a.countryCode)
    groups.set(country, [...(groups.get(country) ?? []), a])
  }
  const sorted = [...groups].sort(([a], [b]) => a.localeCompare(b, 'ru'))

  return (
    <>
      {sorted.map(([country, items]) => (
        <section key={country} className={styles.group}>
          <h2 className={styles.groupTitle}>
            {country} <span>{items.length}</span>
          </h2>
          <Grid athletes={items} eagerCount={0} />
        </section>
      ))}
    </>
  )
}
