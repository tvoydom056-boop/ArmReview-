'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

import styles from './CookieBanner.module.css'

const STORAGE_KEY = 'armreview_cookie_ack'
const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

// localStorage может быть недоступен (приватный режим) — тогда баннер просто покажется снова
function readAcknowledged(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

// На сервере считаем, что согласие есть, — баннер не мигает в HTML и появляется уже на клиенте
const readOnServer = () => true

function acknowledge() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // недоступное хранилище — не критично
  }
  listeners.forEach((callback) => callback())
}

export function CookieBanner() {
  const acknowledged = useSyncExternalStore(subscribe, readAcknowledged, readOnServer)
  if (acknowledged) return null

  return (
    <div className={styles.banner} role="region" aria-label="Уведомление о cookie">
      <p className={styles.text}>
        Мы используем один cookie, чтобы учитывать ваш голос. Подробнее — в{' '}
        <Link href="/privacy">политике конфиденциальности</Link>.
      </p>
      <button type="button" className={styles.button} onClick={acknowledge}>
        Понятно
      </button>
    </div>
  )
}
