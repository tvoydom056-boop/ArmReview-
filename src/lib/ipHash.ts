import { createHash } from 'node:crypto'

// Сырой IP не храним и не логируем — это ПД (PROJECT.md § 7); в базу идёт только хеш с солью
export function hashIp(ip: string, salt: string): string {
  return createHash('sha256').update(ip + salt).digest('hex')
}
