import Link from 'next/link'

import { getHandLabel, type AthleteRef, type MatchOutcome, type MatchView } from '@/lib/matchView'

import { CountryFlag } from './CountryFlag'
import styles from './MatchRow.module.css'
import { RatingBadge } from './RatingBadge'
import { Spoiler } from './Spoiler'

// заглушка под размытием — той же формы, что настоящий результат (см. Spoiler)
const PLACEHOLDER: MatchOutcome = { headline: 'Победа скрыта', score: '0:0' }

// Строка карты матчей — design/event.html .matchrow. Балл открыт (он не выдаёт победителя),
// счёт — под своим спойлером в каждой строке, чтобы карту можно было пролистать без спойлеров
export function MatchRow({ match, cardNo }: { match: MatchView; cardNo: number }) {
  return (
    <article className={styles.row}>
      <div className={styles.cardNo}>
        <b>{cardNo}</b>
        <span>Карта</span>
      </div>
      <div className={styles.main}>
        <Link href={`/matches/${match.id}`} className={styles.fighters}>
          <Fighter athlete={match.athlete1} />
          <span className={styles.vs}>vs</span>
          <Fighter athlete={match.athlete2} />
        </Link>
        <div className={styles.tags}>
          <span className={styles.sub}>
            {match.weightClass ? `${match.weightClass} · ` : ''}
            {getHandLabel(match.hand)}
          </span>
          {match.isTitle ? <span className={styles.titleTag}>Титульный</span> : null}
        </div>
      </div>
      <div className={styles.result}>
        <RatingBadge rating={match.rating} compact />
        <div className={styles.spoiler}>
          <Spoiler variant="compact" action="Счёт" placeholder={<Outcome outcome={PLACEHOLDER} />}>
            <Outcome outcome={match.outcome} />
          </Spoiler>
        </div>
      </div>
    </article>
  )
}

// флаг и имя — один блок, чтобы при переносе флаг не отрывался от имени
function Fighter({ athlete }: { athlete: AthleteRef }) {
  return (
    <span className={styles.fighter}>
      <CountryFlag code={athlete.countryCode} />
      {athlete.name}
    </span>
  )
}

function Outcome({ outcome }: { outcome: MatchOutcome }) {
  return (
    <div className={styles.outcome}>
      {outcome.score ? <b className={styles.score}>{outcome.score}</b> : null}
      <span className={styles.who}>{outcome.headline}</span>
    </div>
  )
}
