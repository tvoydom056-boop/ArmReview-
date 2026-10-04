import { describe, expect, it } from 'vitest'

import { getOutputFormat, getRotatedSize, normalizeRotation } from './squareCrop'

describe('getOutputFormat', () => {
  it('сохраняет формат, который умеет canvas', () => {
    expect(getOutputFormat('image/png', 'ermes.png')).toEqual({ type: 'image/png', name: 'ermes.png' })
    expect(getOutputFormat('image/webp', 'a.b.webp')).toEqual({ type: 'image/webp', name: 'a.b.webp' })
    expect(getOutputFormat('image/jpeg', 'IMG_1.jpeg')).toEqual({ type: 'image/jpeg', name: 'IMG_1.jpg' })
  })

  it('остальное переводит в JPEG и меняет расширение', () => {
    expect(getOutputFormat('image/gif', 'anim.gif')).toEqual({ type: 'image/jpeg', name: 'anim.jpg' })
    expect(getOutputFormat('image/avif', 'photo')).toEqual({ type: 'image/jpeg', name: 'photo.jpg' })
  })
})

describe('normalizeRotation', () => {
  it('держит угол в −180…180', () => {
    expect(normalizeRotation(0)).toBe(0)
    expect(normalizeRotation(90)).toBe(90)
    expect(normalizeRotation(270)).toBe(-90)
    expect(normalizeRotation(-270)).toBe(90)
    expect(normalizeRotation(180)).toBe(-180)
    expect(normalizeRotation(450)).toBe(90)
  })
})

describe('getRotatedSize', () => {
  it('на 90° меняет стороны местами', () => {
    const size = getRotatedSize(800, 1000, 90)
    expect(size.width).toBeCloseTo(1000)
    expect(size.height).toBeCloseTo(800)
  })

  it('на 45° даёт описанный квадрат', () => {
    const size = getRotatedSize(100, 100, 45)
    expect(size.width).toBeCloseTo(100 * Math.SQRT2)
    expect(size.height).toBeCloseTo(100 * Math.SQRT2)
  })

  it('без поворота не меняет размер', () => {
    expect(getRotatedSize(288, 300, 0)).toEqual({ width: 288, height: 300 })
  })
})
