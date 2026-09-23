import type { CSSProperties } from 'react'

import type { AthleteStats, HandStats } from '@/lib/athleteStats'
import { pluralize } from '@/lib/plural'

import { Spoiler } from './Spoiler'
import styles from './StatsReveal.module.css'

// заглушка под размытием — той же формы, что настоящая статистика (см. Spoiler)
const PLACEHOLDER: AthleteStats = { right: { matches: 5, wins: 3 }, left: { matches: 3, wins: 2 } }

// Результаты — спойлер: показываем только по нажатию (PROJECT.md § 12)
export function StatsReveal({ stats }: { stats: AthleteStats }) {
  return (
    <section className={styles.root}>
      <h2 className={styles.title}>Статистика</h2>
      <Spoiler
        variant="tall"
        action="Показать статистику"
        hint="Рекорд и винрейт скрыты."
        placeholder={<StatsBody stats={PLACEHOLDER} />}
      >
        <StatsBody stats={stats} />
      </Spoiler>
    </section>
  )
}

function StatsBody({ stats }: { stats: AthleteStats }) {
  const matches = stats.right.matches + stats.left.matches
  const wins = stats.right.wins + stats.left.wins

  return (
    <>
      <div className={styles.card}>
        <p className={styles.label}>Рекорд</p>
        <div className={styles.record}>
          <Score wins={wins} losses={matches - wins} className={styles.recordMain} />
          {matches > 0 ? <span className={styles.winPill}>{winRate({ matches, wins })}% побед</span> : null}
        </div>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Рекорд по рукам</p>
        <div className={styles.hands}>
          <HandRecord label="Правая" hand={stats.right} />
          <HandRecord label="Левая" hand={stats.left} />
        </div>
      </div>
      {/* TODO(вопрос 7): считаем только внесённые матчи EvW, не всю карьеру */}
      <p className={styles.note}>По внесённым матчам East vs West</p>
    </>
  )
}

function HandRecord({ label, hand }: { label: string; hand: HandStats }) {
  const losses = hand.matches - hand.wins

  return (
    <div>
      <p className={styles.label}>{label}</p>
      {hand.matches === 0 ? (
        <>
          <p className={styles.handscore}>—</p>
          <div className={`${styles.split} ${styles.splitEmpty}`} />
          <p className={styles.legend}>нет данных</p>
        </>
      ) : (
        <>
          <Score wins={hand.wins} losses={losses} className={styles.handscore} />
          <div className={styles.split} style={{ '--a': `${winRate(hand)}%` } as CSSProperties}>
            <span className={styles.splitA} />
            <span className={styles.splitB} />
          </div>
          {/* цвет дублируется подписью — design/README.md «Цвет никогда не единственный носитель смысла» */}
          <p className={styles.legend}>
            <span className={hand.wins > 0 ? styles.win : undefined}>
              {hand.wins} {pluralize(hand.wins, ['победа', 'победы', 'побед'])}
            </span>
            <span className={losses > 0 ? styles.loss : undefined}>
              {losses} {pluralize(losses, ['поражение', 'поражения', 'поражений'])}
            </span>
          </p>
        </>
      )}
    </div>
  )
}

function Score({ wins, losses, className }: { wins: number; losses: number; className: string }) {
  return (
    <p className={className}>
      {wins}
      <span className={styles.dash}>—</span>
      {losses}
    </p>
  )
}

function winRate(hand: HandStats): number {
  return hand.matches === 0 ? 0 : Math.round((hand.wins / hand.matches) * 100)
}
