import type { MatchOutcome } from '@/lib/matchView'

import styles from './ScoreReveal.module.css'
import { Spoiler } from './Spoiler'

// заглушка под размытием — той же формы, что настоящий результат (см. Spoiler)
const PLACEHOLDER: MatchOutcome = { headline: 'Победа · Результат скрыт', score: '0:0' }

// Счёт и победитель — спойлер: только по нажатию (PROJECT.md § 12)
export function ScoreReveal({ outcome }: { outcome: MatchOutcome }) {
  return (
    <Spoiler variant="compact" action="Показать счёт" placeholder={<Result outcome={PLACEHOLDER} />}>
      <Result outcome={outcome} />
    </Spoiler>
  )
}

function Result({ outcome }: { outcome: MatchOutcome }) {
  return (
    <p className={styles.result}>
      <span>{outcome.headline}</span>
      {outcome.score ? <strong className={styles.score}>{outcome.score}</strong> : null}
    </p>
  )
}
