import type { Metadata } from 'next'

import { AthleteCard } from '@/components/AthleteCard'
import { EmptyState } from '@/components/EmptyState'
import { getPhoto } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'

import styles from './athletes.module.css'

export const metadata: Metadata = { title: 'Борцы' }
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
      <h1 className={styles.title}>Борцы</h1>
      {athletes.length === 0 ? (
        <EmptyState title="Борцов пока нет" hint="Карточки появятся по мере разбора турниров." />
      ) : (
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
      )}
    </>
  )
}
