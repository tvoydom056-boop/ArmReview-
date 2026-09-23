import Link from 'next/link'

import { MatchResult } from '@/components/MatchResult'
import { MatchVersus } from '@/components/MatchVersus'
import type { MatchPanelData } from '@/lib/queries/matches'

import styles from './MatchVotePanel.module.css'
import { RatingReveal } from './RatingReveal'
import { VoteForm } from './VoteForm'

const NOTICES = {
  too_early: 'Голосование откроется после турнира.',
  not_votable: 'За этот матч голосовать нельзя.',
} as const

// Окно матча (design/match.html): противостояние, результат под спойлером, форма оценки,
// чужие оценки под спойлером. Одно и то же на /matches/[id] и в модалке поверх турнира
export function MatchVotePanel({ data }: { data: MatchPanelData }) {
  const { match, event, photos, votingState } = data

  return (
    <div className={styles.panel}>
      <p className={styles.event}>
        <Link href={`/events/${event.slug}`}>{event.title}</Link> · {event.dateLabel}
      </p>
      <MatchVersus match={match} photos={photos} />
      <section>
        <h2 className={styles.label}>Результат</h2>
        <MatchResult outcome={match.outcome} />
      </section>
      <section>
        <h2 className={styles.label}>Оцени матч</h2>
        <div className={styles.card}>
          {votingState === 'open' ? (
            <VoteForm matchId={match.id} />
          ) : (
            <p className={styles.notice}>{NOTICES[votingState]}</p>
          )}
        </div>
      </section>
      <section>
        <h2 className={styles.label}>Как оценили другие</h2>
        <RatingReveal rating={match.rating} />
      </section>
    </div>
  )
}
