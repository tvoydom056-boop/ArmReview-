import { EmptyState } from '@/components/EmptyState'

// design/states.html 5.2 — матч не найден
export default function MatchNotFound() {
  return (
    <EmptyState
      code="404"
      title="Матч не найден"
      hint="Поединка с таким номером нет. Найдите его в карте турнира — там все пары по датам."
      actions={[
        { href: '/events', label: 'Все турниры', primary: true },
        { href: '/', label: 'На главную' },
      ]}
    />
  )
}
