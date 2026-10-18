import Link from 'next/link'

import { EmptyState } from '@/components/EmptyState'
import { EventCard } from '@/components/EventCard'
import { HomeMatchRow } from '@/components/HomeMatchRow'
import { RatingBadge } from '@/components/RatingBadge'
import { Spoiler } from '@/components/Spoiler'
import { UpcomingEvent } from '@/components/UpcomingEvent'
import { toEventHeader } from '@/lib/eventView'
import { pluralize } from '@/lib/plural'
import { getEventMatches, getEventsWithMatchCount } from '@/lib/queries/events'
import { getTopMatches } from '@/lib/queries/top'
import { VOTING_ENABLED } from '@/lib/siteConfig'
import { isVotingOpen } from '@/lib/votingWindow'

import styles from './page.module.css'

export const dynamic = 'force-dynamic'

const RECENT_EVENTS = 4
const VOTE_ROWS = 4
const TOP_ROWS = 3

// Главная — design/home.html. Блоки голосования и топа — только при VOTING_ENABLED (alpha-scope.md § 1).
// «Средний балл турнира» не рисуем: агрегата нет (design-data-gaps.md § 3)
export default async function HomePage() {
  const all = await getEventsWithMatchCount()
  if (all.length === 0) {
    return <EmptyState title="Турниров пока нет" hint="Первый турнир появится здесь, как только мы внесём его карту матчей." />
  }

  // турнир «прошёл» с той же границы, с которой открывается голосование (lib/votingWindow.ts)
  const now = new Date()
  const upcomingList = all.filter(({ event }) => !isVotingOpen(event.date, now))
  const upcoming = upcomingList[upcomingList.length - 1] ?? null // список по убыванию даты — ближайший последний
  const past = all.filter(({ event }) => isVotingOpen(event.date, now))
  const recent = past.slice(0, RECENT_EVENTS)

  // голосование: матчи последнего прошедшего турнира по числу оценок и топ-3
  const latest = past[0]?.event
  const latestMatches = VOTING_ENABLED && latest ? await getEventMatches(latest.id) : []
  const cardNos = new Map(latestMatches.map((m, i) => [m.id, i + 1])) // номер в карте — до сортировки по оценкам
  const rated = [...latestMatches].sort((a, b) => b.rating.votes - a.rating.votes).slice(0, VOTE_ROWS)
  const top = VOTING_ENABLED ? await getTopMatches(TOP_ROWS) : []

  return (
    <>
      <section>
        <h1>Турниры</h1>
        <p className={styles.lead}>
          {VOTING_ENABLED
            ? 'Фанатский архив турниров East vs West: карта матчей, оценки зрителей по четырём шкалам — зрелищность, интрига, техника, судейство — и балл каждого матча. Оценивать можно без регистрации.'
            : 'Фанатский архив турниров East vs West: карта матчей и профили рукоборцев.'}
        </p>
        <p className={styles.note}>
          {VOTING_ENABLED
            ? 'Счёт, победитель и баллы скрыты: открываются только по кнопке.'
            : 'Счёт и победитель скрыты: открываются только по кнопке.'}
        </p>
      </section>

      {upcoming ? (
        <section className={styles.section}>
          <h2 className={styles.label}>Ближайший турнир</h2>
          <UpcomingEvent
            event={toEventHeader(upcoming.event)}
            slug={upcoming.event.slug}
            matchCount={upcoming.matchCount}
          />
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.label}>Последние турниры</h2>
          <ul className={styles.grid}>
            {recent.map(({ event, matchCount }) => (
              <li key={event.id}>
                <EventCard
                  slug={event.slug}
                  title={event.title}
                  dateIso={event.date}
                  location={event.location ?? null}
                  matchCount={matchCount}
                />
              </li>
            ))}
          </ul>
          {past.length > recent.length ? (
            <Link href="/events" className={styles.more}>
              Все турниры →
            </Link>
          ) : null}
        </section>
      ) : null}

      {rated.length > 0 && latest ? (
        <section className={styles.section}>
          <h2 className={styles.label}>Матчи, которые сейчас оценивают</h2>
          <ul className={styles.rows}>
            {rated.map((match) => (
              <li key={match.id}>
                <HomeMatchRow
                  match={match}
                  eventTitle={latest.title}
                  lead={
                    <>
                      <b>{cardNos.get(match.id)}</b>
                      <span>матч</span>
                    </>
                  }
                  aside={
                    <>
                      <span>
                        {match.rating.votes} {pluralize(match.rating.votes, ['оценка', 'оценки', 'оценок'])}
                      </span>
                      <Link href={`/matches/${match.id}`} className={styles.action}>
                        Оценить
                      </Link>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {top.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.label}>Лучшие матчи</h2>
          <ol className={styles.rows}>
            {top.map(({ match, eventTitle }, i) => (
              <li key={match.id}>
                <HomeMatchRow
                  match={match}
                  eventTitle={eventTitle}
                  lead={<b>{i + 1}</b>}
                  aside={
                    <Spoiler
                      variant="compact"
                      action="Показать балл"
                      placeholder={<RatingBadge rating={{ votes: match.rating.votes, score: 0 }} />}
                    >
                      <RatingBadge rating={match.rating} />
                    </Spoiler>
                  }
                />
              </li>
            ))}
          </ol>
          <Link href="/top" className={styles.more}>
            Весь топ-100 →
          </Link>
        </section>
      ) : null}
    </>
  )
}
