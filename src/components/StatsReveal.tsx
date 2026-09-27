'use client'

import { useState, type CSSProperties } from 'react'

import type { AthleteStats, HandStats, Tally, TechniqueLine, TechniqueStats } from '@/lib/athleteStats'
import { MIN_MATCHES_FOR_PERCENT, RECENT_MATCHES } from '@/lib/athleteStats'
import { pluralize } from '@/lib/plural'
import { getTechniqueLabel } from '@/lib/techniques'

import { Spoiler } from './Spoiler'
import styles from './StatsReveal.module.css'

// заглушка под размытием — той же формы, что настоящая статистика (см. Spoiler)
const tally = (won: number, lost: number, percent: number): Tally => ({ won, lost, percent })
const hand = (w: number, l: number): HandStats => ({ matches: tally(w, l, 60), rounds: tally(w * 3, l * 3, 60) })
const lines = (a: number, b: number): TechniqueLine[] => [
  { technique: 'hook', count: a, percent: 60 },
  { technique: 'top_roll', count: b, percent: 40 },
]
const PLACEHOLDER: AthleteStats = {
  total: hand(5, 3),
  right: hand(3, 2),
  left: hand(2, 1),
  techniques: { matches: 8, fought: lines(12, 8), won: lines(9, 6), lost: lines(3, 2) },
}

type Props = {
  stats: AthleteStats
  // последние RECENT_MATCHES матчей; null — матчей не больше, вкладка не нужна (п.18 Влада)
  recent: AthleteStats | null
  // техники — только в подробном профиле (PROJECT.md § 5)
  showTechniques: boolean
}

// Результаты — спойлер: показываем только по нажатию (PROJECT.md § 12)
export function StatsReveal({ stats, recent, showTechniques }: Props) {
  return (
    <section className={styles.root}>
      <h2 className={styles.title}>Статистика</h2>
      <Spoiler
        variant="tall"
        action="Показать статистику"
        hint="Рекорд, раунды и техники скрыты."
        placeholder={<StatsBody stats={PLACEHOLDER} showTechniques={showTechniques} />}
      >
        <StatsTabs stats={stats} recent={recent} showTechniques={showTechniques} />
      </Spoiler>
    </section>
  )
}

function StatsTabs({ stats, recent, showTechniques }: Props) {
  const [tab, setTab] = useState<'recent' | 'all'>('recent')
  if (!recent) return <StatsBody stats={stats} showTechniques={showTechniques} />

  return (
    <>
      <div className={styles.tabs} role="group" aria-label="Период статистики">
        <button type="button" className={styles.chip} aria-pressed={tab === 'recent'} onClick={() => setTab('recent')}>
          Последние {RECENT_MATCHES}
        </button>
        <button type="button" className={styles.chip} aria-pressed={tab === 'all'} onClick={() => setTab('all')}>
          Все матчи
        </button>
      </div>
      <StatsBody stats={tab === 'recent' ? recent : stats} showTechniques={showTechniques} />
    </>
  )
}

function StatsBody({ stats, showTechniques }: { stats: AthleteStats; showTechniques: boolean }) {
  const { matches, rounds } = stats.total

  return (
    <>
      <div className={styles.card}>
        <p className={styles.label}>Рекорд</p>
        <div className={styles.record}>
          <Score tally={matches} className={styles.recordMain} />
          {matches.percent !== null ? <span className={styles.winPill}>{matches.percent}% побед</span> : null}
          {rounds.won + rounds.lost > 0 ? (
            <p className={styles.subline}>
              <Score tally={rounds} className={styles.recordSub} />
              <span className={styles.label}>по раундам</span>
              {rounds.percent !== null ? <span className={styles.subPercent}>{rounds.percent}%</span> : null}
            </p>
          ) : null}
        </div>
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Рекорд по рукам</p>
        <div className={styles.hands}>
          <HandRecord label="Правая" hand={stats.right} />
          <HandRecord label="Левая" hand={stats.left} />
        </div>
      </div>
      {showTechniques ? <Techniques stats={stats.techniques} /> : null}
      {/* TODO(вопрос 7): считаем только внесённые матчи, не всю карьеру */}
      <p className={styles.note}>
        По внесённым матчам{matches.percent === null ? `. Проценты — от ${MIN_MATCHES_FOR_PERCENT} матчей` : ''}
      </p>
    </>
  )
}

