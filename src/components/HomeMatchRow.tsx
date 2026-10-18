import Link from 'next/link'
import type { ReactNode } from 'react'

import { getHandLabel, type AthleteRef, type MatchView } from '@/lib/matchView'

import { CountryFlag } from './CountryFlag'
import styles from './HomeMatchRow.module.css'

// Строка матча на главной — design/home.html .matchrow--vote / .toprow: имена в два столбика,
// слева номер или место (lead), справа действие или балл (aside)
export function HomeMatchRow({
  match,
  eventTitle,
  lead,
  aside,
}: {
  match: MatchView
  eventTitle: string
  lead: ReactNode
  aside: ReactNode
}) {
  const sub = [
    eventTitle,
    getHandLabel(match.hand).toLowerCase(),
    match.weightClass?.label,
    match.isTitle ? 'титульный' : null,
  ].filter(Boolean)

  return (
    <article className={styles.row}>
      <div className={styles.lead}>{lead}</div>
      <div className={styles.main}>
        <Link href={`/matches/${match.id}`} className={styles.fighters}>
          <Fighter athlete={match.athlete1} />
          <Fighter athlete={match.athlete2} />
        </Link>
        <p className={styles.sub}>{sub.join(' · ')}</p>
      </div>
      <div className={styles.aside}>{aside}</div>
    </article>
  )
}

function Fighter({ athlete }: { athlete: AthleteRef }) {
  return (
    <span className={styles.fighter}>
      <CountryFlag code={athlete.countryCode} />
      {athlete.name}
    </span>
  )
}
