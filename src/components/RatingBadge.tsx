import { pluralize } from '@/lib/plural'
import { MIN_VOTES_TO_SHOW, type MatchRating } from '@/lib/rating'

import styles from './RatingBadge.module.css'

// Балл или «Мало оценок · будь первым» (PROJECT.md § 5)
export function RatingBadge({ rating }: { rating: MatchRating }) {
  if (rating.score === null) {
    const text =
      rating.votes === 0
        ? 'Мало оценок · будь первым'
        : `Мало оценок (${rating.votes} из ${MIN_VOTES_TO_SHOW})`
    return <span className={styles.few}>{text}</span>
  }

  return (
    <span className={styles.badge}>
      <strong className={styles.score}>
        {rating.score.toLocaleString('ru-RU', { minimumFractionDigits: 1 })}
      </strong>
      <span className={styles.votes}>
        {rating.votes} {pluralize(rating.votes, ['голос', 'голоса', 'голосов'])}
      </span>
    </span>
  )
}
