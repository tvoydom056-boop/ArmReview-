import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AthleteMatches } from '@/components/AthleteMatches'
import { AthletePhoto } from '@/components/AthletePhoto'
import { CountryFlag } from '@/components/CountryFlag'
import { StatsReveal } from '@/components/StatsReveal'
import { StyleScale } from '@/components/StyleScale'
import { computeAthleteStats, computeStyleProfile, pickRecentMatches } from '@/lib/athleteStats'
import { getCurrentWeightClass, toHistoryRow, type HistoryRow } from '@/lib/athleteView'
import { getPhoto } from '@/lib/media'
import { getAthleteBySlug, getAthleteMatches, getOpponentIds, getWinRates } from '@/lib/queries/athletes'
import {
  STYLE_LABELS,
  getTechniqueLabel,
  getTechniqueStyle,
  isTechnique,
  type WrestlingStyle,
} from '@/lib/techniques'

import styles from './profile.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

// Стиль борца — лёгкой подсветкой шапки и обводкой бейджа, не заливкой (design/README.md)
const HEAD_TINT: Record<WrestlingStyle, string> = {
  inside: styles.headInside,
  outside: styles.headOutside,
  universal: styles.headUniversal,
}
const BADGE: Record<WrestlingStyle, string> = {
  inside: styles.badgeInside,
  outside: styles.badgeOutside,
  universal: styles.badgeUniversal,
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const athlete = await getAthleteBySlug((await params).slug)
  return { title: athlete?.name ?? 'Борец не найден' }
}

export default async function AthleteProfilePage({ params }: Props) {
  const athlete = await getAthleteBySlug((await params).slug)
  if (!athlete) notFound()

  // Базовый профиль (рекорд и история) — у всех, подробный — у известных (PROJECT.md § 5, п.11 Влада)
  const featured = Boolean(athlete.isFeatured)
  const matches = await getAthleteMatches(athlete.id)
  const winRates = await getWinRates(getOpponentIds(athlete.id, matches))
  const recent = pickRecentMatches(matches)
  const stats = computeAthleteStats(athlete.id, matches)
  const history = matches
    .map((m) => toHistoryRow(athlete.id, m, winRates))
    .filter((row): row is HistoryRow => row !== null)

  const styleProfile = computeStyleProfile(athlete.id, matches)
  const style = featured && styleProfile.enough ? styleProfile.style : undefined
  const technique = featured && isTechnique(athlete.mainTechnique) ? athlete.mainTechnique : null
  const weightClass = getCurrentWeightClass(matches)

  // п.6 Влада: второстепенное — в поп-ап у имени, чтобы не отвлекать от статистики
  const facts = [
    athlete.birthYear ? ['Год рождения', String(athlete.birthYear)] : null,
    athlete.heightCm ? ['Рост', `${athlete.heightCm} см`] : null,
    athlete.weightKg ? ['Актуальный вес', `${athlete.weightKg} кг`] : null,
  ].filter((f): f is string[] => f !== null)

  const photo = getPhoto(athlete.photo)

  return (
    <>
      <Link href="/athletes" className={styles.back}>
        ← Все рукоборцы
      </Link>
      <section className={`${styles.head} ${style ? HEAD_TINT[style] : ''}`}>
        <AthletePhoto photo={photo} name={athlete.name} size="profile" ring={style} />
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{athlete.name}</h1>
            {featured && facts.length > 0 ? (
              <>
                <button type="button" popoverTarget="athlete-facts" className={styles.factsButton} aria-label="Данные борца">
                  i
                </button>
                <div id="athlete-facts" popover="auto" className={styles.facts}>
                  <p className={styles.factsTitle}>{athlete.name}</p>
                  <dl className={styles.factsList}>
                    {facts.map(([label, value]) => (
                      <div key={label} className={styles.fact}>
                        <dt className={styles.factLabel}>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            ) : null}
          </div>
          {athlete.nickname ? <p className={styles.nickname}>«{athlete.nickname}»</p> : null}
          <p className={styles.meta}>
            <span className={styles.country}>
              <CountryFlag code={athlete.countryCode} />
              {athlete.countryCode}
            </span>
            {/* п.3 и п.17 Влада: категория вместо веса, лимит — подсказкой */}
            {weightClass ? (
              <>
                <span aria-hidden>·</span>
                <span title={weightClass.limit ?? undefined}>{weightClass.label}</span>
              </>
            ) : null}
          </p>
          {/* п.4 Влада: сначала стиль, потом техника — она разновидность стиля */}
          {style || technique ? (
            <p className={styles.badges}>
              {style ? <span className={`${styles.badge} ${BADGE[style]}`}>{STYLE_LABELS[style].badge}</span> : null}
              {technique ? (
                <span className={`${styles.badge} ${BADGE[getTechniqueStyle(technique)]}`}>
                  {getTechniqueLabel(technique)}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </section>
      {/* П4: ответ на цель альфы — сразу под шапкой, у любого борца (docs/changes/alpha-scope.md § 3) */}
      {athlete.scoutingReport ? (
        <section className={styles.section}>
          <h2>Как борется</h2>
          <p className={styles.text}>{athlete.scoutingReport}</p>
        </section>
      ) : null}
      {featured ? (
        <section className={styles.section}>
          <StyleScale profile={styleProfile} />
        </section>
      ) : null}
      {featured && athlete.achievements ? (
        <section className={styles.section}>
          <h2>Достижения</h2>
          <p className={styles.text}>{athlete.achievements}</p>
        </section>
      ) : null}
      {history.length > 0 ? (
        <>
          <StatsReveal
            stats={stats}
            recent={recent ? computeAthleteStats(athlete.id, recent) : null}
            showTechniques={featured}
          />
          <AthleteMatches rows={history} />
        </>
      ) : null}
      {/* п.8 Влада: источник фото обязателен (юр. минимум), но не должен отвлекать — в самом низу */}
      {photo && athlete.photoSource ? <p className={styles.source}>Фото: {athlete.photoSource}</p> : null}
    </>
  )
}
