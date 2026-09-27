# Эксплуатационная готовность (DevOps) — план

**Статус:** план, ждёт «ок» Danil. Код в репозитории — после ответа; действия на сервере, в GitHub
и облаке выполняет Danil (агент не деплоит, не создаёт аккаунты и ключи — CLAUDE.md).
**Как получен:** разбор `deploy/*`, `payload.config.ts`, аудита 2026-09-21 и внешних источников
(список в § 9, проверено 2026-09-27).
**Источники внутри проекта:** [PROJECT.md § 8–10](../../../PROJECT.md),
[project-audit.md F4, F7, F8, этап C](project-audit.md), [DEPLOY.md](../../deploy/DEPLOY.md),
[VERCEL.md](../../deploy/VERCEL.md).

Проверка: **CI** — GitHub Actions, **T** — Vitest, **M** — ручная (на стенде или сервере), **—** — не проверяется.

## 0. Что выяснилось при исследовании

| # | Факт | Следствие для плана |
|---|---|---|
| R1 | Установлен `next@16.3.5`. 22.09.2026 вышел внеплановый фикс GHSA-vcvr-r3jv-pc5j (CVSS 9.5): RCE в Node-реализации `ImageResponse` (`next/og`), затронуты `>=16.2.0 <16.3.6`. У нас два `opengraph-image.tsx` на Node runtime | Обновить до 16.3.6 **до любого деплоя**. Прямого пути для анонимного ввода нет (`id` проверяется `^\d+$`, текст — имена из админки), но уязвим сценарий «взломан аккаунт админа» |
| R2 | На **30.09.2026** анонсирован плановый security-релиз Next 16.3.7: 1 critical, 2 high, 5 medium, 1 low. Детали — в день выхода | Окно обновления 30.09–02.10 |
| R3 | С июля 2026 Next выпускает security-релизы регулярно (июль, август, сентябрь) с анонсом за неделю | Нужен процесс обновлений, а не разовый апдейт (этап 1) |
| R4 | `payload@3.90.0` — сам security-релиз от 18.09.2026; CVE-2026 по SQLi/auth bypass (3.79.1) и XSS в админке (3.78.0) закрыты | Payload актуален; все `@payloadcms/*` держать на одной версии |
| R5 | Node 20 — EOL 30.04.2026 (локально стоит v20.19.1). Node 24 — Active LTS, с 20.10.2026 Maintenance, EOL 30.04.2028. Node 22 — Maintenance до 30.04.2027. Node 26 станет LTS 28.10.2026 | Целимся в Node 24 (этап 2) |
| R6 | Документация Payload: `prodMigrations` — «только для долгоживущих серверов»; основной путь — `payload migrate` перед сборкой/запуском. **В SQLite транзакции по умолчанию выключены** | Упавшая посередине миграция может оставить схему наполовину → бэкап перед `migrate` обязателен, откат = восстановление копии (этап 3) |
| R7 | В `sqliteAdapter` WAL по умолчанию выключен (`wal` в конфиге не задан) | Litestream требует WAL, `busy_timeout = 5000` и `wal_autocheckpoint = 0` — это правка конфига БД; поэтому базовый бэкап — `.backup` + внешняя копия, Litestream — отложен (§ 8) |
| R8 | Все страницы и OG матча — `force-dynamic` | Сборка не «запекает» данные из БД → собирать можно отдельно от боевой базы, в т.ч. в CI |
| R9 | `staticDir: 'media'` не резолвится в абсолютный путь (`payload/dist/collections/config/sanitize.js:219`) → относителен `cwd` процесса | При раскладке `releases/` картинки «уедут» вместе с релизом — путь нужно вынести в env (этап 4) |
| R10 | Caddy **не** ставит HSTS сам; access-логи выключены, пока нет директивы `log` | Добавить заголовки; логи оставить выключенными, при включении — `ip_mask` и удаление `Cookie` (этап 6) |
| R11 | `MemoryDenyWriteExecute=true` в systemd ломает JIT V8 — Node падает на старте | В харднинге юнита эту опцию **не** использовать |
| R12 | Next рекомендует reverse proxy для лимитов размера тела, медленных соединений и т.п.; `sharp` на glibc сам ограничивает конкурентность | Лимит тела запроса в Caddy; jemalloc не нужен на старте |
| R13 | rclone поддерживает Yandex Object Storage (`https://storage.yandexcloud.net`, `ru-central1`) и Selectel S3 (rclone ≥ 1.69) | Внешние копии — в S3-хранилище в РФ (152-ФЗ) |

