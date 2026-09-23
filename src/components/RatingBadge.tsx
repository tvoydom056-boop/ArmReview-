import { pluralize } from '@/lib/plural'
import { MIN_VOTES_TO_SHOW, type MatchRating } from '@/lib/rating'

import styles from './RatingBadge.module.css'

// Балл или «Мало оценок · будь первым» (PROJECT.md § 5).
// compact — строка карты матчей (design/event.html): балл над числом голосов, до 5 голосов — прочерк
export function RatingBadge({ rating, compact = false }: { rating: MatchRating; compact?: boolean }) {
  const votes = `${rating.votes} ${pluralize(rating.votes, ['голос', 'голоса', 'голосов'])}`

  if (compact) {
    return (
      <span className={styles.compact}>
        <strong className={styles.score}>{rating.score === null ? '—' : formatScore(rating.score)}</strong>
        <span className={styles.votes}>{votes}</span>
      </span>
    )
  }

  if (rating.score === null) {
    const text =
      rating.votes === 0
        ? 'Мало оценок · будь первым'
        : `Мало оценок (${rating.votes} из ${MIN_VOTES_TO_SHOW})`
    return <span className={styles.few}>{text}</span>
  }

  return (
    <span className={styles.badge}>
      <strong className={styles.score}>{formatScore(rating.score)}</strong>
      <span className={styles.votes}>{votes}</span>
    </span>
  )
}

function formatScore(score: number): string {
  return score.toLocaleString('ru-RU', { minimumFractionDigits: 1 })
}
