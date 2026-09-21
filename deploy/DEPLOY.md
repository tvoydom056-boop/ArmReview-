# Деплой ArmReview на VPS (Ubuntu 22.04/24.04)

Вариант на Vercel + Turso — в `VERCEL.md`.

Схема: Caddy (HTTPS, порты 80/443) → Next.js на `127.0.0.1:3000` → SQLite-файл рядом с приложением.
Docker и отдельная база не нужны.

## 0. Перед началом
- Домен с A-записью на IP сервера.
- Сервер в РФ (иначе 152-ФЗ, см. `/privacy`, `TODO` про подтверждение).
- Заполнен `src/lib/siteConfig.ts` (ФИО оператора, почта) — иначе на сайте останутся заглушки.

## 1. Сервер
```bash
sudo apt update && sudo apt install -y curl sqlite3 ufw debian-keyring debian-archive-keyring apt-transport-https
# Node 20 (см. engines в package.json)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
# Caddy: https://caddyserver.com/docs/install#debian-ubuntu-raspbian
sudo useradd --system --create-home --shell /bin/bash armreview
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

## 2. Приложение
```bash
sudo mkdir -p /opt/armreview && sudo chown armreview: /opt/armreview
sudo -u armreview git clone https://github.com/tvoydom056-boop/ArmReview-.git /opt/armreview
cd /opt/armreview
sudo -u armreview cp .env.example .env && sudo chmod 600 .env
```
В `.env` задать (значения генерировать: `openssl rand -hex 32`):
- `PAYLOAD_SECRET` — длинная случайная строка;
- `IP_HASH_SALT` — другая случайная строка (≥16 символов). **Не менять после запуска**, иначе лимиты по IP «забудут» старые хеши;
- `DATABASE_URI=file:./armreview.db`;
- `SITE_URL=https://ваш-домен` — иначе в OG-превью будут ссылки на localhost.

```bash
sudo -u armreview npm ci
sudo -u armreview npm run build
sudo -u armreview npx payload migrate   # создаёт таблицы (в production схема ставится ТОЛЬКО миграциями)
```

## 3. Сервис и Caddy
До открытия Caddy для внешних посетителей создать первого администратора: запустить сервис,
подключиться SSH-туннелем `ssh -L 3107:127.0.0.1:3000 пользователь@сервер` и открыть
`http://localhost:3107/admin`. Bootstrap пустой базы доступен без авторизации — нельзя оставлять
публичный сайт без первого администратора. После создания проверить, что повторная регистрация
первого пользователя запрещена, затем публиковать Caddy.

```bash
sudo cp deploy/armreview.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now armreview
```

Теперь создать администратора через SSH-туннель, как описано выше. Только после этого:

```bash
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile   # заменить example.ru на домен
sudo systemctl reload caddy
```
Проверка: `systemctl status armreview`, `journalctl -u armreview -f`, открыть `https://домен`.

## 4. Первый администратор
Первого пользователя создать до публичного доступа, как описано выше (пароль вводите вы сами).
Дальше в админке завести борцов, турнир и матчи. Демо-данные (`npm run seed`) на боевой сервер **не запускать**.

## 5. Бэкапы
```bash
sudo install -d -o armreview -g armreview -m 700 /var/backups/armreview
sudo install -d -o armreview -g armreview -m 755 /opt/armreview/media
sudo chmod +x deploy/backup.sh
sudo -u armreview /opt/armreview/deploy/backup.sh  # первый запуск проверить до настройки cron
sudo -u armreview crontab -e     # добавить: 0 4 * * * /opt/armreview/deploy/backup.sh
```
Копии лежат в `/var/backups/armreview` (14 дней). Раз в неделю скачивайте их на свой компьютер: бэкап на том же диске не спасёт при потере сервера. Проверьте восстановление хотя бы один раз.

Скрипт рассчитан на `DATABASE_URI=file:./armreview.db` и локальную `media/`. При другом пути
исправить `APP_DIR`/путь БД до включения cron. `.backup` даёт согласованную SQLite-копию,
но БД и `media` снимаются не одной транзакцией: на время снимка исключить редактирование/удаление
изображений в админке. Ожидаемая потеря при ночном бэкапе — до суток, при еженедельном выносе
копии и потере сервера — до недели. Выбрать приемлемую частоту внешнего копирования явно.

### Проверка восстановления (на отдельном стенде)

1. Взять пару `armreview-ДАТА.db` и `media-ДАТА.tar.gz` из внешнего хранилища; развернуть
   код того же релиза в отдельную директорию, без production-токенов и входящего трафика.
2. Скопировать БД под новым именем, выполнить `sqlite3 путь-к-копии.db 'PRAGMA integrity_check;'`
   (ожидается `ok`) и `PRAGMA foreign_key_check;` (пустой результат).
3. Распаковать media только в каталог тестового стенда; задать `DATABASE_URI` на копию и
   `SITE_URL` тестового стенда. Доступные владельцу секреты восстановить из отдельного защищённого
   источника: текущий скрипт `.env` не копирует.
4. Проверить вход администратора, фото, турнир, повторный голос и рейтинг; сохранить дату,
   результат и длительность восстановления. Не переключать DNS/Production в рамках упражнения.

Эти шаги — инструкция, не подтверждение выполненного восстановления VPS.

## 6. Обновление сайта
До миграций сделать и проверить свежую резервную копию. Проверять новый набор миграций
на восстановленной копии, не запускать dev-сервер на production-БД. Учесть: `prodMigrations`
применяется при инициализации Payload, поэтому сборка/запуск с рабочим `DATABASE_URI` не является
гарантированно читающей операцией. Целевой отдельный шаг миграций — в
[плане аудита](../docs/changes/project-audit.md).

```bash
cd /opt/armreview
sudo -u armreview git pull
sudo -u armreview npm ci
sudo -u armreview npm run build
sudo -u armreview npx payload migrate   # если менялись коллекции (перед этим на разработке: npm run payload migrate:create)
sudo systemctl restart armreview
```

## 7. Проверка после запуска
- Голосование работает, второй голос с того же устройства обновляет оценку, а не добавляет.
- В `/api/vote` в БД в `ipHash` лежит хеш, не IP; если в логах ошибка про `X-Client-IP` — Caddy настроен без `header_up`.
- `https://домен/opengraph-image` открывается картинкой; `manifest.webmanifest` отдаёт 200.
- Порт 3000 снаружи закрыт: `curl http://IP:3000` не отвечает.

## Юридическое (делает владелец сайта)
Уведомление Роскомнадзора об обработке персональных данных, вычитка `/privacy`, срок хранения данных (`TODO` в тексте политики).
