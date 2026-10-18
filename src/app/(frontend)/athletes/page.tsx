import type { Metadata } from 'next'

import { AthleteList, type AthleteListItem } from '@/components/AthleteList'
import { EmptyState } from '@/components/EmptyState'
import { getPhoto } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { getHandsByAthlete, getStyleByAthlete } from '@/lib/queries/athletes'

import styles from './athletes.module.css'

export const metadata: Metadata = { title: 'Рукоборцы' }
export const dynamic = 'force-dynamic'

export default async function AthletesPage() {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'athletes',
    sort: ['-isFeatured', 'name'],
    limit: 200,
    depth: 1,
    pagination: false,
  })
  const hands = await getHandsByAthlete()
  const styleById = await getStyleByAthlete(docs.filter((a) => a.isFeatured).map((a) => a.id))

  const athletes: AthleteListItem[] = docs.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    nameEn: a.nameEn ?? null,
    countryCode: a.countryCode,
    weightKg: a.weightKg ?? null,
    photo: getPhoto(a.photo),
    isFeatured: Boolean(a.isFeatured),
    hands: [...(hands.get(a.id) ?? [])],
    style: styleById.get(a.id) ?? null,
  }))

  return (
    <>
      <p className={styles.kicker}>База участников</p>
      <h1 className={styles.title}>Рукоборцы</h1>
      <p className={styles.lead}>
        Все, кто хоть раз выходил к столу на турнирах в базе. Поиск работает и по кириллице, и по латинице.
      </p>
      {athletes.length === 0 ? (
        <EmptyState title="Борцов пока нет" hint="Карточки появятся по мере разбора турниров." />
      ) : (
        <AthleteList athletes={athletes} />
      )}
    </>
  )
}
