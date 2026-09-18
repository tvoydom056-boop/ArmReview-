import Link from 'next/link'

import { MatchCard } from '@/components/MatchCard'
import type { MatchPanelData } from '@/lib/queries/matches'

import styles from './MatchVotePanel.module.css'
import { VoteForm } from './VoteForm'

const NOTICES = {
  too_early: 'Голосование откроется после турнира.',
  not_votable: 'За этот матч голосовать нельзя.',
} as const

// Окно матча: подробности + 4 шкалы. Одно и то же на /matches/[id] и в модалке поверх турнира
export function MatchVotePanel({ data }: { data: MatchPanelData }) {
  const { match, event, votingState } = data

  return (
    <div className={styles.panel}>
      <p className={styles.event}>
        <Link href={`/events/${event.slug}`}>{event.title}</Link> · {event.dateLabel}
      </p>
      <MatchCard match={match} />
      {votingState === 'open' ? (
        <VoteForm matchId={match.id} />
      ) : (
        <p className={styles.notice}>{NOTICES[votingState]}</p>
      )}
    </div>
  )
}
