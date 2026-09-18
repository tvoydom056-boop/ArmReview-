import type { Metadata } from 'next'

import { AthleteCard } from '@/components/AthleteCard'
import { getPhoto } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'

import styles from './athletes.module.css'

export const metadata: Metadata = { title: 'Борцы' }
export const dynamic = 'force-dynamic'

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
        <p className={styles.empty}>Пока никого нет.</p>
      ) : (
        <ul className={styles.grid}>
          {athletes.map((a) => (
            <li key={a.id}>
              <AthleteCard
                slug={a.slug}
                name={a.name}
                countryCode={a.countryCode}
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
