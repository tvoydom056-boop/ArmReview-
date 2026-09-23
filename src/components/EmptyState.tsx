import Link from 'next/link'

import styles from './EmptyState.module.css'

type Action = { href: string; label: string; primary?: boolean }

// Пусто — не ошибка: заголовок, подсказка и выход дальше (design/states.html «Пустые состояния»).
// code — крупная цифра для 404
export function EmptyState({
  title,
  hint,
  actions = [],
  code,
}: {
  title: string
  hint: string
  actions?: Action[]
  code?: string
}) {
  return (
    <div className={styles.card}>
      {code ? <p className={styles.code}>{code}</p> : null}
      <p className={styles.title}>{title}</p>
      <p className={styles.hint}>{hint}</p>
      {actions.length > 0 ? (
        <div className={styles.actions}>
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className={action.primary ? styles.action : styles.ghost}>
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
