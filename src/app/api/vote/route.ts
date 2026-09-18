import { castVote } from '@/features/voting/service'
import { voteInputSchema } from '@/features/voting/schema'
import { getClientIp } from '@/lib/clientIp'
import { createDeviceId, readDeviceId, setDeviceCookie } from '@/lib/deviceId'
import { getEnv } from '@/lib/env'
import { hashIp } from '@/lib/ipHash'
import type { VoteErrorCode, VoteResponse } from '@/types/api'

// Не /api/votes: этот путь занят REST-коллекцией votes (админка Payload ходит туда за списком)
const STATUS: Record<VoteErrorCode, number> = {
  INVALID_INPUT: 400,
  TOO_EARLY: 409,
  NOT_VOTABLE: 409,
  RATE_LIMITED: 429,
}

const json = (body: VoteResponse, status = 200) => Response.json(body, { status })

// Тонкий контроллер: разбор запроса → castVote → ответ. Правил здесь нет.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = voteInputSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'INVALID_INPUT' }, STATUS.INVALID_INPUT)

  const ip = getClientIp(request.headers, process.env.NODE_ENV === 'production')
  if (ip === null) {
    // IP не логируем; сюда попадаем только при неверной настройке Caddy
    console.error('vote: заголовок с IP клиента не выставлен прокси (см. lib/clientIp.ts)')
    return Response.json({ error: 'SERVER_MISCONFIGURED' }, { status: 500 })
  }

  const existingDeviceId = await readDeviceId()
  const deviceId = existingDeviceId ?? createDeviceId()

  const result = await castVote(parsed.data, {
    deviceId,
    ipHash: hashIp(ip, getEnv().IP_HASH_SALT),
    now: new Date(),
  })

  if (!existingDeviceId) await setDeviceCookie(deviceId)
  return result.ok ? json({ ok: true }) : json({ error: result.code }, STATUS[result.code])
}
