// Лимиты по ipHash (PROJECT.md § 7, п. 3). Считает только решение — числа приносит service
// запросами к votes, отдельной таблицы счётчиков нет (STRUCTURE.md § 2).
export const RATE_LIMITS = {
  devicesPerMatchPerDay: 5, // разных устройств на один матч с одного ipHash за 24 ч
  votesPerHour: 60, // новых голосов в час с одного ipHash
} as const

export const DAY_MS = 24 * 60 * 60 * 1000
export const HOUR_MS = 60 * 60 * 1000

type Input = {
  deviceId: string
  // устройства, уже голосовавшие за этот матч с этого ipHash за 24 ч
  devicesForMatch: ReadonlySet<string>
  votesLastHour: number
}

export function isRateLimited({ deviceId, devicesForMatch, votesLastHour }: Input): boolean {
  // Повторный голос того же устройства заменяет прежний и лимиты не нагружает
  if (devicesForMatch.has(deviceId)) return false
  if (devicesForMatch.size >= RATE_LIMITS.devicesPerMatchPerDay) return true
  return votesLastHour >= RATE_LIMITS.votesPerHour
}
