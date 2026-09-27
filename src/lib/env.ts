import { z } from 'zod'

// Слабый секрет или заглушка из .env.example (скопировали файл и забыли сгенерировать) — не стартуем
// (docs/changes/security-audit-2026-09.md, S14)
const secret = (min: number) =>
  z
    .string()
    .min(min, `нужна длинная случайная строка (от ${min} символов)`)
    .refine((value) => !value.startsWith('change-me'), 'замените заглушку из .env.example случайной строкой')

const envSchema = z.object({
  DATABASE_URI: z.string().min(1),
  // Токен Turso: нужен только для libsql://…, для локального файла не нужен
  DATABASE_AUTH_TOKEN: z.string().optional(),
  // Ключ подписи токенов админки: короткий подбирается
  PAYLOAD_SECRET: secret(32),
  // Публичный адрес сайта для абсолютных ссылок в OG-превью
  SITE_URL: z.url().default('http://localhost:3000'),
  IP_HASH_SALT: secret(16),
})

// Turso без токена не пустит — лучше упасть при старте с понятным текстом, чем на первом запросе
const envChecked = envSchema.refine((env) => !env.DATABASE_URI.startsWith('libsql:') || Boolean(env.DATABASE_AUTH_TOKEN), {
  path: ['DATABASE_AUTH_TOKEN'],
  message: 'для libsql:// (Turso) нужен токен',
})

let cached: z.infer<typeof envSchema> | undefined

// Падаем сразу и понятно, а не посреди запроса с голосом (STRUCTURE.md § 3)
export function getEnv() {
  if (!cached) {
    const parsed = envChecked.safeParse(process.env)
    if (!parsed.success) {
      const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new Error(`Некорректный .env — ${problems}`)
    }
    cached = parsed.data
  }
  return cached
}
