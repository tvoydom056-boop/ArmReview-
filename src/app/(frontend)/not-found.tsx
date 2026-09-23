import { EmptyState } from '@/components/EmptyState'

// Общая 404 для notFound() на страницах сайта (турнир и прочее) — design/states.html § 5
export default function NotFound() {
  return (
    <EmptyState
      code="404"
      title="Страница не найдена"
      hint="Возможно, в ссылке опечатка или страницу удалили."
      actions={[{ href: '/', label: 'На главную', primary: true }]}
    />
  )
}
