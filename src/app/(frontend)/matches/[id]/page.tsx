import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { MatchVotePanel } from '@/features/voting/MatchVotePanel'
import { getMatchPanelData } from '@/lib/queries/matches'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

const loadMatch = cache(async (rawId: string) => {
  return /^\d+$/.test(rawId) ? getMatchPanelData(Number(rawId)) : null
})

// В title только имена борцов — без результата (PROJECT.md § 12)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadMatch((await params).id)
  return { title: data ? `${data.match.athlete1.name} vs ${data.match.athlete2.name}` : 'Матч не найден' }
}

export default async function MatchPage({ params }: Props) {
  const data = await loadMatch((await params).id)
  if (!data) notFound()
  return <MatchVotePanel data={data} />
}
