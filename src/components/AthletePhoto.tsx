import Image from 'next/image'

import styles from './AthletePhoto.module.css'

type Props = {
  photo: { url: string; alt: string } | null
  name: string
  size?: 'card' | 'profile'
  // фото в первом экране грузим сразу (LCP), остальные — лениво
  eager?: boolean
}

export function AthletePhoto({ photo, name, size = 'card', eager = size === 'profile' }: Props) {
  return (
    <div className={`${styles.frame} ${styles[size]}`}>
      {photo ? (
        <Image
          src={photo.url}
          alt={photo.alt || name}
          fill
          sizes="240px"
          className={styles.img}
          loading={eager ? 'eager' : undefined}
          unoptimized
        />
      ) : (
        // TODO(вопрос 8): до ответа промоушена — заглушка вместо фото
        <span className={styles.placeholder} aria-label="Фото пока нет">
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}