## 1. Цели и границы

**Цели к первому боевому запуску:**
1. Данных теряем не больше, чем за сутки (при потере сервера): бэкап БД и картинок — ежедневно
   в 00:00 МСК (решение Danil 2026-09-27).
2. Релиз и откат — одна проверенная процедура, неудачная сборка не роняет сайт.
3. Критические уязвимости закрываются за ≤ 48 ч, high — за ≤ 7 дней.
4. О падении сайта, бэкапа или заполнении диска узнаём раньше зрителей.

**Не делаем** (PROJECT.md § 8, AGENTS.md § 8): Docker, Kubernetes, отдельный сервер БД, несколько
инстансов, CDN/WAF, CSP для админки Payload (отдельная задача), Redis/очереди.

## 2. Этапы

### Этап 0 — срочно (≈1 ч, до деплоя и до 02.10)

| # | Задача | Кто |
|---|---|---|
| 0.1 | `next` и `eslint-config-next` → `16.3.6`; lint, tsc, test, build; открыть `/opengraph-image` и `/matches/<id>/opengraph-image` | агент → ревью Danil |
| 0.2 | 30.09: прочитать advisories 16.3.7, обновить так же | агент → Danil |
| 0.3 | Закоммитить висящие правки (`VERCEL.md`, `payload-types.ts`, `importMap.js`, новые `docs/`) отдельными коммитами | Danil |

### Этап 1 — CI и обновления зависимостей (≈2 ч)

**Статус 2026-09-27:** 1.1, 1.2, 1.4 сделаны (`.github/workflows/ci.yml`, `.github/dependabot.yml`,
DEPLOY.md § 8). Actions: `checkout@v7`, `setup-node@v7`, `cache@v6` (последние на 2026-09-27).
Dependabot шлёт PR с версиями в `dev`. Шаги CI прогнаны локально в чистом worktree (HEAD + эти файлы,
Node 20): `npm ci`, lint, tsc, 51 тест, `payload migrate` на пустой базе (3 миграции), `build` — всё
зелёное. На GitHub не запускался — нужен push. 1.3 (настройки GitHub) — Danil.

**1.1 `.github/workflows/ci.yml`** — на `pull_request` в `main` и `push` в `dev`/`main`:
1. `checkout`, `setup-node` с `node-version-file: .nvmrc` и `cache: npm`;
2. `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm test`;
3. `npx payload migrate` на **пустой временной SQLite** — ловит миграцию, которая не применяется с нуля;
4. `npm run build` с кешем `.next/cache` (по `node_modules/next/dist/docs/01-app/02-guides/ci-build-caching.md`).

Переменные только фиктивные: `DATABASE_URI=file:./ci.db`, `PAYLOAD_SECRET`/`IP_HASH_SALT` —
случайные строки CI, `SITE_URL=http://localhost:3000`. Боевые секреты в CI не попадают.
Отдельным неблокирующим шагом — `npm audit --omit=dev --audit-level=high` (вопрос 9).
Версии actions — актуальные мажорные на момент написания; дальше их обновляет Dependabot.

**1.2 `.github/dependabot.yml`:**
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    groups:
      payload: { patterns: ["payload", "@payloadcms/*"] }   # версии должны совпадать (R4)
      next-react: { patterns: ["next", "eslint-config-next", "react", "react-dom", "@types/react", "@types/react-dom"] }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: monthly }
