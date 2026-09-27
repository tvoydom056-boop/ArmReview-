import { getPayloadClient } from '../payload'

// Для /api/health: простой запрос через Payload — живы и процесс, и база, и её схема
// (docs/changes/ops-readiness.md, этап 7)
export async function pingDatabase(): Promise<void> {
  const payload = await getPayloadClient()
  await payload.count({ collection: 'events' })
}
