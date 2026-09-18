#!/usr/bin/env bash
# Ежедневный бэкап базы SQLite и загруженных картинок. Запуск из cron под пользователем armreview:
#   0 4 * * * /opt/armreview/deploy/backup.sh
# Нужен пакет sqlite3 (apt install sqlite3): .backup делает согласованную копию, пока сайт работает.
set -euo pipefail

APP_DIR=/opt/armreview
BACKUP_DIR=/var/backups/armreview
KEEP_DAYS=14
STAMP=$(date +%Y-%m-%d)

mkdir -p "$BACKUP_DIR"
sqlite3 "$APP_DIR/armreview.db" ".backup '$BACKUP_DIR/armreview-$STAMP.db'"
tar -czf "$BACKUP_DIR/media-$STAMP.tar.gz" -C "$APP_DIR" media

find "$BACKUP_DIR" -type f -mtime +"$KEEP_DAYS" -delete
