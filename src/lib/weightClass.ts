// Весовая категория матча: в базе — лимит текстом («до 85 кг», «свыше 105 кг»), название
// вычисляется здесь (docs/changes/vlad-feedback-2026-09-27.md, вопрос 48). Поменять названия
// или границы можно без миграции.
// TODO(вопрос 48): таблица названий — предположение по примеру Влада «полутяжёлый — до 85 кг»

export const WEIGHT_CLASS_FORMAT = /^(до|свыше) (\d{2,3}) кг$/

const NAMES: { maxKg: number; label: string }[] = [
  { maxKg: 65, label: 'Лёгкий вес' },
  { maxKg: 75, label: 'Полусредний вес' },
  { maxKg: 80, label: 'Средний вес' },
  { maxKg: 85, label: 'Полутяжёлый вес' },
  { maxKg: 105, label: 'Тяжёлый вес' },
]
const OPEN_LABEL = 'Супертяжёлый вес'

// label — название категории, limit — исходный текст («до 85 кг»); старое значение не по формату
// показываем как есть, без названия
export type WeightClassView = { label: string; limit: string | null }

export function toWeightClassView(text: string | null | undefined): WeightClassView | null {
  const value = text?.trim()
  if (!value) return null
  const parsed = WEIGHT_CLASS_FORMAT.exec(value)
  if (!parsed) return { label: value, limit: null }

  const kg = Number(parsed[2])
  const label = parsed[1] === 'свыше' ? OPEN_LABEL : (NAMES.find((n) => kg <= n.maxKg)?.label ?? OPEN_LABEL)
  return { label, limit: value }
}

export function validateWeightClass(value: string | null | undefined): true | string {
  if (!value) return true
  return WEIGHT_CLASS_FORMAT.test(value.trim()) || 'Формат: «до 85 кг» или «свыше 105 кг»'
}
