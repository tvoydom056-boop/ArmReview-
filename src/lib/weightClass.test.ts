import { describe, expect, it } from 'vitest'

import { toWeightClassView, validateWeightClass } from './weightClass'

describe('toWeightClassView', () => {
  it('называет категорию по лимиту', () => {
    expect(toWeightClassView('до 85 кг')).toEqual({ label: 'Полусредний вес', limit: 'до 85 кг' })
    expect(toWeightClassView('до 100 кг')).toEqual({ label: 'Полутяжёлый вес', limit: 'до 100 кг' })
    expect(toWeightClassView('свыше 115 кг')).toEqual({ label: 'Супертяжёлый вес', limit: 'свыше 115 кг' })
    expect(toWeightClassView('до 120 кг')?.label).toBe('Супертяжёлый вес')
  })

  it('границы EVW: 70 / 77 / 85 / 95 / 105 / 115', () => {
    const labels = [70, 77, 85, 95, 105, 115].map((kg) => toWeightClassView(`до ${kg} кг`)?.label)
    expect(labels).toEqual([
      'Полулёгкий вес',
      'Лёгкий вес',
      'Полусредний вес',
      'Средний вес',
      'Полутяжёлый вес',
      'Тяжёлый вес',
    ])
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
