import { EmptyState } from '@/components/EmptyState'

// design/states.html 5.1 — борец не найден
export default function AthleteNotFound() {
  return (
    <EmptyState
      code="404"
      title="Такого борца у нас нет"
      hint="Возможно, в ссылке опечатка. Посмотрите список борцов — если человек известный, мы его скоро добавим."
      actions={[
        { href: '/athletes', label: 'К списку борцов', primary: true },
        { href: '/', label: 'На главную' },
      ]}
    />
  )
}
