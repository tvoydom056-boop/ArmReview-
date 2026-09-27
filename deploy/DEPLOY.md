# Деплой ArmReview на VPS (Ubuntu 22.04/24.04)

Вариант на Vercel + Turso — в `VERCEL.md`.

Схема: Caddy (HTTPS, порты 80/443) → Next.js на `127.0.0.1:3000` → SQLite-файл в `/var/lib/armreview`.
Docker и отдельная база не нужны. Раскладка — под выкатку с откатом (`deploy/release.sh`, § 6):
```
/opt/armreview/repo.git            зеркало GitHub-репозитория
/opt/armreview/releases/<дата>-<sha>/   код, node_modules, .next — по папке на релиз, 3 последних
/opt/armreview/current -> releases/…    активный релиз; на него смотрит systemd
/opt/armreview/shared/.env         секреты и пути, общие для всех релизов (права 600)
/var/lib/armreview/armreview.db    база, /var/lib/armreview/media — картинки (не зависят от релиза)
```

## 0. Перед началом
- Домен с A-записью на IP сервера.
- Сервер в РФ (иначе 152-ФЗ, см. `/privacy`, `TODO` про подтверждение).
- Заполнен `src/lib/siteConfig.ts` (ФИО оператора, почта) — иначе на сайте останутся заглушки.

## 1. Сервер
```bash
sudo apt update && sudo apt install -y curl sqlite3 ufw debian-keyring debian-archive-keyring apt-transport-https
# Node 24 LTS (см. .nvmrc и engines в package.json; Node 20 без патчей с 30.04.2026)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt install -y nodejs
# Caddy: https://caddyserver.com/docs/install#debian-ubuntu-raspbian
sudo useradd --system --create-home --shell /bin/bash armreview
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

## 2. Приложение
```bash
sudo install -d -o armreview -g armreview /opt/armreview /opt/armreview/releases /opt/armreview/shared
sudo install -d -o armreview -g armreview -m 750 /var/lib/armreview /var/lib/armreview/media
sudo -u armreview git clone --mirror https://github.com/tvoydom056-boop/ArmReview-.git /opt/armreview/repo.git
sudo -u armreview git -C /opt/armreview/repo.git show main:.env.example > /tmp/env.example
sudo install -m 600 -o armreview -g armreview /tmp/env.example /opt/armreview/shared/.env && rm /tmp/env.example
```
В `/opt/armreview/shared/.env` задать (значения генерировать: `openssl rand -hex 32`):
- `PAYLOAD_SECRET` — длинная случайная строка (от 32 символов);
- `IP_HASH_SALT` — другая случайная строка (≥16 символов). **Не менять после запуска**, иначе лимиты по IP «забудут» старые хеши;
- `DATABASE_URI=file:///var/lib/armreview/armreview.db` и `MEDIA_DIR=/var/lib/armreview/media` —
  данные вне папок релизов, иначе они «уедут» при следующей выкатке;
- `SITE_URL=https://ваш-домен` — иначе в OG-превью будут ссылки на localhost.

## 3. Сервис и Caddy
Юнит ставится до первого релиза: `release.sh` сам его запустит и проверит `/api/health`.
```bash
sudo -u armreview git -C /opt/armreview/repo.git show main:deploy/armreview.service | sudo tee /etc/systemd/system/armreview.service > /dev/null
sudo systemctl daemon-reload && sudo systemctl enable armreview
sudo -u armreview git -C /opt/armreview/repo.git show main:deploy/release.sh > /tmp/release.sh
sudo bash /tmp/release.sh main && rm /tmp/release.sh   # первый релиз: код, npm ci, build, миграции (создают таблицы), запуск
cd /opt/armreview/current                              # дальше команды — из активного релиза
```

До открытия Caddy для внешних посетителей создать первого администратора: подключиться
SSH-туннелем `ssh -L 3107:127.0.0.1:3000 пользователь@сервер` и открыть `http://localhost:3107/admin`.
Bootstrap пустой базы доступен без авторизации — нельзя оставлять публичный сайт без первого
администратора. После создания проверить, что повторная регистрация первого пользователя
запрещена. Только после этого:

```bash
caddy hash-password                                      # два раза: для Влада и для себя; пароль вводится в запросе
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile   # заменить example.ru на домен, ХЕШ_ПАРОЛЯ_* на хеши
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```
Проверка: `systemctl status armreview`, `journalctl -u armreview -f`, открыть `https://домен`.

