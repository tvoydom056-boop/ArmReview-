import { SkeletonRegion } from '@/components/Skeleton'
import { MatchRowSkeleton } from '@/components/Skeletons'

import styles from './event.module.css'

// Карта матчей турнира грузится — design/states.html § 6.1
export default function Loading() {
  return (
    <SkeletonRegion label="Загружаем карту матчей">
      <span className={styles.back}>← Все ивенты</span>
      <div className={styles.skeletonList}>
        {[
          [62, 40],
          [48, 55],
          [70, 36],
          [54, 48],
        ].map(([name, meta]) => (
          <MatchRowSkeleton key={`${name}-${meta}`} names={[name, meta]} />
        ))}
      </div>
    </SkeletonRegion>
  )
}
