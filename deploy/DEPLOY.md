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
```bash
sudo cp deploy/armreview.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now armreview
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile   # заменить example.ru на домен
sudo systemctl reload caddy
```
Проверка: `systemctl status armreview`, `journalctl -u armreview -f`, открыть `https://домен`.

## 4. Первый администратор
Открыть `https://домен/admin` и создать пользователя в форме (пароль вводите вы сами). Дальше в админке завести борцов, турнир и матчи. Демо-данные (`npm run seed`) на боевой сервер **не запускать**.

## 5. Бэкапы
```bash
sudo chmod +x deploy/backup.sh
sudo -u armreview crontab -e     # добавить: 0 4 * * * /opt/armreview/deploy/backup.sh
```
Копии лежат в `/var/backups/armreview` (14 дней). Раз в неделю скачивайте их на свой компьютер: бэкап на том же диске не спасёт при потере сервера. Проверьте восстановление хотя бы один раз.

## 6. Обновление сайта
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
