import Link from 'next/link'

import { getCountryName } from '@/lib/country'
import type { Photo } from '@/lib/media'
import { STYLE_LABELS, type WrestlingStyle } from '@/lib/techniques'

import { AthletePhoto } from './AthletePhoto'
import styles from './AthleteCard.module.css'
import { CountryFlag } from './CountryFlag'

type Props = {
  slug: string
  name: string
  countryCode: string
  weightKg: number | null
  photo: Photo | null
  isFeatured: boolean
  style?: WrestlingStyle | null
  eager?: boolean
}

const STYLE_CLASS: Record<WrestlingStyle, string> = {
  inside: styles.styleInside,
  outside: styles.styleOutside,
  universal: styles.styleUniversal,
}

// Карточка в списке — design/athletes.html .athletecard. Стиль — обводкой фото и подписью: цвет не единственный носитель смысла
export function AthleteCard({ slug, name, countryCode, weightKg, photo, isFeatured, style, eager }: Props) {
  return (
    <Link href={`/athletes/${slug}`} className={styles.card}>
      <AthletePhoto photo={photo} name={name} eager={eager} ring={style ?? undefined} />
      <span className={styles.name}>{name}</span>
      <span className={styles.meta}>
        <CountryFlag code={countryCode} />
        <span>
          {getCountryName(countryCode)}
          {weightKg ? ` · ${weightKg} кг` : ''}
        </span>
      </span>
      {style ? <span className={`${styles.style} ${STYLE_CLASS[style]}`}>{STYLE_LABELS[style].short}</span> : null}
      {isFeatured ? <span className={styles.badge}>Подробный профиль</span> : null}
    </Link>
  )
}
