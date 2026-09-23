import Link from 'next/link'

import { AthletePhoto } from './AthletePhoto'
import styles from './AthleteCard.module.css'
import { CountryFlag } from './CountryFlag'

type Props = {
  slug: string
  name: string
  countryCode: string
  weightKg: number | null
  photo: { url: string; alt: string } | null
  isFeatured: boolean
  eager?: boolean
}

// Карточка в списке — design/athletes.html .athletecard (бейдж стиля — после athlete-stats-data-model)
export function AthleteCard({ slug, name, countryCode, weightKg, photo, isFeatured, eager }: Props) {
  return (
    <Link href={`/athletes/${slug}`} className={styles.card}>
      <AthletePhoto photo={photo} name={name} eager={eager} />
      <span className={styles.name}>{name}</span>
      <span className={styles.meta}>
        <CountryFlag code={countryCode} />
        {weightKg ? <span>{weightKg} кг</span> : null}
      </span>
      {isFeatured ? <span className={styles.badge}>Подробный профиль</span> : null}
    </Link>
  )
}
