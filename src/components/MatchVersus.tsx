import Link from 'next/link'

import { getHandLabel, type AthleteRef, type MatchView } from '@/lib/matchView'

import { AthletePhoto } from './AthletePhoto'
import { CountryFlag } from './CountryFlag'
import styles from './MatchVersus.module.css'

type Photo = { url: string; alt: string } | null

// Противостояние на странице матча — design/match.html .versus
export function MatchVersus({
  match,
  photos,
}: {
  match: MatchView
  photos: { athlete1: Photo; athlete2: Photo }
}) {
  return (
    <div className={styles.card}>
      <div className={styles.versus}>
        <Side athlete={match.athlete1} photo={photos.athlete1} />
        <span className={styles.vs}>VS</span>
        <Side athlete={match.athlete2} photo={photos.athlete2} />
      </div>
      <ul className={styles.pills}>
        <li className={styles.pill}>{getHandLabel(match.hand)}</li>
        {match.weightClass ? <li className={styles.pill}>{match.weightClass}</li> : null}
        {match.isTitle ? <li className={styles.pillGold}>Титульный матч</li> : null}
      </ul>
    </div>
  )
}

function Side({ athlete, photo }: { athlete: AthleteRef; photo: Photo }) {
  return (
    <Link href={`/athletes/${athlete.slug}`} className={styles.side}>
      <AthletePhoto photo={photo} name={athlete.name} eager />
      <span className={styles.name}>{athlete.name}</span>
      <span className={styles.meta}>
        <CountryFlag code={athlete.countryCode} />
        {athlete.countryCode}
      </span>
    </Link>
  )
}
