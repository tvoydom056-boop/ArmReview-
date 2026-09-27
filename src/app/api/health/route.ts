import { pingDatabase } from '@/lib/queries/health'

// «Сайт жив» для deploy/release.sh и внешнего мониторинга (docs/changes/release-rollback.md).
// Наружу — только ok: без версий, путей и текста ошибок
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    await pingDatabase()
    return Response.json({ ok: true }, { headers: NO_STORE })
  } catch {
    console.error('health: база недоступна')
    return Response.json({ ok: false }, { status: 503, headers: NO_STORE })
  }
}
