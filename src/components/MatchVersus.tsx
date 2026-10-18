import Link from 'next/link'

import { getCountryName } from '@/lib/country'
import { getHandLabel, type MatchSide, type MatchView } from '@/lib/matchView'
import type { Photo } from '@/lib/media'

import { AthletePhoto } from './AthletePhoto'
import { CountryFlag } from './CountryFlag'
import styles from './MatchVersus.module.css'

// Противостояние на странице матча — design/match.html .versus
export function MatchVersus({
  match,
  photos,
}: {
  match: MatchView
  photos: { athlete1: Photo | null; athlete2: Photo | null }
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
        {/* п.17 Влада: название категории, лимит — мелко рядом (в строках списков его нет) */}
        {match.weightClass ? (
          <li className={styles.pill}>
            {match.weightClass.label}
            {match.weightClass.limit ? <span className={styles.limit}>{match.weightClass.limit}</span> : null}
          </li>
        ) : null}
        {match.isTitle ? <li className={styles.pillGold}>Титульный матч</li> : null}
      </ul>
    </div>
  )
}

function Side({ athlete, photo }: { athlete: MatchSide; photo: Photo | null }) {
  const details = [
    athlete.heightCm ? `${athlete.heightCm} см` : null,
    athlete.weightKg ? `${athlete.weightKg} кг` : null,
  ].filter((part): part is string => part !== null)

  return (
    <Link href={`/athletes/${athlete.slug}`} className={styles.side}>
      <AthletePhoto photo={photo} name={athlete.name} eager />
      <span className={styles.name}>{athlete.name}</span>
      <span className={styles.meta}>
        <CountryFlag code={athlete.countryCode} />
        {getCountryName(athlete.countryCode)}
      </span>
      {details.length > 0 ? <span className={styles.details}>{details.join(' · ')}</span> : null}
    </Link>
  )
}
