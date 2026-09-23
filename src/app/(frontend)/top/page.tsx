import type { Metadata } from 'next'
import Link from 'next/link'
import type { CSSProperties } from 'react'

import { CountryFlag } from '@/components/CountryFlag'
import { EmptyState } from '@/components/EmptyState'
import { RatingBadge } from '@/components/RatingBadge'
import { SCALES } from '@/features/voting/scales'
import { getHandLabel, type AthleteRef } from '@/lib/matchView'
import { getTopMatches } from '@/lib/queries/top'
import { RATING_WEIGHTS } from '@/lib/rating'

import styles from './top.module.css'

export const metadata: Metadata = { title: 'Топ-100 матчей' }
export const dynamic = 'force-dynamic'

// Оттенки золота для долей шкал в полосе «Из чего складывается балл» (design/top.html)
const SHARE_TONES = ['100%', '72%', '48%', '28%']

// design/top.html без пьедестала топ-3 (вопрос E плана restyle-2026-09 — отдельной задачей)
export default async function TopPage() {
  const top = await getTopMatches(100)

  return (
    <>
      <p className={styles.kicker}>Рейтинг зрителей</p>
      <h1 className={styles.title}>Топ-100 матчей</h1>
      <p className={styles.lead}>
        Балл — взвешенное среднее четырёх зрительских оценок с байесовским сглаживанием: пока голосов
        мало, балл тянется к среднему по сайту, поэтому матч с тремя голосами не обгонит матч с сотней.
        В топ попадают матчи от 5 голосов.
      </p>
      {top.length === 0 ? (
        <EmptyState
          title="Рейтинг ещё собирается"
          hint="Матч попадает в топ, когда его оценили минимум 5 человек. Пока таких нет — помогите набрать первые оценки."
          actions={[{ href: '/', label: 'Выбрать матч', primary: true }]}
        />
      ) : (
        <ol className={styles.list}>
          {top.map(({ match, eventTitle }, i) => (
            <li key={match.id}>
              <Link href={`/matches/${match.id}`} className={styles.row}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.main}>
                  <Fighter athlete={match.athlete1} />
                  <Fighter athlete={match.athlete2} />
                  <span className={styles.sub}>
                    {eventTitle} · {getHandLabel(match.hand)}
                  </span>
                </span>
                <RatingBadge rating={match.rating} compact />
              </Link>
            </li>
          ))}
        </ol>
      )}
      <section className={styles.method}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Из чего складывается балл</h2>
          <div className={styles.stack}>
            {SCALES.map((scale, i) => (
              <span
                key={scale.key}
                style={{ width: `${RATING_WEIGHTS[scale.key] * 100}%`, '--tone': SHARE_TONES[i] } as CSSProperties}
              />
            ))}
          </div>
          <ul className={styles.legend}>
            {SCALES.map((scale, i) => (
              <li key={scale.key}>
                <i className={styles.dot} style={{ '--tone': SHARE_TONES[i] } as CSSProperties} />
                <b>{scale.label}</b> {Math.round(RATING_WEIGHTS[scale.key] * 100)}%
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Почему баллу можно верить</h2>
          <p className={styles.note}>
            Голос привязан к устройству: с одного устройства матч оценивается один раз. Повторная отправка
            перезаписывает прежнюю оценку, а не добавляет новую. Регистрация не нужна, аккаунтов на сайте нет.
          </p>
          <p className={styles.note}>
            Байесовское сглаживание тянет балл к среднему по сайту, пока голосов мало: три восторженные
            пятёрки не выбросят матч на первое место.
          </p>
        </div>
      </section>
    </>
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
