#!/usr/bin/env bash
# Выкатка релиза с откатом (docs/changes/release-rollback.md, DEPLOY.md § 6):
#   sudo bash /opt/armreview/current/deploy/release.sh main        (ветка, тег или коммит)
# Порядок: бэкап → код в новую папку releases/ → npm ci + build (старый релиз всё это время работает) →
# миграции → переключение симлинка current → перезапуск → /api/health. Не ответил — откат на прежний релиз.
set -Eeuo pipefail

ROOT=${ARMREVIEW_ROOT:-/opt/armreview}
APP_USER=${APP_USER:-armreview}
SERVICE=${SERVICE:-armreview}
DB_PATH=${DB_PATH:-/var/lib/armreview/armreview.db}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:3000/api/health}
HEALTH_WAIT=${HEALTH_WAIT:-30}
KEEP_RELEASES=${KEEP_RELEASES:-3}

log() { echo "release: $*"; }
# Сборка и миграции — от пользователя приложения; systemctl — от root
as_app() { if ((EUID == 0)); then runuser -u "$APP_USER" -- "$@"; else "$@"; fi; }

healthy() {
  local i
  for ((i = 0; i < HEALTH_WAIT; i++)); do
    curl -fsS -m 2 -o /dev/null "$HEALTH_URL" && return 0
    sleep 1
  done
  return 1
}

switch_to() { # атомарно: новый симлинк рядом, затем rename поверх current
  ln -sfn "$1" "$ROOT/current.next"
  mv -Tf "$ROOT/current.next" "$ROOT/current"
}

# Сбой до переключения: сайт остаётся на прежнем релизе, недособранную папку убираем
phase=prepare
new=''
on_exit() {
  local code=$?
  ((code == 0)) && return
  if [[ $phase != switched && -n $new && -d $new ]]; then
    rm -rf "$new"
    log "сбой на шаге «$phase», $new удалён; сайт работает на прежнем релизе"
  fi
  if [[ $phase == migrate ]]; then
    log "миграция упала: в SQLite она не откатывается сама — база может быть изменена наполовину."
    log "Восстановить из бэкапа, сделанного в начале этого релиза (DEPLOY.md § 5)."
  fi
}
trap on_exit EXIT

ref=${1:?укажите git-ref: release.sh main}
prev=''
[[ -L $ROOT/current ]] && prev=$(readlink -f "$ROOT/current")

phase=fetch
as_app git -C "$ROOT/repo.git" fetch --prune --quiet origin
sha=$(as_app git -C "$ROOT/repo.git" rev-parse --short "$ref^{commit}")
log "релиз $ref ($sha), сейчас работает ${prev:-ничего}"

# Бэкап до любых действий с базой (миграции, а в production и сборка — prodMigrations)
phase=backup
if [[ -f $DB_PATH ]]; then
  systemctl start armreview-backup.service
  log "бэкап сделан"
else
  log "базы ещё нет ($DB_PATH) — первый запуск, бэкап пропущен"
fi

phase=build
new="$ROOT/releases/$(TZ=Europe/Moscow date +%Y%m%d-%H%M%S)-$sha"
as_app mkdir "$new"
as_app git -C "$ROOT/repo.git" archive "$sha" | as_app tar -x -C "$new"
as_app ln -s "$ROOT/shared/.env" "$new/.env"
cd "$new"
as_app npm ci --no-audit --no-fund
as_app npm run build

phase=migrate
as_app npx payload migrate:status
as_app npx payload migrate

switch_to "$new"
phase=switched
# Ошибка перезапуска не должна оборвать скрипт с current на новом релизе — решает проверка ниже
systemctl restart "$SERVICE" || log "systemctl restart вернул ошибку — проверяем $HEALTH_URL"

if ! healthy; then
  if [[ -z $prev ]]; then
    log "новый релиз не отвечает на $HEALTH_URL, откатываться не на что: journalctl -u $SERVICE"
    exit 1
  fi
  log "новый релиз не отвечает на $HEALTH_URL — откат на $prev"
  switch_to "$prev"
  systemctl restart "$SERVICE" || true
  healthy && log "прежний релиз отвечает" || log "прежний релиз тоже не отвечает: journalctl -u $SERVICE"
  log "миграции нового релиза остались в базе; если прежний код с ними не работает — восстановить базу из бэкапа (DEPLOY.md § 5)"
  exit 1
fi
log "готово: $new отвечает"

# Храним KEEP_RELEASES последних папок (имена начинаются с даты — сортируются по времени);
# текущий и прежний релизы не удаляются никогда
current=$(readlink -f "$ROOT/current")
mapfile -t old < <(find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +$((KEEP_RELEASES + 1)))
for dir in "${old[@]}"; do
  [[ $dir == "$current" || $dir == "$prev" ]] && continue
  rm -rf "$dir"
  log "удалён старый релиз $dir"
done
