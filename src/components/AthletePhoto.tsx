import Image from 'next/image'

import styles from './AthletePhoto.module.css'

type Props = {
  photo: { url: string; alt: string } | null
  name: string
  size?: 'card' | 'profile'
  // фото в первом экране грузим сразу (LCP), остальные — лениво
  eager?: boolean
}

// Круглое фото — во всех макетах design/ (.avatar, .athletecard__photo), вопрос B плана restyle-2026-09
export function AthletePhoto({ photo, name, size = 'card', eager = size === 'profile' }: Props) {
  return (
    <div className={`${styles.frame} ${styles[size]}`}>
      {photo ? (
        <Image
          src={photo.url}
          alt={photo.alt || name}
          fill
          sizes="150px"
          className={styles.img}
          loading={eager ? 'eager' : undefined}
          unoptimized
        />
      ) : (
        // TODO(вопрос 8): до ответа промоушена — заглушка вместо фото
        <span className={styles.placeholder} aria-label="Фото пока нет">
          {getInitials(name)}
        </span>
      )}
    </div>
  )
}

// «Леван Сагинашвили» → «ЛС»
function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}
