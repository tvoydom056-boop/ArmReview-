#!/usr/bin/env bash
# Ежедневный бэкап SQLite и картинок: локальная копия + выгрузка вне сервера (docs/changes/offsite-backup.md).
# Запускает armreview-backup.timer в 00:00 МСК под пользователем armreview (DEPLOY.md § 5).
# Настройки — /etc/armreview/backup.env:
#   BACKUP_REMOTE    куда выгружать через rclone, например armreview-crypt:daily (обязательно)
#   BACKUP_PING_URL  Healthchecks-совместимый адрес: успех — URL, сбой — URL/fail (необязательно)
# Нужны sqlite3 (.backup даёт согласованную копию работающей базы), rclone, curl.
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/armreview}
DB_PATH=${DB_PATH:-$APP_DIR/armreview.db}
MEDIA_DIR=${MEDIA_DIR:-$APP_DIR/media}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/armreview}
KEEP_DAYS=${KEEP_DAYS:-14}
BACKUP_PING_URL=${BACKUP_PING_URL:-}
# Дата по Москве независимо от пояса сервера — как и расписание таймера
STAMP=$(TZ=Europe/Moscow date +%Y-%m-%d)

ping() {
  [[ -z $BACKUP_PING_URL ]] && return 0
  # Недоступный сервис пингов не должен ронять бэкап; его молчание сам сервис и заметит
  curl -fsS -m 10 --retry 3 -o /dev/null "$BACKUP_PING_URL$1" || echo "backup: пинг $1 не доставлен" >&2
}

# Любой выход с ошибкой (включая незаданную переменную) — пинг «сбой», иначе — «успех»
finish() {
  local code=$?
  if ((code == 0)); then ping ''; else ping /fail; echo "backup: ошибка, код $code" >&2; fi
}
trap finish EXIT

: "${BACKUP_REMOTE:?не задан — см. DEPLOY.md § 5}"

db_copy="$BACKUP_DIR/armreview-$STAMP.db"
media_archive="$BACKUP_DIR/media-$STAMP.tar.gz"

upload() {
  rclone copyto --retries 3 "$1" "$BACKUP_REMOTE/$(basename "$1")"
  echo "backup: выгружен $(basename "$1") ($(du -h "$1" | cut -f1))"
}

# Сначала база: сбой на картинках не должен оставить без внешней копии БД
sqlite3 "$DB_PATH" ".backup '$db_copy'"
integrity=$(sqlite3 "$db_copy" 'PRAGMA integrity_check;')
if [[ $integrity != ok ]]; then
  echo "backup: копия БД не прошла integrity_check: $integrity" >&2
  exit 1
fi
upload "$db_copy"

# БД и media снимаются не одной транзакцией — см. DEPLOY.md § 5
tar -czf "$media_archive" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")"
upload "$media_archive"

# Локально храним KEEP_DAYS дней; вне сервера срок задаёт правило жизненного цикла бакета
find "$BACKUP_DIR" -type f -name 'armreview-*.db' -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'media-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
