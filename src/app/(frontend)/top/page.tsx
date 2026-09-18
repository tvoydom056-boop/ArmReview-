import type { Metadata } from 'next'

import { MatchCard } from '@/components/MatchCard'
import { getTopMatches } from '@/lib/queries/top'

import styles from './top.module.css'

export const metadata: Metadata = { title: 'Топ-100 матчей' }
export const dynamic = 'force-dynamic'

export default async function TopPage() {
  const top = await getTopMatches(100)

  return (
    <>
      <h1 className={styles.title}>Топ-100 матчей</h1>
      <p className={styles.note}>В топ попадают матчи, у которых уже есть балл (от 5 голосов).</p>
      {top.length === 0 ? (
        <p className={styles.empty}>Пока ни у одного матча нет балла — оцените матчи, чтобы топ появился.</p>
      ) : (
        <ol className={styles.list}>
          {top.map(({ match, eventTitle }) => (
            <li key={match.id} className={styles.item}>
              <MatchCard match={match} href={`/matches/${match.id}`} subtitle={eventTitle} />
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
