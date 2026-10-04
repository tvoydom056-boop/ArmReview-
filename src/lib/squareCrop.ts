import type { Area } from 'react-easy-crop'

// Сторона результата не больше 1200px: на сайте фото максимум 600px (размер card), а запрос
// на Vercel ограничен ~4,5 МБ — кадр с телефона без уменьшения упёрся бы в лимит
export const MAX_SIDE = 1200

// Формат сохраняем, если canvas умеет его кодировать; остальное (gif, avif…) — в JPEG
const ENCODABLE = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' } as const
type OutputType = keyof typeof ENCODABLE

export function getOutputFormat(mimeType: string, fileName: string): { type: OutputType; name: string } {
  const type = mimeType in ENCODABLE ? (mimeType as OutputType) : 'image/jpeg'
  return { type, name: fileName.replace(/\.[^.]*$/, '') + ENCODABLE[type] }
}

// Угол в диапазоне −180…180 — для ползунка, по которому крутят и кнопками ±90°
export function normalizeRotation(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180
}

// Габариты картинки после поворота — в этих координатах react-easy-crop отдаёт область обрезки
export function getRotatedSize(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return { width: cos * width + sin * height, height: sin * width + cos * height }
}

// area — croppedAreaPixels из react-easy-crop: пиксели картинки, уже повёрнутой на rotation
export async function cropSquare(src: string, area: Area, rotation: number, type: OutputType): Promise<Blob> {
  const image = await loadImage(src)
  const box = getRotatedSize(image.naturalWidth, image.naturalHeight, rotation)
  const side = Math.min(Math.round(area.width), MAX_SIDE)

  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Браузер не дал canvas для обработки картинки')

  // у JPEG нет прозрачности: пустые углы после поворота стали бы чёрными
  if (type === 'image/jpeg') {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, side, side)
  }
  ctx.imageSmoothingQuality = 'high'
  // Рисуем сразу в итоговый квадрат, без промежуточного canvas размером с повёрнутую картинку
  ctx.scale(side / area.width, side / area.height)
  ctx.translate(box.width / 2 - area.x, box.height / 2 - area.y)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось сохранить картинку'))),
      type,
      0.92,
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Не удалось загрузить картинку'))
    image.src = src
  })
}
