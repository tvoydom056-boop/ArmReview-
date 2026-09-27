// Справочник техник армрестлинга — по пирамиде техник (docs/changes/technique-pyramid.md § 1).
// Техника принадлежит семейству, семейство — стилю: левая сторона пирамиды — инсайд, правая — аутсайд.
// Стиль и семейство в базе не хранятся, они выводятся отсюда — поэтому поправить принадлежность
// можно без миграции. Имена техник не переводим: это их названия и в RU-версии.

export type WrestlingStyle = 'inside' | 'outside' | 'universal'

// Порядок — по пирамиде слева направо: он же порядок строк статистики при равенстве
export const TECHNIQUE_FAMILIES = [
  { value: 'press', style: 'inside' },
  { value: 'hook', style: 'inside' },
  { value: 'top_roll', style: 'outside' },
  { value: 'kings_move', style: 'outside' },
] as const satisfies readonly { value: string; style: Exclude<WrestlingStyle, 'universal'> }[]

export type TechniqueFamily = (typeof TECHNIQUE_FAMILIES)[number]['value']

// code: null — семейство «без уточнения»: его ставят, когда не уверены в точке (там же, § 1).
// Значение семейства совпадает с его вариантом «без уточнения», King's Move — семейство из одной точки.
// TODO(вопрос 60): H1 на вершине — инсайд, пока Влад не решит иначе
export const TECHNIQUES = [
  { value: 'press', name: 'Press', code: null, family: 'press' },
  { value: 'flop_press', name: 'Flop Press', code: 'P2', family: 'press' },
  { value: 'shoulder_press', name: 'Shoulder Press', code: 'P1', family: 'press' },
  { value: 'hook', name: 'Hook', code: null, family: 'hook' },
  { value: 'hook_drive', name: 'Hook & Drive', code: 'H3', family: 'hook' },
  { value: 'hook_drag', name: 'Hook & Drag', code: 'H2', family: 'hook' },
  { value: 'high_hook', name: 'High Hook', code: 'H1', family: 'hook' },
  { value: 'top_roll', name: 'Toproll', code: null, family: 'top_roll' },
  { value: 'posting_top_roll', name: 'Posting Toproll', code: 'T1', family: 'top_roll' },
  { value: 'sweeping_top_roll', name: 'Sweeping Toproll', code: 'T2', family: 'top_roll' },
  { value: 'low_hand_top_roll', name: 'Low-hand Toproll', code: 'T3', family: 'top_roll' },
  { value: 'open_top_roll', name: 'Open Toproll', code: 'T4', family: 'top_roll' },
  { value: 'kings_move', name: "King's Move", code: 'KM', family: 'kings_move' },
] as const satisfies readonly { value: string; name: string; code: string | null; family: TechniqueFamily }[]

export type Technique = (typeof TECHNIQUES)[number]['value']

// «Инсайд / аутсайд», а не «внутренний / внешний» — так говорит аудитория (vlad-feedback-2026-09-27.md § 1)
export const STYLE_LABELS: Record<WrestlingStyle, { short: string; badge: string }> = {
  inside: { short: 'инсайд', badge: 'Инсайд-пуллер' },
  outside: { short: 'аутсайд', badge: 'Аутсайд-пуллер' },
  universal: { short: 'универсал', badge: 'Универсал' },
}

const byValue = new Map<string, (typeof TECHNIQUES)[number]>(TECHNIQUES.map((t) => [t.value, t]))
const familyStyle = new Map<string, 'inside' | 'outside'>(TECHNIQUE_FAMILIES.map((f) => [f.value, f.style]))

export function isTechnique(value: unknown): value is Technique {
  return typeof value === 'string' && byValue.has(value)
}

// Имя на сайте: точка — «Hook & Drive», семейство без уточнения — «Hook»
export function getTechniqueLabel(value: Technique): string {
  return byValue.get(value)?.name ?? value
}

// Подпись в админке: код показывает место на пирамиде, «без уточнения» — что точка не выбрана
export function getTechniqueOptionLabel(value: Technique): string {
  const t = byValue.get(value)
  if (!t) return value
  return t.code ? `${t.code} · ${t.name}` : `${t.name} — без уточнения`
}

export function getTechniqueFamily(value: Technique): TechniqueFamily {
  return byValue.get(value)?.family ?? 'hook'
}

export function getTechniqueStyle(value: Technique): 'inside' | 'outside' {
  return familyStyle.get(getTechniqueFamily(value)) ?? 'inside'
}

// Пороги стиля по доле инсайда, % (план athlete-stats-data-model.md § 4.2)
export function getStyleByInsidePercent(insidePercent: number): WrestlingStyle {
  if (insidePercent >= 66) return 'inside'
  if (insidePercent <= 34) return 'outside'
  return 'universal'
}

// Разовый перенос свободного текста «Стиль» в справочник: что не распознали — не угадываем (null).
// Английские имена узнаются сами, русские — по списку. «Боковое давление» и «прямое движение»
// не сопоставляются однозначно с пирамидой — их разбирает Влад (technique-pyramid.md § 3)
const normalize = (text: string) => text.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я]/g, '')

const ALIASES: Record<string, Technique> = {
  ...Object.fromEntries(TECHNIQUES.map((t) => [normalize(t.name), t.value])),
  крюк: 'hook',
  хук: 'hook',
  супинирующийкрюк: 'hook',
  супинация: 'hook',
  кистевойкрюк: 'hook',
  пресс: 'press',
  трицепс: 'press',
  triceps: 'press',
  флоппресс: 'flop_press',
  топролл: 'top_roll',
  верх: 'top_roll',
  отведение: 'top_roll',
  пронация: 'top_roll',
  pronation: 'top_roll',
  кингсмув: 'kings_move',
}

export function techniqueFromText(text: string | null | undefined): Technique | null {
  if (!text) return null
  return ALIASES[normalize(text)] ?? null
}