```

**1.3 Настройки GitHub (Danil, в интерфейсе):** Dependabot alerts + security updates; защита `main`
(обязателен зелёный `ci`, без прямого push); Watch → Security advisories для `vercel/next.js` и
`payloadcms/payload`.

**1.4 Правило реакции:** critical — ≤ 48 ч, high — ≤ 7 дней, остальное — с плановыми обновлениями.
Записать в `DEPLOY.md`.

### Этап 2 — Node 24 LTS (≈1 ч)

**Статус 2026-09-27:** 2.1, 2.2 сделаны (`.nvmrc` = 24, `engines.node` = `>=24`, `setup_24.x` в DEPLOY.md).
На Node 24 проект ещё не собирался — это покажет первый прогон CI или 2.3. До перехода `npm` на Node 20
печатает предупреждение `EBADENGINE` — работе не мешает.

| # | Задача | Кто |
|---|---|---|
| 2.1 | `.nvmrc` = `24`; `engines.node` → `>=24` | агент |
| 2.2 | `DEPLOY.md`: `setup_20.x` → `setup_24.x` | агент |
| 2.3 | Локально поставить Node 24 (nvm-windows / fnm), прогнать lint/tsc/test/build | Danil |

### Этап 3 — миграции явным шагом (этап C аудита, ≈полдня)

**Статус 2026-09-27:** п. 1, 3, 4 — в `deploy/release.sh` и DEPLOY.md § 6 ([release-rollback.md](release-rollback.md)).
п. 2 (убрать `prodMigrations`) — после проверки чистого bootstrap на стенде.

1. **Порядок релиза:** бэкап → сборка → `payload migrate:status` (записать вывод) → `payload migrate` →
   перезапуск. `prodMigrations` при старте после этого ничего не находит.
2. **Удаление `prodMigrations`** из `payload.config.ts` — отдельным шагом, после проверки чистого
   bootstrap на стенде (аудит C). Для Vercel путь уже явный: `vercel-build` = `payload migrate && build`.
3. **Откат:** из-за R6 — только восстановление бэкапа из шага 1 + предыдущий релиз. `migrate:down` —
   только если проверен на стенде. `migrate:fresh` / `reset` / `refresh` на боевой базе запрещены.
4. **Правило для схемы:** миграции ревьюятся как код; ломающее изменение (переименование, смена
   типа) — в два релиза: добавить → перенести данные → удалить старое.

### Этап 4 — релизы с откатом (≈1 день)

**Статус 2026-09-27:** реализовано — [release-rollback.md](release-rollback.md): раскладка, `MEDIA_DIR`,
`release.sh` + тест в CI, DEPLOY.md § 2, 3, 6. Код берётся из зеркала `repo.git` через `git archive`.
Сборка — на сервере (вопрос 4 — по умолчанию). На сервере не проверено.

**Раскладка на сервере:**
```
/opt/armreview/
  releases/<ГГГГММДД-ЧЧММ>-<sha>/   код, node_modules, .next
  current -> releases/…             на него смотрит systemd
  shared/.env                       права 600
/var/lib/armreview/
  armreview.db                      DATABASE_URI — абсолютный путь (формат для libsql проверить)
  media/                            путь из env (R9)
```

**Правка кода:** `Media.ts` — `staticDir` из переменной окружения (например `MEDIA_DIR`) с дефолтом
`'media'` для разработки. Юнит: `WorkingDirectory=/opt/armreview/current`,
`EnvironmentFile=/opt/armreview/shared/.env`.

**`deploy/release.sh <git-ref>`:**
1. `backup.sh` — при ошибке стоп;
2. код ref → новая папка в `releases/`, `npm ci`, `npm run build` — старый релиз всё это время работает;
3. `payload migrate:status` → `payload migrate`;
4. `ln -sfn` → `current`, `systemctl restart armreview`;
5. smoke: `curl -f http://127.0.0.1:3000/api/health` (этап 7) в течение 30 с, иначе симлинк назад,
   рестарт, сообщение «откат, миграции остались — см. этап 3»;
6. хранить 3 последних релиза.

**Память:** сборка с `--max-old-space-size=8000` на VPS 1–2 ГБ — swap 2–4 ГБ (этап 6) или VPS 4 ГБ.
Альтернатива — собирать в CI и заливать артефакт: возможно благодаря R8, `sharp`/`libsql` совпадут
при Ubuntu x64 и там и там. Сложнее; оставить на потом (вопрос 4).

### Этап 5 — бэкапы и восстановление (≈3 ч + учение)

