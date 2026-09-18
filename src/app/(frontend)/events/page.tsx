import type { Metadata } from 'next'
import Link from 'next/link'

import { formatEventDate } from '@/lib/formatDate'
import { getEvents } from '@/lib/queries/events'

import styles from './events.module.css'

export const metadata: Metadata = { title: 'Турниры' }
export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <>
      <h1 className={styles.title}>Турниры</h1>
      {events.length === 0 ? (
        <p className={styles.empty}>Турниров пока нет.</p>
      ) : (
        <ul className={styles.list}>
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/events/${e.slug}`} className={styles.item}>
                <span className={styles.name}>{e.title}</span>
                <span className={styles.meta}>
                  {formatEventDate(e.date)}
                  {e.location ? ` · ${e.location}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
