// Проверка .env при старте сервера — падаем сразу, а не при первом голосе
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getEnv } = await import('./lib/env')
    getEnv()
  }
}
