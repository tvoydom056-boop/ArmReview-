import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { Providers } from '@/components/Providers'

import './globals.css'

export const metadata: Metadata = {
  title: { default: 'ArmReview', template: '%s · ArmReview' },
  description: 'Оценки матчей East vs West от зрителей',
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
    <html lang="ru">
      <body>
        <Providers>
          <header className="site-header">
            <Link href="/" className="site-logo">
              ArmReview
            </Link>
            <nav className="site-nav">
              <Link href="/events">Турниры</Link>
              <Link href="/athletes">Борцы</Link>
            </nav>
          </header>
          <main className="site-main">{children}</main>
          {modal}
        </Providers>
      </body>
    </html>
  )
}
