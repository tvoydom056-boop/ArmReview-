'use client'

import { useState } from 'react'

import type { MatchOutcome } from '@/lib/matchView'

import styles from './ScoreReveal.module.css'

// Счёт и победитель — спойлер: только по нажатию (PROJECT.md § 12)
export function ScoreReveal({ outcome }: { outcome: MatchOutcome }) {
  const [shown, setShown] = useState(false)

  return (
    <div className={styles.root}>
      {shown ? (
        <p className={styles.result}>
          <span>{outcome.headline}</span>
          {outcome.score ? <strong className={styles.score}>{outcome.score}</strong> : null}
        </p>
      ) : null}
      <button
        type="button"
        className={styles.button}
        aria-expanded={shown}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? 'Скрыть счёт' : 'Показать счёт'}
      </button>
    </div>
  )
}
