import type { Metadata } from 'next'

import { AthleteCard } from '@/components/AthleteCard'
import { EmptyState } from '@/components/EmptyState'
import { getPhoto } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { pluralize } from '@/lib/plural'

import styles from './athletes.module.css'

export const metadata: Metadata = { title: 'Рукоборцы' }
export const dynamic = 'force-dynamic'

// Фото первого ряда сетки (на десктопе) — в первом экране, грузим без ленивой подгрузки
const EAGER_PHOTOS = 6

export default async function AthletesPage() {
  const payload = await getPayloadClient()
  const { docs: athletes } = await payload.find({
    collection: 'athletes',
    sort: ['-isFeatured', 'name'],
    limit: 200,
    depth: 1,
    pagination: false,
  })

  return (
    <>
      <p className={styles.kicker}>База участников</p>
      <h1 className={styles.title}>Рукоборцы</h1>
      <p className={styles.lead}>Все, кто хоть раз выходил к столу на турнирах в базе.</p>
      {athletes.length === 0 ? (
        <EmptyState title="Борцов пока нет" hint="Карточки появятся по мере разбора турниров." />
      ) : (
        <>
          <p className={styles.count}>
            {athletes.length} {pluralize(athletes.length, ['борец', 'борца', 'борцов'])}
          </p>
          <ul className={styles.grid}>
            {athletes.map((a, i) => (
              <li key={a.id}>
                <AthleteCard
                  eager={i < EAGER_PHOTOS}
                  slug={a.slug}
                  name={a.name}
                  countryCode={a.countryCode}
                  weightKg={a.weightKg ?? null}
                  photo={getPhoto(a.photo)}
                  isFeatured={Boolean(a.isFeatured)}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