**Статус 2026-09-27:** п. 1–5 реализованы в репозитории —
[offsite-backup.md](offsite-backup.md) (план, сценарии), `deploy/backup.sh`,
`deploy/armreview-backup.{service,timer}`, `deploy/backup.env.example`, DEPLOY.md § 5. Отличия от
пунктов ниже: копии шифруются `rclone crypt`; ключ Yandex `storage.uploader` может перезаписывать —
от этого защищает версионирование бакета. На сервере не развёрнуто, учение (п. 6) не проводилось.

1. **Хранилище в РФ** (R13): отдельный бакет, ключ **только на запись**; удаление старых копий —
   правилом жизненного цикла бакета (30 дней). Взлом сервера не должен давать удалить бэкапы.
   Точные роли доступа — сверить с документацией провайдера.
2. **`backup.sh`:** после `.backup` — `PRAGMA integrity_check` копии (ожидается `ok`), затем
   `rclone copy` в бакет, затем пинг «бэкап жив» (п. 4).
3. **Частота (решено):** БД и `media` — ежедневно в **00:00 по Москве**. Часовой пояс задаём явно:
   на VPS по умолчанию часто стоит UTC, и «00» превратится в 03:00 МСК. Потеря при гибели сервера —
   до суток. 00:00 МСК — ещё и момент открытия голосования (`votingWindow.ts`), но копия базы
   в сотни КБ занимает миллисекунды, а `busyTimeout: 1000` покрывает редкое пересечение с записью.
4. **systemd timer вместо cron:** `armreview-backup.service` (`Type=oneshot`, `User=armreview`) +
   `.timer` с `OnCalendar=*-*-* 00:00:00 Europe/Moscow` и `Persistent=true` (пропущенный запуск
   догоняется после простоя) + `OnFailure=` → уведомление. Плюс внешний «dead man's switch»: период
   1 сутки, запас 1 ч — нет пинга к 01:00 → тревога (сам пинг ПД не содержит).
5. **Секреты** `.env` в бэкап не входят — хранятся в менеджере паролей Danil.
6. **Учение:** восстановление на стенде по чек-листу DEPLOY.md § 5 до запуска, дальше раз в квартал
   и после любых изменений бэкапа; записывать дату и длительность (RTO).

### Этап 6 — сервер и Caddy (≈2 ч)

**6.1 SSH:** `/etc/ssh/sshd_config.d/00-hardening.conf` — `PasswordAuthentication no`,
`PermitRootLogin no`. Имя `00-` важно: sshd берёт **первое** значение, а у облачных образов бывает
`50-cloud-init.conf` с `PasswordAuthentication yes`. Проверять во второй сессии, не закрывая первую.

**6.2 Обновления ОС:** проверить, что `unattended-upgrades` включён (на Ubuntu Server — по умолчанию);
автоперезагрузка в 05:00, после ночного бэкапа (вопрос 8). `fail2ban` — по желанию при входе по ключам.

**6.3 Ресурсы:** swap 2–4 ГБ; `journald` — `SystemMaxUse=500M`.

**6.4 Caddyfile:** реализовано 2026-09-27 в `deploy/Caddyfile.example` вместе с пунктами S6, S7, S9
[аудита безопасности](security-audit-2026-09.md) (добавлены `basic_auth` на админку и лимит 16 КБ
для `/api/vote`). Ниже — исходное предложение, актуален файл:
```caddy
example.ru {
	encode gzip zstd
	request_body {
		max_size 10MB            # фото из админки; остальное Next не нужно
	}
	header {
		Strict-Transport-Security "max-age=31536000"   # без preload на старте
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		X-Frame-Options SAMEORIGIN
		-Server
	}
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Client-IP {remote_host}
	}
	# Access-логи не включаем (AGENTS.md § 7). Если нужны для отладки:
	# log { format filter { request>remote_ip ip_mask 16 32
	#                       request>client_ip ip_mask 16 32
	#                       request>headers>Cookie delete } }
}
```

**6.5 Харднинг юнита** (R11 — без `MemoryDenyWriteExecute`):
```ini
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/armreview /opt/armreview/releases
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
```
`/opt/armreview/releases` — ради `.next/cache` (оптимизация картинок). Записать оценку
`systemd-analyze security armreview` до и после.

