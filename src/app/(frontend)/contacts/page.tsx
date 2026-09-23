import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage } from '@/components/LegalPage'
import { siteConfig } from '@/lib/siteConfig'

export const metadata: Metadata = { title: 'Контакты' }

export default function ContactsPage() {
  return (
    <LegalPage kicker="О проекте" title="Контакты">
      <p>По любым вопросам и обращениям: {siteConfig.contactEmail}.</p>

      <h2>Правообладателям</h2>
      <p>
        Если вы считаете, что фото или другой материал размещены без вашего разрешения, напишите нам: укажите
        страницу и подтвердите права. Мы быстро уберём спорный материал.
      </p>
      <p>У каждого фото на сайте указан источник.</p>

      <h2>О проекте</h2>
      <p>
        {siteConfig.name} — неофициальный фан-проект. Он не связан с организаторами East vs West; название
        турнира используется только как название события.
      </p>

      <h2>Данные</h2>
      <p>
        Что мы храним о зрителях — в <Link href="/privacy">политике конфиденциальности</Link>.
      </p>
    </LegalPage>
  )
}
