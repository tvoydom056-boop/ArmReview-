import { readFile } from 'node:fs/promises'
import path from 'node:path'

// Шрифт Inter (OFL) лежит в репозитории: satori не умеет кириллицу в шрифте по умолчанию,
// а грузить шрифт из сети при каждом превью не нужно
const fontsDir = path.join(process.cwd(), 'src', 'assets', 'fonts')

export async function loadOgFonts() {
  const [latin, cyrillic] = await Promise.all([
    readFile(path.join(fontsDir, 'inter-latin-700-normal.woff')),
    readFile(path.join(fontsDir, 'inter-cyrillic-700-normal.woff')),
  ])
  return [
    { name: 'Inter', data: latin, weight: 700 as const, style: 'normal' as const },
    { name: 'InterCyrillic', data: cyrillic, weight: 700 as const, style: 'normal' as const },
  ]
}