### Этап 7 — мониторинг (≈2 ч)

**Статус 2026-09-27:** п. 1 (`/api/health`) — сделано, [release-rollback.md](release-rollback.md).
п. 2–3 (внешний сервис, тревога по диску) — Danil.

1. **`/api/health`** (код, AGENTS.md § 3: роут → `lib/`): `200 {"ok":true}` после простого запроса
   к БД, `503` при ошибке; `Cache-Control: no-store`; наружу никаких данных.
2. **Внешняя проверка** `/api/health` и главной раз в 1–5 мин, с проверкой срока сертификата;
   уведомление на почту (вопросы 5, 6).
3. **Диск:** таймер раз в час, `df` > 80 % на разделе с `/var/lib/armreview` → `OnFailure` → уведомление.

### Этап 8 — окружения и Vercel (решение Danil)

1. **Стенд на том же VPS:** `armreview-staging.service` на `127.0.0.1:3001`, своя папка, копия БД,
   свой `.env`; в Caddy `staging.домен` за `basic_auth`. По умолчанию остановлен — память. Нужен для
   этапов 3, 4, 5 (репетиция миграций и восстановления).
2. **Vercel:** оставить только как Preview с отдельными ресурсами или удалить (`VERCEL.md`,
   `vercel-build`, `@payloadcms/storage-vercel-blob`, ветка `x-real-ip` в `clientIp.ts`,
   `DATABASE_AUTH_TOKEN`). Удаление — отдельный план (вопрос 7).

### Вне разработки — блокер запуска (F8)

Контакты оператора в `siteConfig.ts`, текст политики под реальный хостинг, уведомление РКН — Влад.

## 3. Сценарии WHEN/THEN (приёмка)

| # | WHEN | THEN | Проверка |
|---|---|---|---|
| 1 | PR в `main` с ошибкой типов, линта или теста | CI красный, слияние заблокировано | CI |
| 2 | PR с миграцией, которая не применяется к пустой БД | CI красный | CI |
| 3 | вышел security-релиз Next/Payload | Dependabot-PR в течение суток; критический влит ≤ 48 ч | M |
| 4 | `release.sh`: сборка упала | `current` не переключён, сайт на старом релизе | M стенд |
| 5 | `release.sh`: миграция упала | сервис не перезапущен; есть бэкап этого релиза, восстановление по инструкции | M стенд |
| 6 | после релиза `/api/health` ≠ 200 30 с | симлинк откатился, сервис перезапущен, сообщение в выводе | M стенд |
| 7 | бэкап в 00:00 не выполнился (остановить таймер) | уведомление к 01:00 | M |
| 7а | `systemctl list-timers armreview-backup.timer` | следующий запуск — 00:00 МСК | M |
| 8 | сервер потерян | новый VPS из внешней копии; потеря ≤ 1 сут данных; RTO записан | M учение |
| 9 | сервис остановлен | уведомление ≤ 5 мин | M |
| 10 | вход по SSH паролем | отказ | M |
| 11 | `curl http://IP:3000` снаружи | нет ответа | M |
| 12 | `curl -I https://домен` | есть HSTS, `nosniff`, нет `Server` | M |
| 13 | загрузка файла > 10 МБ | `413` от Caddy | M |
| 14 | поиск IP в логах Caddy и `journalctl -u armreview` | сырого IP нет | M |
| 15 | загрузка фото и `/_next/image` при `ProtectSystem=strict` | работают | M |
| 16 | `systemd-analyze security armreview` | оценка ниже исходной, записана | M |
| 17 | диск > 80 % | уведомление | M |
| 18 | `/api/health` при недоступной БД | `503`, без деталей ошибки | M |

## 4. Задачи по исполнителям

