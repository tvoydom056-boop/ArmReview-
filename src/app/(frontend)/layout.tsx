import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Oswald } from 'next/font/google'
import type { ReactNode } from 'react'

import { CookieBanner } from '@/components/CookieBanner'
import { NavLink } from '@/components/NavLink'
import { Providers } from '@/components/Providers'
import { getEnv } from '@/lib/env'
import { siteConfig } from '@/lib/siteConfig'
import { ThemeToggle } from '@/components/ThemeToggle'
import { themeColors, themeInitHtml } from '@/lib/theme'

import './globals.css'

const display = Oswald({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getEnv().SITE_URL),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: { siteName: siteConfig.name, locale: 'ru_RU', type: 'website' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: themeColors.light },
    { media: '(prefers-color-scheme: dark)', color: themeColors.dark },
  ],
}

export default function FrontendLayout({
  children,
  modal,
}: {
  children: ReactNode
  modal: ReactNode
}) {
  return (
    // TODO(вопрос 13): сайт только на русском
    // suppressHydrationWarning: скрипт темы ставит data-theme на <html> до гидратации
    <html lang="ru" className={display.variable} suppressHydrationWarning>
      <body>
        {/* Скрипт темы — HTML-строкой, а не <script>-элементом React: браузер выполняет его при парсинге
            до первой отрисовки (без мигания), а React не ругается на script в компоненте.
            next/script выставляет тему уже после первого кадра — проверено замером. */}
        <div hidden suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeInitHtml }} />
        <Providers>
          <header className="site-header">
            <ThemeToggle />
            <Link href="/" className="site-logo">
              {siteConfig.name}
            </Link>
            <nav className="site-nav">
              <NavLink href="/events">Турниры</NavLink>
              <NavLink href="/top">Топ-100</NavLink>
              <NavLink href="/athletes">Борцы</NavLink>
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
