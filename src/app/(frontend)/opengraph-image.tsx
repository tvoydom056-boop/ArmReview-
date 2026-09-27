import { ImageResponse } from 'next/og'

import { OG_SIZE, OgCard } from '@/components/OgCard'
import { loadOgFonts } from '@/lib/ogFont'
import { VOTING_ENABLED, siteConfig } from '@/lib/siteConfig'

export const alt = siteConfig.name
export const size = OG_SIZE
export const contentType = 'image/png'

// Общая картинка сайта; страницы матчей переопределяют её своей
export default async function Image() {
  const title = VOTING_ENABLED ? 'Оценки матчей East vs West' : 'Рукоборцы East vs West'
  return new ImageResponse(<OgCard title={title} subtitle={siteConfig.description} />, {
    ...size,
    fonts: await loadOgFonts(),
  })
}
