'use client'

import { EmptyState } from '@/components/EmptyState'

// Ошибка рендера страницы сайта — design/states.html § 5. Текст ошибки пользователю не показываем.
export default function ErrorPage() {
  return (
    <EmptyState
      code="500"
      title="Что-то пошло не так"
      hint="Мы уже знаем о сбое. Попробуйте обновить страницу чуть позже."
      actions={[{ href: '/', label: 'На главную', primary: true }]}
    />
  )
}