| Этап | Агент (файлы в репо, после «ок») | Danil (сервер, GitHub, облако) |
|---|---|---|
| 0 | обновление `next` | коммиты, ревью |
| 1 | `ci.yml`, `dependabot.yml`, правило реакции в `DEPLOY.md` | настройки GitHub |
| 2 | `.nvmrc`, `engines`, `DEPLOY.md` | Node 24 локально |
| 3 | порядок релиза в `DEPLOY.md`; позже — удаление `prodMigrations` | проверка bootstrap на стенде |
| 4 | `release.sh`, `MEDIA_DIR` в `Media.ts`, юнит, `DEPLOY.md` | раскладка каталогов, перенос БД/`media` |
| 5 | `backup.sh`, таймеры, `DEPLOY.md` | бакет, ключ, rclone, учение |
| 6 | `Caddyfile.example`, юнит | SSH, swap, journald, обновления ОС |
| 7 | `/api/health` | сервис мониторинга, уведомления |
| 8 | юнит и Caddy для стенда; план удаления Vercel | решение по Vercel |

## 5. Открытые вопросы (решает Danil, в скобках — предложение по умолчанию)

1. Версия Node? (24 LTS)
2. ~~Частота бэкапа БД?~~ **Решено 2026-09-27:** БД и `media` ежедневно в 00:00 МСК.
3. Хранилище копий? (S3 в РФ у **другого** провайдера, не у того, где VPS; Yandex Object Storage или Selectel)
4. Где собирать? (на сервере + swap; сборка в CI — позже)
5. Канал уведомлений? (почта; Telegram в РФ замедлен — PROJECT.md § 3)
6. Сервис внешнего мониторинга? (любой с проверкой из РФ; доступность конкретных сервисов из РФ не проверялась)
7. Vercel? (удалить, если к запуску не используется как стенд)
8. Автоперезагрузка после обновлений ОС? (да, 05:00)
9. `npm audit` в CI блокирующий? (нет, только отчёт; блокирует Dependabot + правило реакции)
10. Стенд на том же VPS? (да, по умолчанию остановлен)

## 6. Порядок

0 → 1 → 2 → 5 → 3 → 4 → 6 → 7 → 8. Этапы 0–2 без риска для данных и дают пользу сразу; 5 раньше
3–4, потому что релизный скрипт опирается на рабочий бэкап. Суммарно ≈ 3–4 рабочих дня.

## 7. Что меняется в документах

- `DEPLOY.md` — раскладка каталогов, `release.sh`, таймеры, SSH, Caddy, правило реакции на CVE.
- `STRUCTURE.md` — `.github/`, `deploy/release.sh`, `/api/health`, `MEDIA_DIR` (AGENTS.md § 8).
- `project-audit.md` — отметить закрытие F7 и этапа C по мере выполнения.

## 8. Отложено осознанно

- **Litestream** (потоковая репликация SQLite в S3, восстановление на момент времени): нужен, если
  потеря до суток голосов станет неприемлемой. Требует `wal: true`, `busyTimeout: 5000`, отключения автосброса WAL (R7) —
  отдельный план со стендом.
- CSP, WAF, CDN, несколько инстансов, zero-downtime без рестарта.

## 9. Внешние источники (проверено 2026-09-27)

- Next.js blog — security-релизы июля–сентября 2026: https://nextjs.org/blog
- GHSA-vcvr-r3jv-pc5j (RCE в `ImageResponse`): https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j
- Анонс релиза 30.09.2026: https://nextjs.org/blog/upcoming-nextjs-security-release-september-2026
- Payload 3.90.0 — security update: https://payloadcms.com/posts/blog/payload-security-update-available-for-3x-and-40
- Payload — миграции, `prodMigrations`: https://payloadcms.com/docs/database/migrations
- Node.js EOL: https://nodejs.org/en/about/eol, https://endoflife.date/nodejs
- Litestream — требования: https://litestream.io/tips/
- Caddy — `log`, `ip_mask`: https://caddyserver.com/docs/caddyfile/directives/log
- Caddy — `header`: https://caddyserver.com/docs/caddyfile/directives/header
- systemd + V8 JIT (`MemoryDenyWriteExecute`): https://zenn.dev/toki_mwc/articles/claude-code-systemd-v8-jit-five-traps?locale=en
- sharp — аллокатор на Linux: https://sharp.pixelplumbing.com/install
- rclone + Yandex Object Storage: https://yandex.cloud/en/docs/storage/tools/rclone
- rclone + Selectel: https://docs.selectel.ru/en/s3/tools/rclone/
- Next — self-hosting и CI-кеш: `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md`, `ci-build-caching.md`
