import type { ReactNode } from 'react'

import styles from './LegalPage.module.css'

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className={styles.page}>
      <h1>{title}</h1>
      {children}
    </article>
  )
}