`/admin` и `/api/users*` закрыты паролем Caddy (`basic_auth`) — это второй замок поверх входа
Payload. Через SSH-туннель в production работает только создание первого администратора:
cookie админа принимается лишь с адреса из `SITE_URL` (`csrf` в `payload.config.ts`), поэтому
контент заводить уже через `https://домен/admin`.

## 4. Первый администратор
Первого пользователя создать до публичного доступа, как описано выше (пароль вводите вы сами).
Дальше в админке завести борцов, турнир и матчи. Демо-данные (`npm run seed`) на боевой сервер **не запускать**.

## 5. Бэкапы
Ежедневно в 00:00 МСК (`armreview-backup.timer`): копия БД и `media` — локально на 14 дней и
**вне сервера** — зашифрованно, в S3-хранилище в РФ у другого провайдера, на 30 дней.
Потеря при гибели сервера — до суток. Решения и сценарии — [offsite-backup.md](../docs/changes/offsite-backup.md).

### 5.1 Хранилище (один раз, в кабинете провайдера)
Пример — Yandex Object Storage; у другого S3-провайдера шаги те же.
1. Приватный бакет в регионе РФ. **Провайдер — не тот, где VPS**: иначе одна авария заберёт и сайт, и копии.
2. Включить **версионирование**. Правило жизненного цикла: удалять объекты и устаревшие версии старше 30 дней.
3. Сервисный аккаунт с ролью `storage.uploader` только на этот бакет (загружает и читает, **удалять
   не может**) и статический ключ — он пойдёт на сервер. Для восстановления — отдельный ключ с
   чтением; на сервере его не хранить.

