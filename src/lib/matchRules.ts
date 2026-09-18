import { refId } from './refId'

type ValidationResult = true | string
// Соседние поля матча в том виде, как их отдаёт Payload в validate
type MatchFields = { athlete1?: unknown; athlete2?: unknown; resultType?: unknown }

export function validateDifferentAthletes(fields: MatchFields, athlete2: unknown): ValidationResult {
  const a1 = refId(fields.athlete1)
  return a1 !== null && a1 === refId(athlete2) ? 'Борец 1 и борец 2 должны быть разными' : true
}

// Победитель — один из двух борцов; в несостоявшемся матче победителя нет
export function validateWinner(fields: MatchFields, winner: unknown): ValidationResult {
  const w = refId(winner)
  if (w === null) return true
  if (fields.resultType === 'no_contest') return 'В несостоявшемся матче победителя нет'
  if (w !== refId(fields.athlete1) && w !== refId(fields.athlete2)) return 'Победитель должен быть одним из двух борцов'
  return true
}

// Заголовок матча для списков в админке
export function formatMatchTitle(name1: string | undefined, name2: string | undefined): string {
  return `${name1 ?? '?'} vs ${name2 ?? '?'}`
}
