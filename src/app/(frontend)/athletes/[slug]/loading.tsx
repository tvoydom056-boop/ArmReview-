import { Skeleton, SkeletonRegion } from '@/components/Skeleton'
import { RecordSkeleton } from '@/components/Skeletons'

import styles from './profile.module.css'

// Профиль борца грузится: шапка и блок рекорда — design/states.html § 6.3
export default function Loading() {
  return (
    <SkeletonRegion label="Загружаем профиль борца">
      <span className={styles.back}>← Все борцы</span>
      <section className={styles.head}>
        <Skeleton width={120} height={120} pill />
        <Skeleton width={220} height={28} />
        <Skeleton width={150} height={12} />
      </section>
      <div className={styles.skeletonRecord}>
        <RecordSkeleton />
      </div>
    </SkeletonRegion>
  )
}
