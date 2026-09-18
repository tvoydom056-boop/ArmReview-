// Картинка для превью ссылок (ВК, Telegram). Стили инлайн — так требует satori (next/og).
// В превью — только названия, никогда счёт и победитель (PROJECT.md § 12).
import { ogColors } from '@/lib/theme'

export const OG_SIZE = { width: 1200, height: 630 }

export function OgCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: ogColors.bg,
        color: ogColors.text,
        fontFamily: 'Inter, InterCyrillic', // satori подбирает шрифт по глифам: латиница — Inter, кириллица — InterCyrillic
      }}
    >
      <div style={{ display: 'flex', fontSize: 40, color: ogColors.gold }}>ArmReview</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.1 }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 36, color: ogColors.muted }}>{subtitle}</div>
      </div>
    </div>
  )
}