### 5.2 Сервер
```bash
sudo apt install -y sqlite3
sudo -v ; curl https://rclone.org/install.sh | sudo bash   # свежий rclone: в репозитории Ubuntu версия старее
sudo install -d -o armreview -g armreview -m 700 /var/backups/armreview
sudo -u armreview -H rclone config                         # два remote — см. ниже
sudo install -d -m 755 /etc/armreview
sudo install -m 600 -o root -g root deploy/backup.env.example /etc/armreview/backup.env   # вписать BACKUP_PING_URL
```
`rclone config` под `armreview` (файл `~armreview/.config/rclone/rclone.conf`, права 600):
- `armreview-s3` — тип `s3`; для Yandex endpoint `https://storage.yandexcloud.net`, регион `ru-central1`
  ([инструкция Yandex](https://yandex.cloud/ru/docs/storage/tools/rclone)); ключ из 5.1; **`no_check_bucket = true`**
  (ключ не может создавать бакеты);
- `armreview-crypt` — тип `crypt`, remote `armreview-s3:ИМЯ_БАКЕТА/armreview`, пароль и соль сгенерировать.
  **Пароль и соль — сразу в менеджер паролей**: без них копии не расшифровать никому, включая нас.

Мониторинг: в сервисе пингов (Healthchecks.io или свой экземпляр) — проверка с периодом 1 сутки и
запасом 1 ч; её адрес — в `BACKUP_PING_URL`. Нет пинга к 01:00 или пришёл `/fail` — уведомление.

### 5.3 Таймер и первый запуск
Если раньше настраивали cron со строкой `backup.sh` — удалить её: `sudo -u armreview crontab -e`.
```bash
sudo cp deploy/armreview-backup.service deploy/armreview-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start armreview-backup.service       # первый запуск вручную
journalctl -u armreview-backup -n 20                # ждём «выгружен armreview-…db» и «выгружен media-…»
sudo -u armreview -H rclone ls armreview-crypt:daily
sudo systemctl enable --now armreview-backup.timer
systemctl list-timers armreview-backup.timer        # следующий запуск — 00:00 МСК
```
Пути по умолчанию — `/var/lib/armreview/armreview.db` и `/var/lib/armreview/media`; другие задаются
`DB_PATH` / `MEDIA_DIR` в `backup.env`. Скрипт берётся из активного релиза (`/opt/armreview/current/deploy/`). `.backup` даёт согласованную копию работающей базы, но БД и
`media` снимаются не одной транзакцией: в 00:00 не редактировать и не удалять картинки в админке.
Секреты `.env` и пароль `crypt` в бэкап не входят — они в менеджере паролей.

### Проверка восстановления (на отдельном стенде)

1. На машине стенда настроить rclone: `armreview-s3` с ключом **чтения** из 5.1 и `armreview-crypt` с
   паролем и солью из менеджера паролей. Скачать пару за нужную дату:
   `rclone copy armreview-crypt:daily . --include "*-ДАТА.*"`. Развернуть код того же релиза в
   отдельную директорию, без production-токенов и входящего трафика.
2. Скопировать БД под новым именем, выполнить `sqlite3 путь-к-копии.db 'PRAGMA integrity_check;'`
   (ожидается `ok`) и `PRAGMA foreign_key_check;` (пустой результат).
3. Распаковать media только в каталог тестового стенда; задать `DATABASE_URI` на копию и
   `SITE_URL` тестового стенда. Доступные владельцу секреты восстановить из отдельного защищённого
   источника: текущий скрипт `.env` не копирует.
4. Проверить вход администратора, фото, турнир, повторный голос и рейтинг; сохранить дату,
   результат и длительность восстановления. Не переключать DNS/Production в рамках упражнения.

Эти шаги — инструкция, не подтверждение выполненного восстановления VPS.

## 6. Обновление сайта
```bash
sudo bash /opt/armreview/current/deploy/release.sh main
```
Скрипт ([release-rollback.md](../docs/changes/release-rollback.md)): бэкап через
`armreview-backup.service` → код коммита в новую `releases/<дата>-<sha>` → `npm ci` и `build` (сайт всё
это время работает на прежнем релизе) → `payload migrate:status` и `migrate` → атомарное переключение
`current` → перезапуск → ждёт `200` от `/api/health` до 30 с. Не дождался — сам переключает `current`
обратно и перезапускает прежний релиз. Сбой сборки или миграции — `current` не трогается.

**Миграции не откатываются** (в SQLite они без транзакций): после отката кода или упавшей миграции,
если прежний код с базой не работает, — восстановить базу из бэкапа, сделанного в начале этого релиза (§ 5).
Проверять новый набор миграций на восстановленной копии (стенд), dev-сервер на production-БД не запускать.
Схему меняем в два релиза: добавить → перенести данные → удалить старое.

Ручной откат кода на предыдущий релиз, если понадобится после успешной выкатки:
```bash
ls -1 /opt/armreview/releases                                  # выбрать папку
sudo ln -sfn /opt/armreview/releases/ПАПКА /opt/armreview/current.next && sudo mv -Tf /opt/armreview/current.next /opt/armreview/current
sudo systemctl restart armreview && curl -fsS http://127.0.0.1:3000/api/health
```

## 7. Проверка после запуска
- Голосование работает, второй голос с того же устройства обновляет оценку, а не добавляет.
- В `/api/vote` в БД в `ipHash` лежит хеш, не IP; если в логах ошибка про `X-Client-IP` — Caddy настроен без `header_up`.
- `https://домен/opengraph-image` открывается картинкой; `manifest.webmanifest` отдаёт 200.
- Порт 3000 снаружи закрыт: `curl http://IP:3000` не отвечает.
- `curl -I https://домен` — есть `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`;
  нет `Server` и `X-Powered-By`.
- `curl -I https://домен/admin` без пароля Caddy → `401`; с паролем админка открывается, вход и
  сохранение документа работают.
- Тело больше 16 КБ в `/api/vote` → `413`: `head -c 20000 /dev/zero | curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' --data-binary @- https://домен/api/vote`.

## 8. Обновления безопасности
- Источники: Dependabot (alerts + security updates в настройках GitHub), Watch → Security advisories
  у `vercel/next.js` и `payloadcms/payload`, блог Next.js — там анонсы security-релизов за неделю.
  `npm audit` критические уязвимости Next показывает с опозданием — на него одного не полагаться.
- Срок: **critical — до 48 ч, high — до 7 дней**, остальное — с плановыми обновлениями.
- Порядок: обновление в `dev` → CI зелёный → слияние в `main` → выкладка по § 6.

## Юридическое (делает владелец сайта)
Уведомление Роскомнадзора об обработке персональных данных, вычитка `/privacy`, срок хранения данных (`TODO` в тексте политики).
