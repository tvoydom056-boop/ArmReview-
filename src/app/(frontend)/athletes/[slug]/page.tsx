import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { AthletePhoto } from '@/components/AthletePhoto'
import { CountryFlag } from '@/components/CountryFlag'
import { StatsReveal } from '@/components/StatsReveal'
import { computeAthleteStats } from '@/lib/athleteStats'
import { getPhoto } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'

import styles from './profile.module.css'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const getAthlete = cache(async (slug: string) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'athletes',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })
  return docs[0] ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const athlete = await getAthlete((await params).slug)
  return { title: athlete?.name ?? 'Борец не найден' }
}

export default async function AthleteProfilePage({ params }: Props) {
  const athlete = await getAthlete((await params).slug)
  if (!athlete) notFound()

  // Подробный профиль — только у известных борцов (PROJECT.md § 5)
  const stats = athlete.isFeatured ? await getStats(athlete.id) : null

  const facts = [
    athlete.birthYear ? ['Год рождения', String(athlete.birthYear)] : null,
    athlete.heightCm ? ['Рост', `${athlete.heightCm} см`] : null,
    athlete.weightKg ? ['Вес', `${athlete.weightKg} кг`] : null,
    athlete.style ? ['Стиль', athlete.style] : null,
  ].filter((f): f is string[] => f !== null)

  const photo = getPhoto(athlete.photo)

  return (
    <>
      <Link href="/athletes" className={styles.back}>
        ← Все борцы
      </Link>
      <div className={styles.head}>
        <AthletePhoto photo={photo} name={athlete.name} size="profile" />
        <div className={styles.info}>
          <h1 className={styles.name}>{athlete.name}</h1>
          {athlete.nameEn ? <p className={styles.nameEn}>{athlete.nameEn}</p> : null}
          <p className={styles.country}>
            <CountryFlag code={athlete.countryCode} />
            <span>{athlete.countryCode}</span>
          </p>
          {athlete.isFeatured && facts.length > 0 ? (
            <dl className={styles.facts}>
              {facts.map(([label, value]) => (
                <div key={label} className={styles.fact}>
                  <dt className={styles.factLabel}>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {photo && athlete.photoSource ? (
            <p className={styles.source}>Фото: {athlete.photoSource}</p>
          ) : null}
        </div>
      </div>
      {athlete.isFeatured && athlete.achievements ? (
        <section className={styles.section}>
          <h2>Достижения</h2>
          <p className={styles.achievements}>{athlete.achievements}</p>
        </section>
      ) : null}
      {stats ? <StatsReveal stats={stats} /> : null}
    </>
  )
}

async function getStats(athleteId: number) {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'matches',
    where: { or: [{ athlete1: { equals: athleteId } }, { athlete2: { equals: athleteId } }] },
    depth: 0,
    limit: 1000,
    pagination: false,
  })
  return computeAthleteStats(athleteId, docs)
}
