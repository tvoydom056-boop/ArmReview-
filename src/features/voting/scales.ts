import type { ScaleKey } from '@/lib/rating'

// TODO(вопрос 9): подсказки — черновик, Влад утверждает формулировки
export const SCALES: { key: ScaleKey; label: string; hint: string }[] = [
  { key: 'spectacle', label: 'Зрелищность', hint: '1 — вялый, скучно смотреть · 5 — эмоции до последней секунды' },
  { key: 'intrigue', label: 'Интрига', hint: '1 — исход ясен сразу · 5 — до конца неясно, кто победит' },
  { key: 'technique', label: 'Техничность', hint: '1 — борьба на одной силе · 5 — сложная техника и смена приёмов' },
  { key: 'refereeing', label: 'Судейство', hint: '1 — были явные ошибки судей · 5 — чётко и справедливо' },
]
