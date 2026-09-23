import type { CSSProperties } from 'react'

import { Spoiler } from '@/components/Spoiler'
import { pluralize } from '@/lib/plural'
import { MIN_VOTES_TO_SHOW, RATING_WEIGHTS, type MatchRating } from '@/lib/rating'

import styles from './RatingReveal.module.css'
import { SCALES } from './scales'

// заглушка под размытием — той же формы, что настоящие оценки (см. Spoiler)
const PLACEHOLDER: MatchRating = {
  votes: 12,
  score: 4,
  scales: { spectacle: 4, intrigue: 4, technique: 4, refereeing: 4 },
}

// «Как оценили другие» — под спойлером, чтобы чужой балл не влиял на свою оценку
// (design/match.html, вопрос I плана restyle-2026-09). В списках балл открыт — он не выдаёт победителя.
export function RatingReveal({ rating }: { rating: MatchRating }) {
  return (
    <div className={styles.card}>
      <Spoiler
        action="Показать оценки"
        hint="Сначала поставь свою оценку — потом смотри, что думают остальные."
        placeholder={<Breakdown rating={PLACEHOLDER} />}
      >
        <Breakdown rating={rating} />
      </Spoiler>
    </div>
  )
}

function Breakdown({ rating }: { rating: MatchRating }) {
  const votes = `${rating.votes} ${pluralize(rating.votes, ['голос', 'голоса', 'голосов'])}`

  return (
    <>
      <div className={styles.record}>
        <p className={styles.score}>{rating.score === null ? '—' : formatNumber(rating.score)}</p>
        <div>
          <span className={styles.caption}>Средний балл матча</span>
          <p className={styles.sub}>
            {rating.score === null ? `Мало оценок: ${rating.votes} из ${MIN_VOTES_TO_SHOW}` : `${votes} · из 5,0`}
          </p>
        </div>
      </div>
      {/* по шкалам — тоже от 5 голосов, как и сам балл (PROJECT.md § 6) */}
      {rating.score !== null && rating.scales
        ? SCALES.map((scale) => {
            const value = rating.scales?.[scale.key] ?? 0
            return (
              <div key={scale.key} className={styles.statline}>
                <b className={styles.value}>{formatNumber(value)}</b>
                <span className={styles.caption}>{scale.label}</span>
                <span className={styles.weight}>вес {formatNumber(RATING_WEIGHTS[scale.key], 2)}</span>
                <span className={styles.bar}>
                  <i style={{ '--v': `${(value / 5) * 100}%` } as CSSProperties} />
                </span>
              </div>
            )
          })
        : null}
      <p className={styles.note}>Балл считается с байесовским сглаживанием и показывается от 5 голосов.</p>
    </>
  )
}

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
