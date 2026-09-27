import { describe, expect, it } from 'vitest'

import {
  TECHNIQUES,
  getStyleByInsidePercent,
  getTechniqueFamily,
  getTechniqueLabel,
  getTechniqueOptionLabel,
  getTechniqueStyle,
  techniqueFromText,
} from './techniques'

describe('techniqueFromText', () => {
  it('узнаёт старые значения из свободного текста', () => {
    expect(techniqueFromText('Топ-ролл')).toBe('top_roll')
    expect(techniqueFromText('Хук')).toBe('hook')
    expect(techniqueFromText(' супинирующий  КРЮК ')).toBe('hook')
    expect(techniqueFromText('Top roll')).toBe('top_roll')
    expect(techniqueFromText('Трицепс')).toBe('press')
  })

  it('узнаёт имена с пирамиды', () => {
    expect(techniqueFromText('Hook & Drive')).toBe('hook_drive')
    expect(techniqueFromText("King's Move")).toBe('kings_move')
    expect(techniqueFromText('кингсмув')).toBe('kings_move')
    expect(techniqueFromText('Low-hand toproll')).toBe('low_hand_top_roll')
  })

  it('не угадывает незнакомое и неоднозначное', () => {
    expect(techniqueFromText('сила')).toBeNull()
    expect(techniqueFromText('боковое давление')).toBeNull()
    expect(techniqueFromText('')).toBeNull()
    expect(techniqueFromText(null)).toBeNull()
  })
})

describe('пирамида', () => {
  it('13 вариантов: 10 точек и 3 семейства без уточнения', () => {
    expect(TECHNIQUES).toHaveLength(13)
    expect(TECHNIQUES.filter((t) => t.code !== null)).toHaveLength(10)
  })

  it('точка принадлежит семейству, семейство — стилю', () => {
    expect(getTechniqueFamily('hook_drive')).toBe('hook')
    expect(getTechniqueFamily('open_top_roll')).toBe('top_roll')
    expect(getTechniqueStyle('flop_press')).toBe('inside')
    expect(getTechniqueStyle('high_hook')).toBe('inside')
    expect(getTechniqueStyle('posting_top_roll')).toBe('outside')
    expect(getTechniqueStyle('kings_move')).toBe('outside')
  })

  it('на сайте — имя, в админке — код или «без уточнения»', () => {
    expect(getTechniqueLabel('hook_drive')).toBe('Hook & Drive')
    expect(getTechniqueLabel('hook')).toBe('Hook')
    expect(getTechniqueOptionLabel('hook_drive')).toBe('H3 · Hook & Drive')
    expect(getTechniqueOptionLabel('top_roll')).toBe('Toproll — без уточнения')
    expect(getTechniqueOptionLabel('kings_move')).toBe("KM · King's Move")
  })
})

describe('стиль', () => {
  it('пороги 34 / 66', () => {
    expect(getStyleByInsidePercent(34)).toBe('outside')
    expect(getStyleByInsidePercent(35)).toBe('universal')
    expect(getStyleByInsidePercent(65)).toBe('universal')
    expect(getStyleByInsidePercent(66)).toBe('inside')
  })
})
