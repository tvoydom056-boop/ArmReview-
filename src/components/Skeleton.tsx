import styles from './Skeleton.module.css'

type Props = {
  width?: string | number
  height: string | number
  pill?: boolean
  mt?: number
}

// Плашка загрузки — design/states.html § 6 .sk. Декоративная: скрыта от скринридеров,
// «идёт загрузка» объявляет обёртка (SkeletonRegion)
export function Skeleton({ width, height, pill, mt }: Props) {
  return (
    <span
      aria-hidden="true"
      className={pill ? `${styles.sk} ${styles.pill}` : styles.sk}
      style={{ width, height, marginTop: mt }}
    />
  )
}

// Обёртка loading.tsx: одно объявление для скринридера вместо россыпи пустых плашек
export function SkeletonRegion({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      {children}
    </div>
  )
}
