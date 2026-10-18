import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalPage } from '@/components/LegalPage'
import { siteConfig } from '@/lib/siteConfig'

import styles from './contacts.module.css'

export const metadata: Metadata = { title: 'Контакты' }

// Структура — design/contacts.html. Блок «Кто ведёт сайт» не переносим: оператор не выбран (siteConfig.ts)
export default function ContactsPage() {
  return (
    <LegalPage kicker="О проекте" title="Контакты">
      <p className={styles.lead}>
        По любым вопросам и обращениям пишите на почту ниже. Форм обратной связи на сайте нет: мы не просим
        заполнять анкеты и не собираем ваши контакты.
      </p>

      <div className={styles.facts}>
        <dl className={styles.fact}>
          <dt>Почта для обращений</dt>
          <dd>{siteConfig.contactEmail}</dd>
        </dl>
        <dl className={styles.fact}>
          <dt>Регистрация и формы</dt>
          <dd>Нет</dd>
        </dl>
      </div>

      {/* Правообладателям — первым: на это обращение надо реагировать быстро */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <p className={styles.label}>Правообладателям фото</p>
          <span className={styles.pill}>Убираем по обращению</span>
        </div>
        <h2 className={styles.cardTitle}>Как попросить убрать изображение</h2>
        <p>
          Если вы считаете, что фото или другой материал размещены без вашего разрешения, напишите нам: укажите
          страницу и подтвердите права. Мы быстро уберём спорный материал.
        </p>
        <p>Чтобы разобраться без переписки в три круга, приложите к письму:</p>
        <ol>
          <li>ссылку на страницу, где размещено фото;</li>
          <li>какое именно изображение на этой странице;</li>
          <li>чем подтверждаются права — съёмка, договор с промоушеном, публикация в вашем аккаунте.</li>
        </ol>
        <p>Письмо на {siteConfig.contactEmail} — тема «Фото».</p>
        <p>
          У каждого фото на сайте указан источник. Логотип, постеры и другую символику East vs West мы не
          используем — только название турнира как название события.
        </p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Нашли ошибку в данных матча</h2>
        <p>
          Турниры и матчи мы вносим вручную через день-два после события, поэтому ошибки в счёте, руке или дате
          возможны. Напишите — поправим.
        </p>
        <p>Что помогает исправить быстро:</p>
        <ul>
          <li>ссылка на страницу матча или борца;</li>
          <li>что именно не так — счёт, рука, дата, соперник, турнир;</li>
          <li>откуда известно, как правильно: трансляция с таймкодом или публикация промоушена.</li>
        </ul>
        <p>Письмо на {siteConfig.contactEmail} — тема «Ошибка в данных».</p>
      </section>

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
