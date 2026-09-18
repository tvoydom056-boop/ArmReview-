# Деплой на Vercel + Turso

Годится как пробный стенд или небольшой сайт. Боевой вариант с полным контролем — VPS (`DEPLOY.md`).
Схема: Vercel (сайт и API) → Turso (база SQLite в облаке) + Vercel Blob (загруженные картинки).

## Что изменено в коде под Vercel
- База: `DATABASE_URI=libsql://…` + `DATABASE_AUTH_TOKEN` (файл SQLite на Vercel не сохраняется).
- Картинки: при наличии `BLOB_READ_WRITE_TOKEN` загружаются в Vercel Blob, иначе (локально, VPS) лежат в `media/`.
- IP зрителя: на Vercel берётся из `x-real-ip` (только при `VERCEL=1`, его выставляет платформа); на VPS — из `X-Client-IP` от Caddy.
- Сборка: скрипт `vercel-build` сначала применяет миграции (`payload migrate`) к Turso, потом `next build`. Vercel запускает его сам.

## 1. Turso (база)
1. Зарегистрироваться на turso.tech, установить CLI (`turso`) или пользоваться веб-панелью.
2. Создать базу: `turso db create armreview` (регион ближе к Vercel/зрителям).
3. Адрес: `turso db show armreview --url` → `libsql://armreview-<аккаунт>.turso.io` — это `DATABASE_URI`.
4. Токен: `turso db tokens create armreview` → это `DATABASE_AUTH_TOKEN`. Никому не показывать и не коммитить.

## 2. Vercel
1. Vercel → Add New → Project → выбрать репозиторий `ArmReview-`, **Production Branch = `main`** (Settings → Git). Разрабатываем в `dev`, на сайт попадает то, что слито в `main`.
2. Framework: Next.js (определится сам). Build/Install Command не менять — Vercel сам возьмёт `vercel-build`.
3. Storage → Create → **Blob**, привязать к проекту. Vercel сам добавит `BLOB_READ_WRITE_TOKEN`.
4. Environment Variables (Production и Preview):

| Ключ | Значение |
|---|---|
| `DATABASE_URI` | `libsql://…turso.io` из шага 1 |
| `DATABASE_AUTH_TOKEN` | токен Turso |
| `PAYLOAD_SECRET` | случайная строка: `openssl rand -hex 32` |
| `IP_HASH_SALT` | другая случайная строка (≥16 символов); после запуска не менять |
| `SITE_URL` | адрес сайта, например `https://armreview.vercel.app` (без слэша в конце) |
| `BLOB_READ_WRITE_TOKEN` | появится сам после подключения Blob |

   `SITE_URL` до первого деплоя неизвестен — впишите ожидаемый адрес `https://<имя-проекта>.vercel.app`, после деплоя проверьте и при необходимости поправьте и сделайте Redeploy.
5. Deploy. Если сборка упала на `payload migrate` — проверьте `DATABASE_URI` и токен (сообщение будет в логе сборки).

## 3. После первого деплоя
- Открыть `https://…/admin`, создать первого администратора (пароль вводите вы сами).
- В админке завести борцов, турнир и матчи. Демо-данные (`npm run seed`) на боевую базу не запускать.
- Проверить: на странице матча голосование работает; картинка борца, загруженная в админке, отображается (она хранится в Vercel Blob).

## Ограничения
- Загрузка файла в админке — не больше ~4,5 МБ (лимит тела запроса Vercel). Фото сжимайте до загрузки.
- Каждое обновление схемы: локально `npx payload migrate:create <название>`, коммит в `dev`, слияние в `main` — миграция применится при сборке.
- Бэкапы: `turso db shell armreview .dump > backup.sql` — скачивайте дамп периодически; point-in-time восстановление есть в платных планах Turso.
- Тариф Vercel Hobby запрещает коммерческое использование — для сайта с монетизацией нужен Pro.
- Требования 152-ФЗ (хранение данных россиян в РФ): серверы Vercel и Turso за рубежом. Для боевого сайта с персональными данными (cookie устройства, хеш IP) выбирайте VPS в РФ (`DEPLOY.md`).