function HandRecord({ label, hand }: { label: string; hand: HandStats }) {
  const { won, lost, percent } = hand.matches

  return (
    <div>
      <p className={styles.label}>{label}</p>
      {won + lost === 0 ? (
        <>
          <p className={styles.handscore}>—</p>
          <div className={`${styles.split} ${styles.splitEmpty}`} />
          <p className={styles.legend}>нет данных</p>
        </>
      ) : (
        <>
          <p className={styles.handline}>
            <Score tally={hand.matches} className={styles.handscore} />
            {/* п.13 Влада: мельче общего, чтобы не перебивать его */}
            {percent !== null ? <span className={styles.handPercent}>{percent}% побед</span> : null}
          </p>
          <div className={styles.split} style={{ '--a': `${(won / (won + lost)) * 100}%` } as CSSProperties}>
            <span className={styles.splitA} />
            <span className={styles.splitB} />
          </div>
          {/* цвет дублируется подписью — design/README.md «Цвет никогда не единственный носитель смысла» */}
          <p className={styles.legend}>
            <span className={won > 0 ? styles.win : undefined}>
              {won} {pluralize(won, ['победа', 'победы', 'побед'])}
            </span>
            <span className={lost > 0 ? styles.loss : undefined}>
              {lost} {pluralize(lost, ['поражение', 'поражения', 'поражений'])}
            </span>
          </p>
        </>
      )}
    </div>
  )
}

// п.14 Влада: сначала — в каких техниках борец провёл раунды, потом — какими выигрывал и проигрывал.
// Хронометража нет: раунд относится к технике борца в матче (vlad-feedback-2026-09-27.md, вопрос 51)
function Techniques({ stats }: { stats: TechniqueStats }) {
  if (stats.matches < MIN_MATCHES_FOR_PERCENT) {
    return (
      <div className={`${styles.card} ${styles.empty}`}>
        <p className={styles.label}>Пораундовая статистика</p>
        <p className={styles.emptyText}>Недостаточно данных о технике — нужно от {MIN_MATCHES_FOR_PERCENT} матчей</p>
      </div>
    )
  }

  return (
    <>
      <div className={styles.card}>
        <p className={styles.label}>Пораундовая статистика</p>
        <Lines lines={stats.fought} tone="neutral" />
      </div>
      <div className={styles.card}>
        <p className={styles.label}>Пораундовая статистика по пинам</p>
        <div className={styles.hands}>
          <div>
            <p className={styles.label}>Победы</p>
            <Lines lines={stats.won} tone="win" />
          </div>
          <div>
            <p className={styles.label}>Поражения</p>
            <Lines lines={stats.lost} tone="loss" />
          </div>
        </div>
        <p className={styles.note}>Раунд считается в технике, которой борец боролся в матче</p>
      </div>
    </>
  )
}

function Lines({ lines, tone }: { lines: TechniqueLine[]; tone: 'neutral' | 'win' | 'loss' }) {
  if (lines.length === 0) return <p className={styles.emptyText}>0 раундов</p>

  return (
    <ul className={styles.lines}>
      {lines.map((l) => (
        <li key={l.technique ?? 'none'} className={styles.line}>
          <b className={styles.lineCount}>{l.count}</b>
          <span className={styles.lineName}>{l.technique ? getTechniqueLabel(l.technique) : 'Техника не указана'}</span>
          <span className={styles.linePercent}>{l.percent}%</span>
          <span className={styles.lineBar}>
            <i className={styles[tone]} style={{ '--v': `${l.percent}%` } as CSSProperties} />
          </span>
        </li>
      ))}
    </ul>
  )
}

function Score({ tally, className }: { tally: Tally; className: string }) {
  return (
    <span className={className}>
      {tally.won}
      <span className={styles.dash}>—</span>
      {tally.lost}
    </span>
  )
}
