'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { RATING_WEIGHTS, type ScaleKey, type ScaleValues } from '@/lib/rating'

import { SCALES } from './scales'
import { useVoteMutation } from './useVoteMutation'
import styles from './VoteForm.module.css'

type Draft = Partial<Record<ScaleKey, number>>

function toScores(draft: Draft): ScaleValues | null {
  const { spectacle, intrigue, technique, refereeing } = draft
  if (spectacle === undefined || intrigue === undefined) return null
  if (technique === undefined || refereeing === undefined) return null
  return { spectacle, intrigue, technique, refereeing }
}

export function VoteForm({ matchId }: { matchId: number }) {
  const router = useRouter()
  const mutation = useVoteMutation()
  const [draft, setDraft] = useState<Draft>({})
  const [website, setWebsite] = useState('') // honeypot: человек его не видит и не заполняет
  const [openedAt] = useState(() => Date.now()) // для проверки «не быстрее 3 секунд»

  const scores = toScores(draft)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!scores) return
    mutation.mutate(
      { matchId: String(matchId), ...scores, website, openedAt },
      { onSuccess: () => router.refresh() },
    )
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {SCALES.map((scale) => (
        <fieldset key={scale.key} className={styles.scale}>
          <legend className={styles.legend}>
            {scale.label}{' '}
            <span className={styles.weight}>
              · вес {RATING_WEIGHTS[scale.key].toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
            </span>
          </legend>
          <p className={styles.hint}>{scale.hint}</p>
          <div className={styles.options}>
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className={styles.option}>
                <input
                  type="radio"
                  name={scale.key}
                  value={value}
                  checked={draft[scale.key] === value}
                  onChange={() => setDraft((prev) => ({ ...prev, [scale.key]: value }))}
                  className={styles.radio}
                />
                <span className={styles.pill}>{value}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className={styles.honeypot}
      />

      <button type="submit" className={styles.submit} disabled={!scores || mutation.isPending}>
        {mutation.isPending ? 'Отправляем…' : 'Отправить оценку'}
      </button>
      {mutation.isSuccess ? (
        <p className={styles.success}>Спасибо! Оценка сохранена. Отправите ещё раз — она заменится.</p>
      ) : null}
      {mutation.isError ? <p className={styles.error}>{mutation.error.message}</p> : null}
    </form>
  )
}
