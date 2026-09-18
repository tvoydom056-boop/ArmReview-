import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URI: z.string().min(1),
  PAYLOAD_SECRET: z.string().min(1),
  // Публичный адрес сайта для абсолютных ссылок в OG-превью
  SITE_URL: z.url().default('http://localhost:3000'),
  IP_HASH_SALT: z.string().min(16, 'IP_HASH_SALT должен быть длинной случайной строкой (от 16 символов)'),
})

let cached: z.infer<typeof envSchema> | undefined

// Падаем сразу и понятно, а не посреди запроса с голосом (STRUCTURE.md § 3)
export function getEnv() {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env)
    if (!parsed.success) {
      const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new Error(`Некорректный .env — ${problems}`)
    }
    cached = parsed.data
  }
  return cached
}
