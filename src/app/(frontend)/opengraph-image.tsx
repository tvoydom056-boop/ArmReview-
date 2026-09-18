import { ImageResponse } from 'next/og'

import { OG_SIZE, OgCard } from '@/components/OgCard'
import { loadOgFonts } from '@/lib/ogFont'
import { siteConfig } from '@/lib/siteConfig'

export const alt = siteConfig.name
export const size = OG_SIZE
export const contentType = 'image/png'

// Общая картинка сайта; страницы матчей переопределяют её своей
export default async function Image() {
  return new ImageResponse(<OgCard title="Оценки матчей East vs West" subtitle={siteConfig.description} />, {
    ...size,
    fonts: await loadOgFonts(),
  })
}
