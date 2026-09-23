'use client'

import { useState, type ReactNode } from 'react'

import styles from './Spoiler.module.css'

// Результат — только по нажатию (PROJECT.md § 12). Пока спойлер закрыт, под размытием лежит
// заглушка той же формы, а не настоящие данные: иначе счёт попал бы в HTML-разметку
// (и в сниппеты поисковиков). Форма та же — при открытии вёрстка не прыгает.
export function Spoiler({
  placeholder,
  children,
  action,
  hint,
  variant,
}: {
  placeholder: ReactNode
  children: ReactNode
  action: string
  hint?: string
  // compact — строка в карточке матча, tall — высокий блок (кнопка у верха, видна без прокрутки)
  variant?: 'compact' | 'tall'
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`${styles.root} ${variant ? styles[variant] : ''}`} data-open={open}>
      <div className={styles.body} inert={!open}>
        {open ? children : placeholder}
      </div>
      {open ? null : (
        <div className={styles.cover}>
          {hint ? <p className={styles.hint}>{hint}</p> : null}
          <button type="button" className={styles.button} onClick={() => setOpen(true)}>
            {action}
          </button>
        </div>
      )}
    </div>
  )
}
