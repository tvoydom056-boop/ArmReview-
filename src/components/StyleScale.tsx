import type { CSSProperties } from 'react'

import type { StyleProfile } from '@/lib/athleteStats'
import { MIN_MATCHES_FOR_PERCENT } from '@/lib/athleteStats'
import { STYLE_LABELS } from '@/lib/techniques'

import styles from './StyleScale.module.css'

// Шкала инсайд ↔ аутсайд — design/athlete.html. Считается из техник в матчах (п.7 Влада),
// по матчам, а не раундам: так она не выдаёт счёт и стоит без спойлера (vlad-feedback § 2, К2)
export function StyleScale({ profile }: { profile: StyleProfile }) {
  return (
    <div className={`${styles.card} ${profile.enough ? '' : styles.empty}`}>
      <p className={styles.label}>Инсайд ↔ аутсайд</p>
      <div className={styles.track}>
        {/* границы зон — пороги стиля 34 / 66 (lib/techniques.ts) */}
        <span className={`${styles.zone} ${styles.inside}`} style={{ width: '34%' }} />
        <span className={`${styles.zone} ${styles.universal}`} style={{ width: '32%' }} />
        <span className={`${styles.zone} ${styles.outside}`} style={{ width: '34%' }} />
        {/* отсчёт слева: 100% инсайда — у левого края */}
        {profile.enough ? (
          <span className={styles.marker} style={{ '--pos': `${100 - profile.insidePercent}%` } as CSSProperties} />
        ) : null}
      </div>
      <p className={styles.ends}>
        <span>100% инсайд</span>
        <span>{STYLE_LABELS.universal.short}</span>
        <span>100% аутсайд</span>
      </p>
      <p className={styles.value}>
        {profile.enough ? (
          <>
            {profile.insidePercent >= 50
              ? `${profile.insidePercent}% ${STYLE_LABELS.inside.short}`
              : `${100 - profile.insidePercent}% ${STYLE_LABELS.outside.short}`}
            <span className={styles.basis}> · по {profile.matches} матчам</span>
          </>
        ) : (
          <>
            Недостаточно данных о стиле
            <span className={styles.basis}> · нужно от {MIN_MATCHES_FOR_PERCENT} матчей с техникой</span>
          </>
        )}
      </p>
    </div>
  )
}
