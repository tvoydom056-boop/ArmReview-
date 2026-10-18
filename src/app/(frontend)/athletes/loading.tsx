import { SkeletonRegion } from '@/components/Skeleton'
import { AthleteCardSkeleton } from '@/components/Skeletons'

import styles from './athletes.module.css'

// Список борцов грузится — design/states.html § 6.2
export default function Loading() {
  return (
    <SkeletonRegion label="Загружаем борцов">
      <p className={styles.kicker}>База участников</p>
      <h1 className={styles.title}>Рукоборцы</h1>
      <ul className={styles.skeletonGrid}>
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}>
            <AthleteCardSkeleton name={i % 2 ? 64 : 76} meta={i % 3 ? 58 : 52} />
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  )
}
