import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { CookieBanner } from '@/components/CookieBanner'
import { Providers } from '@/components/Providers'
import { getEnv } from '@/lib/env'
import { siteConfig } from '@/lib/siteConfig'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(getEnv().SITE_URL),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: { siteName: siteConfig.name, locale: 'ru_RU', type: 'website' },
}

export const viewport: Viewport = { themeColor: '#c2410c' }

export default function FrontendLayout({
  children,
  modal,
}: {
  children: ReactNode
  modal: ReactNode
}) {
  return (
    // TODO(вопрос 13): сайт только на русском
    <html lang="ru">
      <body>
        <Providers>
          <header className="site-header">
            <Link href="/" className="site-logo">
              {siteConfig.name}
            </Link>
            <nav className="site-nav">
              <Link href="/events">Турниры</Link>
              <Link href="/top">Топ-100</Link>
              <Link href="/athletes">Борцы</Link>
            </nav>
          </header>
          <main className="site-main">{children}</main>
          <footer className="site-footer">
            <Link href="/privacy">Конфиденциальность</Link>
            <Link href="/contacts">Контакты</Link>
          </footer>
          {modal}
          <CookieBanner />
        </Providers>
      </body>
    </html>
  )
}
