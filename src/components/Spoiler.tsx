'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import styles from './Spoiler.module.css'

// Результат — только по нажатию (PROJECT.md § 12). Пока спойлер закрыт, под размытием лежит
// заглушка той же формы, а не настоящие данные: иначе счёт попал бы в HTML-разметку
// (и в сниппеты поисковиков). Форма та же — при открытии вёрстка не прыгает.
export function Spoiler({
  placeholder,
  children,
  action,
  label,
  hint,
  variant,
  forceOpen,
}: {
  placeholder: ReactNode
  children: ReactNode
  action: string
  // озвучка кнопки, если одного action мало: в списке 15 «Счёт» подряд ничем не различаются
  label?: string
  hint?: string
  // compact — строка в карточке матча, tall — высокий блок (кнопка у верха, видна без прокрутки)
  variant?: 'compact' | 'tall'
  // открыто снаружи («Я смотрел этот турнир»): решение зрителя, а не автоматика — фокус при этом не двигаем
  forceOpen?: boolean
}) {
  const [clicked, setClicked] = useState(false)
  const open = clicked || Boolean(forceOpen)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Кнопка при открытии исчезает, и фокус упал бы в <body>: переносим его на открывшийся результат
  useEffect(() => {
    if (clicked) bodyRef.current?.focus()
  }, [clicked])

  return (
    <div className={`${styles.root} ${variant ? styles[variant] : ''}`} data-open={open}>
      <div ref={bodyRef} className={styles.body} inert={!open} tabIndex={open ? -1 : undefined}>
        {open ? children : placeholder}
      </div>
      {open ? null : (
        <div className={styles.cover}>
          {hint ? <p className={styles.hint}>{hint}</p> : null}
          <button type="button" className={styles.button} aria-label={label} onClick={() => setClicked(true)}>
            {action}
          </button>
        </div>
      )}
    </div>
  )
}
