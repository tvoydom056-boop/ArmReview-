import Link from 'next/link'

import { formatEventDate } from '@/lib/formatDate'
import { pluralize } from '@/lib/plural'

import styles from './EventCard.module.css'

// Карточка прошедшего турнира — design/home.html .evcard. Средний балл турнира не рисуем:
// это агрегат под открытый вопрос 12 и под голосование (design-data-gaps.md § 3)
export function EventCard({
  slug,
  title,
  dateIso,
  location,
  matchCount,
}: {
  slug: string
  title: string
  dateIso: string
  location: string | null
  matchCount: number
}) {
  return (
    <article className={styles.card}>
      <div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>
          {formatEventDate(dateIso)}
          {location ? ` · ${location}` : ''}
          {matchCount > 0 ? ` · ${matchCount} ${pluralize(matchCount, ['матч', 'матча', 'матчей'])}` : ''}
        </p>
      </div>
      <Link href={`/events/${slug}`} className={styles.link}>
        Смотреть карту матчей →
      </Link>
    </article>
  )
}
