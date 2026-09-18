import Link from 'next/link'

import { getHandLabel, type AthleteRef, type MatchView } from '@/lib/matchView'

import { CountryFlag } from './CountryFlag'
import styles from './MatchCard.module.css'
import { RatingBadge } from './RatingBadge'
import { ScoreReveal } from './ScoreReveal'

// href — ссылка на окно матча с голосованием; внутри самого окна её нет.
// subtitle — контекст, если карточка вне страницы турнира (например, в топе)
export function MatchCard({ match, href, subtitle }: { match: MatchView; href?: string; subtitle?: string }) {
  return (
    <article className={styles.card}>
      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      <div className={styles.versus}>
        <Side athlete={match.athlete1} />
        <span className={styles.vs}>vs</span>
        <Side athlete={match.athlete2} />
      </div>
      <ul className={styles.tags}>
        {match.isTitle ? <li className={`${styles.tag} ${styles.title}`}>Титульный</li> : null}
        <li className={styles.tag}>{getHandLabel(match.hand)}</li>
        {match.weightClass ? <li className={styles.tag}>{match.weightClass}</li> : null}
      </ul>
      <div className={styles.footer}>
        <RatingBadge rating={match.rating} />
        {href ? (
          <Link href={href} className={styles.rate}>
            Оценить матч
          </Link>
        ) : null}
      </div>
      <ScoreReveal outcome={match.outcome} />
    </article>
  )
}

function Side({ athlete }: { athlete: AthleteRef }) {
  return (
    <Link href={`/athletes/${athlete.slug}`} className={styles.side}>
      <CountryFlag code={athlete.countryCode} />
      <span>{athlete.name}</span>
    </Link>
  )
}
