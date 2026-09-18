import type { MetadataRoute } from 'next'

import { siteConfig } from '@/lib/siteConfig'

// «Добавить на главный экран» (PROJECT.md § 5, Срез 3)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#c2410c',
    lang: 'ru',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
