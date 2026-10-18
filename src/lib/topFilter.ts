export type TopFilter = 'all' | 'year' | 'right' | 'left'

type Candidate = { hand: 'right' | 'left'; eventDate: string }

const YEAR_MS = 365 * 24 * 60 * 60 * 1000

// Фильтры топа — design/top.html. «За год» — по дате турнира, а не по дате голоса:
// голоса дат матча не меняют, а турнир в базе всегда с датой
export function matchesTopFilter({ hand, eventDate }: Candidate, filter: TopFilter, now: number): boolean {
  if (filter === 'all') return true
  if (filter === 'year') {
    const age = now - new Date(eventDate).getTime()
    return age >= 0 && age <= YEAR_MS
  }
  return hand === filter
}
