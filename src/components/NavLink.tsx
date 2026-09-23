'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Пункт меню шапки: подсвечивает текущий раздел через aria-current (design/ui.css «КАРКАС»).
// Клиентский только ради usePathname — лист, как ThemeToggle (AGENTS § 5).
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link href={href} aria-current={isActive ? 'page' : undefined}>
      {children}
    </Link>
  )
}
