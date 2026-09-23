import type { ReactNode } from 'react'

import styles from './LegalPage.module.css'

// Текстовая страница — типографика design/privacy.html, design/contacts.html (.legal)
export function LegalPage({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <article className={styles.page}>
      <p className={styles.kicker}>{kicker}</p>
      <h1 className={styles.title}>{title}</h1>
      {children}
    </article>
  )
}