'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'

import styles from './Modal.module.css'

// Окно поверх страницы: закрытие = router.back(), поэтому «назад» в браузере тоже закрывает его
export function Modal({ children }: { children: ReactNode }) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={() => router.back()}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close()
      }}
    >
      <button type="button" className={styles.close} aria-label="Закрыть" onClick={() => dialogRef.current?.close()}>
        ×
      </button>
      {children}
    </dialog>
  )
}
