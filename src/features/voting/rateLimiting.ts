// Общие лимиты новых строк; проверяются внутри writeVote (аудит § B).
export const RATE_LIMITS = {
  devicesPerMatchPerDay: 5, // разных устройств на один матч с одного ipHash за 24 ч
  votesPerHour: 60, // новых голосов в час с одного ipHash
} as const

export const DAY_MS = 24 * 60 * 60 * 1000
export const HOUR_MS = 60 * 60 * 1000
