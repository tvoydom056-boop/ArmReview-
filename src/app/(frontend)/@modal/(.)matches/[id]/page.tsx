import { notFound } from 'next/navigation'

import { Modal } from '@/components/Modal'
import { MatchVotePanel } from '@/features/voting/MatchVotePanel'
import { getMatchPanelData } from '@/lib/queries/matches'

export const dynamic = 'force-dynamic'

// Тот же матч, открытый поверх страницы турнира; по прямой ссылке откроется /matches/[id]
export default async function MatchModalPage({ params }: { params: Promise<{ id: string }> }) {
  const rawId = (await params).id
  const data = /^\d+$/.test(rawId) ? await getMatchPanelData(Number(rawId)) : null
  if (!data) notFound()

  return (
    <Modal>
      <MatchVotePanel data={data} />
    </Modal>
  )
}
