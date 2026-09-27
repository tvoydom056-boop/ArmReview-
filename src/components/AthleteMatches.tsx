'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { HistoryRow } from '@/lib/athleteView'
import { pluralize } from '@/lib/plural'

import styles from './AthleteMatches.module.css'
import { CountryFlag } from './CountryFlag'
import { Spoiler } from './Spoiler'

type Hand = 'all' | 'right' | 'left'
const HANDS: { value: Hand; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'right', label: 'Правая' },
  { value: 'left', label: 'Левая' },
]

// Заглушка под размытием: те же строки без результата (см. Spoiler)
const hide = (row: HistoryRow): HistoryRow => ({ ...row, result: 'none', score: '0–0', note: null, opponentWinRate: 50 })

// История матчей борца — design/athlete.html «Матчи». Исход, счёт и % побед соперника —
// результаты, поэтому весь список за кнопкой (PROJECT.md § 12)
export function AthleteMatches({ rows }: { rows: HistoryRow[] }) {
  const [hand, setHand] = useState<Hand>('all')
  const visible = hand === 'all' ? rows : rows.filter((r) => r.hand === hand)

  return (
    <section className={styles.root}>
      <h2 className={styles.title}>Матчи</h2>
      <div className={styles.chips} role="group" aria-label="Рука">
        {HANDS.map((h) => (
          <button
            key={h.value}
            type="button"
            className={styles.chip}
            aria-pressed={hand === h.value}
            onClick={() => setHand(h.value)}
          >
            {h.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className={styles.empty}>Матчей этой рукой нет</p>
      ) : (
        <Spoiler
          variant="tall"
          action="Показать результаты"
          hint="Исходы и счёт скрыты."
          placeholder={<Years rows={visible.map(hide)} />}
        >
          <Years rows={visible} />
        </Spoiler>
      )}
    </section>
  )
}

function Years({ rows }: { rows: HistoryRow[] }) {
  const years = new Map<string, HistoryRow[]>()
  for (const row of rows) years.set(row.event.year, [...(years.get(row.event.year) ?? []), row])

  return (
    <>
      {[...years].map(([year, yearRows]) => (
        <div key={year}>
          <p className={styles.year}>
            <b>{year}</b>
            <span>
              {yearRows.length} {pluralize(yearRows.length, ['матч', 'матча', 'матчей'])}
            </span>
          </p>
          <ul className={styles.list}>
            {yearRows.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

const RESULT = {
  win: { letter: 'W', label: 'Победа', className: styles.wlWin },
  loss: { letter: 'L', label: 'Поражение', className: styles.wlLoss },
  none: { letter: '—', label: 'Без результата', className: styles.wlNone },
} as const

function Row({ row }: { row: HistoryRow }) {
  const result = RESULT[row.result]
  const sub = [row.hand === 'right' ? 'Правая' : 'Левая', row.weightClass, row.isTitle ? 'титульный' : null, row.note]

  return (
    <li>
      <Link href={`/matches/${row.id}`} className={styles.row}>
        {/* цвет дублируется буквой и подписью для скринридера — design/README.md */}
        <span className={`${styles.wl} ${result.className}`} aria-label={result.label}>
          <b aria-hidden>{result.letter}</b>
          {row.score ? <span>{row.score}</span> : null}
        </span>
        <span className={styles.main}>
          <span className={styles.name}>
            <CountryFlag code={row.opponent.countryCode} />
            {row.opponent.name}
          </span>
          <span className={styles.sub}>{sub.filter(Boolean).join(' · ')}</span>
          {/* п.11 Влада: уровень соперника по его внесённым матчам */}
          <span className={styles.sub}>
            Соперник: {row.opponentWinRate === null ? 'мало матчей' : `${row.opponentWinRate}% побед`}
          </span>
        </span>
        <span className={styles.event}>
          <b>{row.event.title}</b>
          <span>{row.event.dateLabel}</span>
        </span>
      </Link>
    </li>
  )
}
