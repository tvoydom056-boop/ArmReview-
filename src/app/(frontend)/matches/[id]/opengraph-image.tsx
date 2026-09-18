import { ImageResponse } from 'next/og'

import { OG_SIZE, OgCard } from '@/components/OgCard'
import { getMatchPanelData } from '@/lib/queries/matches'
import { loadOgFonts } from '@/lib/ogFont'

export const alt = 'Оценки матча'
export const size = OG_SIZE
export const contentType = 'image/png'
export const dynamic = 'force-dynamic'

// Только имена борцов и турнир — без счёта и победителя (PROJECT.md § 12)
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const rawId = (await params).id
  const data = /^\d+$/.test(rawId) ? await getMatchPanelData(Number(rawId)) : null

  const title = data ? `${data.match.athlete1.name} vs ${data.match.athlete2.name}` : 'Оценки матча'
  const subtitle = data ? data.event.title : 'East vs West'

  return new ImageResponse(<OgCard title={title} subtitle={subtitle} />, {
    ...size,
    fonts: await loadOgFonts(),
  })
}
