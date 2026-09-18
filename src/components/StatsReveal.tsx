'use client'

import { useState } from 'react'

import type { AthleteStats } from '@/lib/athleteStats'

import styles from './StatsReveal.module.css'

// Результаты — спойлер: показываем только по нажатию (PROJECT.md § 12)
export function StatsReveal({ stats }: { stats: AthleteStats }) {
  const [shown, setShown] = useState(false)

  return (
    <section className={styles.root}>
      <h2 className={styles.title}>Статистика</h2>
      {shown ? (
        <>
          <div className={styles.grid}>
            <HandCell label="Правая рука" hand={stats.right} />
            <HandCell label="Левая рука" hand={stats.left} />
          </div>
          {/* TODO(вопрос 7): считаем только внесённые матчи EvW, не всю карьеру */}
          <p className={styles.note}>По внесённым матчам East vs West</p>
        </>
      ) : null}
      <button
        type="button"
        className={styles.button}
        aria-expanded={shown}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? 'Скрыть' : 'Показать'}
      </button>
    </section>
  )
}

function HandCell({ label, hand }: { label: string; hand: AthleteStats['right'] }) {
  return (
    <div className={styles.cell}>
      <span className={styles.label}>{label}</span>
      {hand.matches === 0 ? (
        <span className={styles.empty}>нет данных</span>
      ) : (
        <span className={styles.value}>
          {hand.wins} п. из {hand.matches}
        </span>
      )}
    </div>
  )
}
