// Поиск борца по имени — и по кириллице, и по латинице (design/athletes.html).
// Регистр, «ё» и порядок слов не важны: «сагинашвили леван» найдёт «Леван Сагинашвили».
const normalize = (value: string) => value.toLowerCase().replaceAll('ё', 'е').trim()

export function matchesAthleteSearch(athlete: { name: string; nameEn?: string | null }, query: string): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const haystack = `${normalize(athlete.name)} ${normalize(athlete.nameEn ?? '')}`
  return tokens.every((token) => haystack.includes(token))
}
