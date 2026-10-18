# Развести окружения и бэкап облачных данных

Из ревью 2026-10-18 (пункт 1). Это настройки сервисов, а не кода репозитория, поэтому Claude их не применял:
нужны доступы Danil к Vercel, Turso и Blob. Ниже — что сделать и как проверить.

## Проблема

По памятке импорта EVW и `evw-import.md`, dev и prod ходят в одну базу Turso и одно хранилище Blob.
Любой запуск `dev`, скриптов (`import:evw`, `fix:evw-order`, `seed`) или Preview-деплоя пишет в боевые данные.
`prodMigrations` и `vercel-build` (`payload migrate`) применяют миграции при каждом деплое, в том числе из Preview.
`deploy/backup.sh` бэкапит только файл SQLite и каталог `media` на VPS — Turso и Blob он не видит.

## Шаги (в таком порядке)

1. **Вторая база Turso для Preview/Dev:** `turso db create armreview-dev --group <та же группа>`,
   токен `turso db tokens create armreview-dev`. Один раз залить схему: `DATABASE_URI=libsql://… NODE_ENV=production npm run payload -- migrate`.
2. **Второе хранилище Blob** для Preview (Vercel → Storage → Blob → Create).
3. **Переменные Vercel по окружениям:** `DATABASE_URI`, `DATABASE_AUTH_TOKEN`, `BLOB_READ_WRITE_TOKEN` — для Production свои,
   для Preview и Development свои (одна и та же переменная, разные значения по окружению).
   Проверка: в Preview-деплое `/api/health` не должен видеть данных прода.
4. **Миграции прода — вручную перед выкладкой**, а не на каждый Preview: убрать `payload migrate` из `vercel-build`
   для Preview (или условие `VERCEL_ENV=production`), roadmap C1.
5. **Бэкап Turso:** по расписанию `turso db shell armreview ".dump" > armreview-$(date +%F).sql` (или встроенные
   point-in-time restore Turso — проверить в тарифе), хранить вне Turso и вне Vercel (rclone на тот же склад, что у `backup.sh`).
6. **Бэкап Blob:** список объектов `vercel blob list` + копирование (`rclone`/скрипт по `list()` из `@vercel/blob`).
   Фото EVW восстановимы из `data/evw/photos`, загрузки Влада — нет.
7. **Проверка восстановления:** поднять копию в `armreview-dev` из дампа, открыть сайт. Бэкап без проверки восстановления не считается.
8. **Решение Vercel против VPS** (roadmap C): сейчас в репозитории две схемы выкладки — `deploy/*` (VPS, SQLite, Caddy)
   и Vercel + Turso + Blob. Нужно выбрать одну как боевую, вторую пометить в `DEPLOY.md` как резервную или удалить.
   Для VPS-схемы `X-Client-IP` задаёт Caddy; на Vercel — `x-real-ip` (F1, уже учтено в коде).

## Что проверено в коде

`DATABASE_URI`-охрана в `scripts/import-evw.ts` и `fix-evw-order.ts` останавливает запись в `libsql:` без `NODE_ENV=production`.
Разделение баз из-за этого не заменяется: оно нужно, чтобы случайный запуск вообще не мог дотянуться до прода.
