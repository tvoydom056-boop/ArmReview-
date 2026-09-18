// TODO(новый вопрос к Владу — часовой пояс): дата турнира пока по Москве
const formatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Moscow',
})

export function formatEventDate(iso: string): string {
  return formatter.format(new Date(iso))
}
