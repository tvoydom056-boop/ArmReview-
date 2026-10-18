import { Skeleton } from './Skeleton'
import styles from './Skeletons.module.css'

// Строка карты матчей — та же геометрия, что у MatchRow (design/states.html § 6.1)
export function MatchRowSkeleton({ names = [62, 40] }: { names?: [number, number] }) {
  return (
    <div className={styles.row}>
      <Skeleton height={46} />
      <span>
        <Skeleton width={`${names[0]}%`} height={13} />
        <Skeleton width={`${names[1]}%`} height={10} mt={7} />
      </span>
      <Skeleton width={46} height={13} />
    </div>
  )
}

// Карточка борца в сетке — круг под фото держит высоту (§ 6.2)
export function AthleteCardSkeleton({ name = 76, meta = 52 }: { name?: number; meta?: number }) {
  return (
    <div className={styles.athlete}>
      <Skeleton width={84} height={84} pill />
      <Skeleton width={`${name}%`} height={15} />
      <Skeleton width={`${meta}%`} height={11} />
    </div>
  )
}

// Блок рекорда на странице борца (§ 6.3)
export function RecordSkeleton() {
  return (
    <div className={styles.record}>
      <Skeleton width={120} height={11} />
      <Skeleton width={150} height={46} mt={12} />
      <Skeleton width="100%" height={2} mt={16} />
      <Skeleton width="82%" height={12} mt={14} />
      <Skeleton width="68%" height={12} mt={8} />
      <Skeleton width="74%" height={12} mt={8} />
    </div>
  )
}
