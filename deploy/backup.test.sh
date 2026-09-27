#!/usr/bin/env bash
# Тест deploy/backup.sh на заглушках sqlite3 / rclone / curl: ход скрипта, коды выхода, выгрузка,
# пинги, очистка (сценарии docs/changes/offsite-backup.md). Нужны только bash и coreutils/tar:
# запускается в CI и локально (Linux, WSL): bash deploy/backup.test.sh
set -uo pipefail
SCRIPT=$(cd "$(dirname "$0")" && pwd)/backup.sh
ROOT=$(mktemp -d)
BIN=$ROOT/bin; mkdir -p "$BIN"
pass=0; fail=0
check() { if eval "$2"; then echo "  PASS $1"; pass=$((pass+1)); else echo "  FAIL $1"; fail=$((fail+1)); fi; }

# sqlite3: ".backup 'dst'" копирует файл; PRAGMA integrity_check → $SQLITE_INTEGRITY (по умолчанию ok)
cat > "$BIN/sqlite3" <<'EOF'
#!/usr/bin/env bash
if [[ $2 == .backup* ]]; then dst=${2#.backup \'}; dst=${dst%\'}; cp "$1" "$dst"; exit $?; fi
if [[ $2 == 'PRAGMA integrity_check;' ]]; then echo "${SQLITE_INTEGRITY:-ok}"; exit 0; fi
exit 1
EOF
# rclone copyto src remote:path → копия в $REMOTE_DIR/path; RCLONE_FAIL=1 — ошибка сети
cat > "$BIN/rclone" <<'EOF'
#!/usr/bin/env bash
[[ ${RCLONE_FAIL:-0} == 1 ]] && { echo "rclone: сеть недоступна" >&2; exit 1; }
src=${@: -2:1}; dst=${@: -1}; rel=${dst#*:}
mkdir -p "$REMOTE_DIR/$(dirname "$rel")"; cp "$src" "$REMOTE_DIR/$rel"
EOF
# curl: записываем адрес пинга
cat > "$BIN/curl" <<'EOF'
#!/usr/bin/env bash
echo "${@: -1}" >> "$PING_LOG"
EOF
chmod +x "$BIN"/*

run() { # $1 — имя сценария, дальше — переменные окружения
  local name=$1; shift
  CASE=$ROOT/$name; mkdir -p "$CASE/app/media" "$CASE/backups" "$CASE/remote"
  echo "fake-db" > "$CASE/app/armreview.db"; echo "photo" > "$CASE/app/media/a.jpg"
  : > "$CASE/pings"
  env -i PATH="$BIN:/usr/bin:/bin" HOME="$CASE" DATA_DIR="$CASE/app" BACKUP_DIR="$CASE/backups" \
    REMOTE_DIR="$CASE/remote" PING_LOG="$CASE/pings" "$@" \
    bash "$SCRIPT" > "$CASE/out" 2>&1
  CODE=$?
}
today=$(TZ=Europe/Moscow date +%Y-%m-%d)

echo "1. Успех"
run ok BACKUP_REMOTE=crypt:daily BACKUP_PING_URL=https://hc.example/abc
check "код 0" "[[ $CODE == 0 ]]"
check "локально БД и media за $today" "[[ -f $CASE/backups/armreview-$today.db && -f $CASE/backups/media-$today.tar.gz ]]"
check "выгружены в remote:daily" "[[ -f $CASE/remote/daily/armreview-$today.db && -f $CASE/remote/daily/media-$today.tar.gz ]]"
check "архив media содержит a.jpg" "tar -tzf $CASE/remote/daily/media-$today.tar.gz | grep -q 'media/a.jpg'"
check "пинг успеха (без /fail)" "[[ \$(cat $CASE/pings) == https://hc.example/abc ]]"

echo "2. Битая копия БД"
run corrupt BACKUP_REMOTE=crypt:daily BACKUP_PING_URL=https://hc.example/abc SQLITE_INTEGRITY='*** page 3: btree corrupt'
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "ничего не выгружено" "[[ -z \$(ls -A $CASE/remote) ]]"
check "пинг /fail" "[[ \$(cat $CASE/pings) == https://hc.example/abc/fail ]]"
check "причина в выводе" "grep -q integrity_check $CASE/out"

echo "3. Выгрузка упала"
run upload BACKUP_REMOTE=crypt:daily BACKUP_PING_URL=https://hc.example/abc RCLONE_FAIL=1
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "локальная копия осталась" "[[ -f $CASE/backups/armreview-$today.db ]]"
check "пинг /fail" "[[ \$(cat $CASE/pings) == https://hc.example/abc/fail ]]"

echo "4. Нет каталога media — БД уже выгружена"
run nomedia BACKUP_REMOTE=crypt:daily BACKUP_PING_URL=https://hc.example/abc MEDIA_DIR=/nonexistent/media
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "БД выгружена до сбоя" "[[ -f $CASE/remote/daily/armreview-$today.db ]]"
check "пинг /fail" "[[ \$(cat $CASE/pings) == https://hc.example/abc/fail ]]"

echo "5. BACKUP_REMOTE не задан"
run noremote BACKUP_PING_URL=https://hc.example/abc
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "копия не делалась" "[[ -z \$(ls -A $CASE/backups) ]]"
check "пинг /fail" "[[ \$(cat $CASE/pings) == https://hc.example/abc/fail ]]"
check "понятное сообщение" "grep -q 'BACKUP_REMOTE' $CASE/out"

echo "6. Без BACKUP_PING_URL"
run noping BACKUP_REMOTE=crypt:daily
check "код 0" "[[ $CODE == 0 ]]"
check "пингов нет" "[[ ! -s $CASE/pings ]]"

echo "12. Локальная очистка старше KEEP_DAYS"
OLD=$ROOT/cleanup/backups; mkdir -p "$OLD"
touch -d '20 days ago' "$OLD/armreview-2000-01-01.db" "$OLD/media-2000-01-01.tar.gz" "$OLD/other.txt"
run cleanup_run BACKUP_REMOTE=crypt:daily BACKUP_DIR="$OLD"
check "код 0" "[[ $CODE == 0 ]]"
check "старые копии удалены" "[[ ! -e $OLD/armreview-2000-01-01.db && ! -e $OLD/media-2000-01-01.tar.gz ]]"
check "чужие файлы не тронуты" "[[ -e $OLD/other.txt ]]"
check "свежие копии на месте" "[[ -f $OLD/armreview-$today.db ]]"

echo; echo "итог: $pass PASS, $fail FAIL"
rm -rf "$ROOT"
exit $((fail > 0))
