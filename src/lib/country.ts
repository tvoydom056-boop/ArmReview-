// Название страны по ISO-коду: в макетах «Грузия», а не «GE» (design/athlete.html, match.html).
// Intl.DisplayNames встроен в Node и браузеры — таблицу стран не храним.
// style 'short' — «США», а не «Соединенные Штаты»: влезает в колонку борца на 375 px
const names = new Intl.DisplayNames('ru', { type: 'region', style: 'short' })

export function getCountryName(code: string): string {
  const normalized = code.trim().toUpperCase()
  try {
    return names.of(normalized) ?? normalized
  } catch {
    // невалидный код — показываем как есть, страница не должна падать из-за опечатки в админке
    return normalized
  }
}
