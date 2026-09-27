# Аудит безопасности — 2026-09-27

**Статус:** находки подтверждены. **S1, S2, S4, S5 исправлены 2026-09-27; S6, S7, S9 — готовы в `Caddyfile.example`, ждут стенда**
(итог — § 5), остальное — план,
ждёт «ок» Danil (AGENTS.md § 8).
**Как проверено:** чтение кода (`src/`, `payload.config.ts`, `deploy/`), сверка с исходниками
`payload@3.90.0` в `node_modules`, `npm audit --omit=dev`, живые запросы к dev-серверу
(`localhost:3001`, локальная БД; в БД ничего не записано — голос слался с заполненным honeypot).
Скрипт: `node scripts/audit-security-http.mjs` (переменная `BASE`, по умолчанию `http://localhost:3001`).
**Не проверено:** production-сборка за Caddy, реальный VPS, Vercel, браузерные сценарии, нагрузка.
Эксплуатационные меры (Caddy, systemd, SSH, бэкапы) — в [ops-readiness.md](ops-readiness.md).

Серьёзность: **К** — критично, **В** — высокая, **С** — средняя, **Н** — низкая, **И** — к сведению.

## 1. Находки

| # | Сер. | Что | Доказательство |
|---|---|---|---|
| S1 | **К** | `next@16.3.5` уязвим к GHSA-vcvr-r3jv-pc5j (CVSS 9.5, RCE в Node `ImageResponse`, затронуты `>=16.2.0 <16.3.6`). Оба `opengraph-image.tsx` — Node runtime. Текст в картинку идёт из админки (`id` проверяется `^\d+$`), поэтому путь атаки — через захваченный аккаунт админа. 30.09 выходит 16.3.7 (ещё 1 критическая) | `package.json`; advisory; `matches/[id]/opengraph-image.tsx:15-18`. **`npm audit` эту уязвимость не показал** |
| S2 | **В** | **Подделка голосов с чужого сайта (CSRF).** `/api/vote` разбирает тело через `request.json()` при любом `Content-Type` и не проверяет `Origin`. Страница-злоумышленник шлёт `fetch(no-cors, text/plain)` — CORS-preflight не нужен, голос уходит с IP посетителя; cookie устройства не приходит → каждый запрос = новое «устройство». Лимиты по `ipHash` не спасают: IP у каждого посетителя свой. 1000 посетителей чужой страницы → до 5000 голосов за матч | `POST /api/vote`, `Content-Type: text/plain`, `Origin: https://evil.example`, `Sec-Fetch-Site: cross-site` → **`200 {"ok":true}` + `Set-Cookie`** (контроль: мусор → `400`) |
| S3 | **В** (до запуска) | Bootstrap первого админа открыт, пока нет пользователей (известно — аудит F7): кто первым откроет `/admin`, станет админом | `GET /api/users/init` → `{"initialized":false}`, `GET /admin` → `200` |
| S4 | **С** | **Обход лимитов через IPv6.** IP хешируется целиком (`clientIp.ts` → `ipHash.ts`). Любой VPS получает IPv6-подсеть `/64` = 2⁶⁴ адресов → каждый адрес даёт ещё 5 «устройств» на матч. Работает, если у домена есть AAAA-запись | код `lib/clientIp.ts:18`, `lib/ipHash.ts:5` |
| S5 | **С** | **Cookie админа без `Secure` и CSRF-список Payload пуст.** Дефолт Payload — `cookies.secure: false`, `Users.ts` не переопределяет: при заходе по `http://` браузер отправит `payload-token` открытым текстом до редиректа (до того, как HSTS запомнится). `csrf: []` → Payload принимает cookie с **любым** `Origin`; держимся только на `SameSite=Lax`, а для него `staging.домен` — тот же сайт | `payload/dist/collections/config/defaults.js` (`secure: false`), `payload/dist/auth/extractJWT.js:21-28` |
| S6 | **С** | **Блокировка админа снаружи.** 5 неверных паролей → аккаунт заблокирован на 10 мин (дефолт Payload), ограничения по IP нет, 2FA нет, `/admin` и `/api/users/login` публичны. Зная почту Влада, можно держать его вне админки бесконечно. Почта может утечь, если совпадёт с `contactEmail` на сайте | дефолты `maxLoginAttempts: 5`, `lockTime: 600000` |
| S7 | **С** | **Нет лимита размера тела.** 30 МБ в `/api/vote` приняты целиком и разобраны (`400` за 204 мс, не `413`). Параллельные запросы по 100+ МБ на VPS 1–2 ГБ → нехватка памяти | проба «30MB body» |
| S8 | **С** | Среда выполнения без патчей: Node 20 (EOL 30.04.2026) локально и в `DEPLOY.md` | `node -v` → v20.19.1 |
| S9 | **Н** | Нет заголовков безопасности в приложении (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`) → админку можно встроить во фрейм (clickjacking). `X-Powered-By: Next.js, Payload` раскрывает стек | `GET /`, `GET /admin` — заголовков нет |
| S10 | **Н** | Публичный REST `/api/matches` отдаёт анониму все поля, включая `notes` (назначение не определено — аудит D) и `score1/score2/winner` | поля ответа `GET /api/matches` |
| S11 | **Н** | `npm audit`: `dompurify ≤3.4.12` (4 moderate, через `monaco-editor` в админке, фикс есть); `esbuild ≤0.24.2` — только dev-инструмент (`drizzle-kit`), на прод не влияет | `npm audit --omit=dev` |
| S12 | **Н** | Каждая страница и OG-картинка рендерятся на каждый запрос (`force-dynamic`, OG — `no-store`, ~50 мс CPU в dev), ограничения частоты нет нигде, кроме голосов → дешёвая перегрузка маленького VPS | OG ×6: 45–78 мс после прогрева, `cache-control: no-cache, no-store` |
| S13 | **И** | Проверка «3 секунды» использует `openedAt` из тела запроса — клиент подставляет любое значение. Так задумано (PROJECT.md § 7), но это не защита | `service.ts:20` |
| S14 | **И** | `PAYLOAD_SECRET` проверяется только на непустоту (`env.ts`); `serverURL` не задан — станет важно при подключении почты (ссылки сброса пароля) | `lib/env.ts:7`, `payload.config.ts` |

## 2. Что проверено и в порядке

| Проверка | Результат |
|---|---|
| Аноним читает `votes` / `users` | `403` |
| Аноним пишет в публичную коллекцию (`POST /api/athletes`) | `403` |
| GraphQL | `404`, отключён |
| SSRF через `/_next/image?url=http://169.254.169.254/…` | `400 "url" parameter is not allowed` |
| Перебор почт через `forgot-password` | одинаковый `200` для несуществующего адреса; письма не уходят (консольный адаптер логирует только адресата и тему) |
| SQL-инъекции | запросы голосования/рейтинга — параметризованный `sql\`\`` drizzle, `sql.raw` нет |
| Подделка IP | Caddy перезаписывает `X-Client-IP`; `x-real-ip` доверяется только при `VERCEL=1` |
| `deviceId` из cookie | проверяется `^[a-f0-9]{32}$`; cookie `HttpOnly`, `SameSite=Lax`, `Secure` в production |
| XSS | `dangerouslySetInnerHTML` один — статичный скрипт темы; поля-источники выводятся текстом, не ссылками |
| Загрузка SVG | Payload 3.90 проверяет содержимое SVG (`script`, `foreignObject`, `javascript:`, сущности) и отдаёт файлы с CSP (`uploads/endpoints/getFile.js:112`) |
| Секреты в git | `.env` и `*.db` не отслеживаются и в истории не встречаются |
| Известные CVE Payload 2026 (SQLi, auth bypass, XSS в админке) | закрыты: у нас 3.90.0 — сам security-релиз от 18.09.2026 |

## 3. План исправлений

| # | Что сделать | Где | Кто | Проверка |
|---|---|---|---|---|
| S1 | `next`, `eslint-config-next` → 16.3.6 сейчас, 16.3.7 — 30.09 | `package.json` | агент | build + открыть OG; CI |
| S2 | В `/api/vote` до разбора тела: `Sec-Fetch-Site` есть и не `same-origin` → `403`; без него `Origin` не совпадает с `Host` → `403`; `Content-Type` не `application/json` → `415`. Чистая функция `lib/sameOrigin.ts` + Vitest | `app/api/vote/route.ts`, `lib/` | агент | T + повтор пробы: ждём `403/415` |
| S3 | Порядок из DEPLOY.md § 3 (админ через SSH-туннель до открытия Caddy) + п. S6 | сервер | Danil | `GET /api/users/init` → `initialized: true` до DNS |
| S4 | Нормализация IP перед хешем: IPv6 → префикс `/64`, `::ffff:a.b.c.d` → IPv4. Чистая функция + Vitest. До запуска старых хешей нет — миграция не нужна | `lib/clientIp.ts` или `lib/ipHash.ts` | агент | T |
| S5 | `Users.auth.cookies.secure` = production; в `payload.config.ts` — `csrf` из `SITE_URL` (`serverURL` — позже, вместе с почтой, S14) | `collections/Users.ts`, `payload.config.ts` | агент | M: `Set-Cookie` с `Secure`; запрос с чужим `Origin` → cookie не принят |
| S6 | Caddy `basic_auth` на `/admin*` и `/api/users*` (отдельные пароли у Влада и Danil) — закрывает перебор, блокировку снаружи и гонку за bootstrap. Почта админа ≠ `contactEmail` | `Caddyfile.example` | агент → Danil | M на стенде: админка работает, без basic-auth → `401` |
| S7 | Caddy: `request_body max_size 10MB` глобально, для `/api/vote` — `16KB` | `Caddyfile.example` | агент | M: 1 МБ в `/api/vote` → `413` |
| S8 | Node 24 — этап 2 ops-плана | — | — | — |
| S9 | Заголовки в Caddy (ops-план § 6.4) + `poweredByHeader: false`; CSP — отдельной задачей (админке Payload нужны inline-стили) | `next.config.mjs`, `Caddyfile.example` | агент | M: `curl -I` |
| S10 | `notes`: `access.read: isAdmin` на поле или удалить поле (решение по аудиту D) | `collections/Matches.ts` + миграция не нужна | агент | M: `GET /api/matches` без `notes` |
| S11 | `npm audit fix` (без `--force`), проверить админку | `package-lock.json` | агент | `npm audit --omit=dev` |
| S12 | Отложено: при реальной нагрузке — кеш OG-картинок (`revalidate` вместо `force-dynamic`) или ограничение частоты в Caddy (нужен сторонний модуль) | — | — | — |
| S14 | `PAYLOAD_SECRET` — минимум 32 символа в `env.ts` | `lib/env.ts` | агент | T/M: старт с коротким секретом падает |

**Порядок:** S1 → S2 → S5 → S4 → S7/S9/S6 (вместе с Caddy из ops-плана) → S10, S11, S14.
S1–S5 — до первого публичного деплоя.

## 4. Открытые вопросы (Danil)

1. ~~S2: жёстко требовать `Origin`?~~ **Закрыт реализацией:** `Origin` сверяется с `Host`, а не с
   `SITE_URL` — так проверка работает в dev на любом порту и на Preview без настройки. Запрос вообще
   без `Sec-Fetch-Site` и `Origin` пропускается: это не браузер, чужой IP он подставить не может,
   а его собственный IP ограничен лимитами (алгоритм Go `net/http.CrossOriginProtection`).
2. ~~S6: basic-auth перед админкой?~~ **Принято 2026-09-27** (по умолчанию): отдельные логины Влада и Danil.
3. S10: что такое `notes` — внутренние заметки или публичный текст? (внутренние → закрыть)
4. ~~S4: IPv6?~~ **Принято 2026-09-27:** нормализуем до `/64`, AAAA-запись оставляем.

## 5. Исправлено 2026-09-27: S1, S2, S4, S5 (+ конфиг S6, S7, S9)

**Изменения:** `next`, `eslint-config-next` 16.3.5 → 16.3.6; новый `src/lib/sameOrigin.ts`
(`checkSameOriginJson`) + `sameOrigin.test.ts`; вызов в начале `POST` в `src/app/api/vote/route.ts`.
Коды `FORBIDDEN` / `UNSUPPORTED_MEDIA_TYPE` в `types/api.ts` не добавлены — свой интерфейс их не
получает (как `SERVER_MISCONFIGURED`). Скрипты `audit-http.mjs` / `audit-voting-http.mjs` шлют JSON
без `Origin` — продолжают работать.

| # | WHEN | THEN | Проверка |
|---|---|---|---|
| 1 | `Sec-Fetch-Site: cross-site` / `same-site` / `none`, даже с JSON | `403 FORBIDDEN`, тело не разбирается | T; HTTP-проба (`same-site` → 403) |
| 2 | без `Sec-Fetch-Site`, `Origin` ≠ `Host` или `Origin: null` | `403` | T; HTTP-проба (`json + чужой Origin` → 403) |
| 3 | `text/plain` с чужого сайта (атака S2) | `403`, cookie не выдаётся | HTTP-проба: `403`, `set-cookie=no` (было `200 {"ok":true}`) |
| 4 | не JSON без `Origin` | `415 UNSUPPORTED_MEDIA_TYPE` | T; HTTP-проба |
| 5 | голос из интерфейса сайта | принимается как раньше | M: браузер, `/matches/6` → `POST /api/vote 200`, «Оценка сохранена» (голос записан в локальную dev-БД) |
| 6 | запрос без `Sec-Fetch-Site` и `Origin` (curl, скрипты аудита) | обрабатывается как раньше | T; HTTP-проба «свой сайт, honeypot» → 200 |
| 7 | OG-картинки после обновления Next | собираются | `npm run build`: маршруты `opengraph-image` в сборке |

Прогон: `npm test` — 46/46 (9 файлов), `npm run lint` — чисто, `npx tsc --noEmit` — 0, `npm run build` — успешно.
Не проверено: production за Caddy (заголовок `Host` Caddy по умолчанию сохраняет — проверить на стенде),
старые браузеры без `Sec-Fetch-Site`. 30.09 — обновление до 16.3.7 (S1, вторая часть).

**S5.** `collections/Users.ts`: `auth.cookies.secure` = `NODE_ENV === 'production'` (`SameSite=Lax`
остаётся дефолтом Payload). `payload.config.ts`: `csrf` = origin из `SITE_URL` только в production;
в dev список пустой, чтобы админка работала на любом порту. `serverURL` не задан: он меняет адрес API
в админке, а нужен только для писем (S14).

| # | WHEN | THEN | Проверка |
|---|---|---|---|
| 8 | production, `SITE_URL=https://armreview.example/` | `csrf = ["https://armreview.example"]`, cookie `{ sameSite: Lax, secure: true }` | вывод итогового конфига Payload после sanitize (скрипт через `tsx`, без БД) |
| 9 | development | `csrf = []`, `secure: false` — как раньше | то же |
| 10 | запрос админки с cookie и чужим `Origin` в production | cookie не принимается (`extractJWT.js:20-24`) | чтение кода Payload; вживую не проверено — нужен вход админа, а агент аккаунты не создаёт |
| 11 | админка в dev | открывается, ошибок в консоли нет | M: `/admin` → «Создание первого пользователя» (локальная БД без пользователей) |

Ограничения: в production без `SITE_URL` список пуст и защита выключена — `SITE_URL` обязателен по
DEPLOY.md § 2. На Vercel Preview админка работает только на адресе из `SITE_URL` этого окружения,
а не на уникальном URL каждого деплоя. Проверить на стенде: вход, сохранение документа, `Set-Cookie`
с `Secure`.

**S4.** `lib/ipHash.ts`: перед хешем IP приводится к ключу лимитов `toRateLimitKey` — IPv4 как есть,
IPv6 → сеть `/64` (любая запись адреса, `[…]`, `%zone`), `::ffff:a.b.c.d` → IPv4. В базе по-прежнему
только хеш; хеш сети выдаёт о человеке меньше, чем хеш адреса. Боевых голосов ещё нет — пересчёт не нужен.
Остаточный риск: провайдер или хостинг, выдающий клиенту `/48` или `/56`, даёт 2¹⁶ / 2⁸ сетей `/64`
для перебора; `/64` — общепринятый компромисс, чтобы не склеивать разных абонентов.

**S6, S7, S9.** `deploy/Caddyfile.example`: `basic_auth` на `/admin*` и `/api/users*` (логины Влада
и Danil, хеши — `caddy hash-password`); `request_body` 16 КБ для `/api/vote`, 10 МБ для остального;
заголовки HSTS (без preload), `nosniff`, `Referrer-Policy`, `X-Frame-Options: SAMEORIGIN`, удаление
`Server` и `X-Powered-By`. `next.config.mjs`: `poweredByHeader: false` — Payload тогда тоже не добавляет
свой `X-Powered-By` (`@payloadcms/next/dist/withPayload/withPayload.js:88-103`); это закрывает и Vercel,
где Caddy нет. Payload заголовок `Authorization: Basic` игнорирует (берёт только `JWT`/`Bearer` —
`auth/extractJWT.js:3-42`), вход в админку с basic-auth не конфликтует. `DEPLOY.md` § 3, § 7 — шаги
и проверки.

| # | WHEN | THEN | Проверка |
|---|---|---|---|
| 12 | два адреса одной `/64` | один `ipHash`; соседняя `/64` — другой | T `ipHash.test.ts` |
| 13 | полная/сжатая запись, `[…]`, `%zone`, встроенный IPv4 | один ключ сети | T |
| 14 | `::ffff:1.2.3.4` и `::ffff:0102:0304` | как `1.2.3.4` | T |
| 15 | голос с IPv6 / IPv4-mapped / zone в `X-Client-IP` | маршрут отвечает `200`, ошибок в логах нет | HTTP-проба на dev, honeypot (без записи) |
| 16 | `GET /`, `GET /admin` | нет `X-Powered-By` | HTTP-проба на dev (было `Next.js, Payload`) |
| 17 | `/admin` без пароля Caddy; тело > 16 КБ в `/api/vote`; `curl -I` | `401`; `413`; заголовки на месте | **не проверено**: Caddy локально не установлен, `caddy validate` не запускался — стенд, DEPLOY.md § 7 |
| 18 | админка за basic-auth: вход, сохранение, `/api/users/me` | работает без повторных запросов пароля | **не проверено** — стенд |

Прогон: `npm test` — 51/51, lint — чисто, `tsc` — 0, `npm run build` — успешно.

## 6. Источники

- GHSA-vcvr-r3jv-pc5j: https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j
- Next.js — анонс релиза 30.09.2026: https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026
- Payload 3.90.0 — security update: https://payloadcms.com/posts/blog/payload-security-update-available-for-3x-and-40
- Payload CVE-2026-34747 / 34748 / 34751: https://github.com/advisories/GHSA-7xxh-373w-35vg, https://github.com/advisories/GHSA-mmxc-95ch-2j7c, https://www.sentinelone.com/vulnerability-database/cve-2026-34751/
- DOMPurify: https://github.com/advisories/GHSA-c2j3-45gr-mqc4
- esbuild dev server: https://github.com/advisories/GHSA-67mh-4wv8-2f99
