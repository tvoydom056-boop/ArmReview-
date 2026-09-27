import { describe, expect, it } from 'vitest'

import { toWeightClassView, validateWeightClass } from './weightClass'

describe('toWeightClassView', () => {
  it('называет категорию по лимиту', () => {
    expect(toWeightClassView('до 85 кг')).toEqual({ label: 'Полутяжёлый вес', limit: 'до 85 кг' })
    expect(toWeightClassView('до 100 кг')).toEqual({ label: 'Тяжёлый вес', limit: 'до 100 кг' })
    expect(toWeightClassView('свыше 100 кг')).toEqual({ label: 'Супертяжёлый вес', limit: 'свыше 100 кг' })
    expect(toWeightClassView('до 120 кг')?.label).toBe('Супертяжёлый вес')
  })

  it('старое значение не по формату показывает как есть', () => {
    expect(toWeightClassView('86 кг')).toEqual({ label: '86 кг', limit: null })
  })

  it('пусто — нет категории', () => {
    expect(toWeightClassView(null)).toBeNull()
    expect(toWeightClassView('  ')).toBeNull()
  })
})

describe('validateWeightClass', () => {
  it('пропускает формат и пустое', () => {
    expect(validateWeightClass('до 85 кг')).toBe(true)
    expect(validateWeightClass(' свыше 105 кг ')).toBe(true)
    expect(validateWeightClass(null)).toBe(true)
  })

  it('отклоняет прочее', () => {
    expect(validateWeightClass('86 кг')).toMatch(/Формат/)
    expect(validateWeightClass('до 85кг')).toMatch(/Формат/)
  })
})
