// Значения дублируют токены из app/(frontend)/globals.css: themeColor и OG-картинка (satori)
// не читают CSS-переменные. Меняешь токен — поменяй и здесь.
export const themeColors = { light: '#f3f3f5', dark: '#0a0a0c' } as const

// OG-карточка всегда тёмная
export const ogColors = { bg: '#0a0a0c', text: '#f5f5f7', muted: '#8a8d96', gold: '#f5c518' } as const

// Ручной выбор темы: без него тема берётся из системной настройки (prefers-color-scheme)
export const THEME_STORAGE_KEY = 'theme'

// Выполняется браузером при парсинге, до первой отрисовки, чтобы тема не мигала
export const themeInitHtml = `<script>try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}</script>`
