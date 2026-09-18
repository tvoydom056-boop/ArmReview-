import Link from 'next/link'

import { AthletePhoto } from './AthletePhoto'
import styles from './AthleteCard.module.css'
import { CountryFlag } from './CountryFlag'

type Props = {
  slug: string
  name: string
  countryCode: string
  photo: { url: string; alt: string } | null
  isFeatured: boolean
  eager?: boolean
}

export function AthleteCard({ slug, name, countryCode, photo, isFeatured, eager }: Props) {
  return (
    <Link href={`/athletes/${slug}`} className={styles.card}>
      <AthletePhoto photo={photo} name={name} eager={eager} />
      <div className={styles.body}>
        <span className={styles.name}>{name}</span>
        <span className={styles.meta}>
          <CountryFlag code={countryCode} />
          {isFeatured ? <span className={styles.badge}>профиль</span> : null}
        </span>
      </div>
    </Link>
  )
}
