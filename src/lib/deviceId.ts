import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

// Осознанное исключение из «lib без Next»: тонкая обёртка над cookies API (STRUCTURE.md § 1)
const COOKIE_NAME = 'armreview_device'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
const DEVICE_ID_PATTERN = /^[a-f0-9]{32}$/

export function createDeviceId(): string {
  return randomBytes(16).toString('hex')
}

export async function readDeviceId(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value
  return value && DEVICE_ID_PATTERN.test(value) ? value : null
}

// Работает только из Route Handler / Server Action
export async function setDeviceCookie(deviceId: string): Promise<void> {
  ;(await cookies()).set(COOKIE_NAME, deviceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
  })
}
