import type { MatchOutcome } from '@/lib/matchView'

import styles from './MatchResult.module.css'
import { Spoiler } from './Spoiler'

// заглушка под размытием — той же формы, что настоящий результат (см. Spoiler)
const PLACEHOLDER: MatchOutcome = { headline: 'Победил Имя Фамилия', score: '0:0' }

// Результат на странице матча — design/match.html «Результат». Только по нажатию (PROJECT.md § 12)
export function MatchResult({ outcome }: { outcome: MatchOutcome }) {
  return (
    <div className={styles.card}>
      <Spoiler
        action="Показать результат"
        hint="Не смотрел турнир? Оцени матч, не подглядывая в результат."
        placeholder={<Result outcome={PLACEHOLDER} />}
      >
        <Result outcome={outcome} />
      </Spoiler>
    </div>
  )
}

function Result({ outcome }: { outcome: MatchOutcome }) {
  return (
    <div className={styles.record}>
      {outcome.score ? <p className={styles.recordMain}>{outcome.score}</p> : null}
      <p className={styles.headline}>{outcome.headline}</p>
    </div>
  )
}
