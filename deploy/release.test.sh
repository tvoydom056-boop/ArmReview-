#!/usr/bin/env bash
# Тест deploy/release.sh: настоящий git (зеркало тестового репозитория), заглушки npm / npx / systemctl /
# curl. Проверяет порядок шагов, симлинк current, откат, очистку старых релизов
# (сценарии docs/changes/release-rollback.md). Запуск: bash deploy/release.test.sh (Linux, WSL, CI).
set -uo pipefail
SCRIPT=$(cd "$(dirname "$0")" && pwd)/release.sh
T=$(mktemp -d)
BIN=$T/bin; mkdir -p "$BIN"
pass=0; fail=0
check() { if eval "$2"; then echo "  PASS $1"; pass=$((pass + 1)); else echo "  FAIL $1"; fail=$((fail + 1)); fi; }

# npm: `ci` и `run build` пишут в лог; NPM_FAIL=build — сборка падает
cat > "$BIN/npm" <<'EOF'
#!/usr/bin/env bash
echo "npm $* @ $(basename "$PWD")" >> "$LOG"
[[ $1 == run && $2 == build && ${NPM_FAIL:-} == build ]] && exit 1
[[ $1 == run && $2 == build ]] && mkdir -p .next && touch .next/BUILD_ID
exit 0
EOF
# npx payload migrate…: MIGRATE_FAIL=1 — миграция падает
cat > "$BIN/npx" <<'EOF'
#!/usr/bin/env bash
echo "npx $* @ $(basename "$PWD")" >> "$LOG"
[[ $* == 'payload migrate' && ${MIGRATE_FAIL:-} == 1 ]] && exit 1
exit 0
EOF
# systemctl: BACKUP_FAIL=1 — бэкап падает
cat > "$BIN/systemctl" <<'EOF'
#!/usr/bin/env bash
echo "systemctl $*" >> "$LOG"
[[ $* == 'start armreview-backup.service' && ${BACKUP_FAIL:-} == 1 ]] && exit 1
exit 0
EOF
# curl на /api/health: «не отвечает», если current указывает на релиз с коммитом BAD_SHA
cat > "$BIN/curl" <<'EOF'
#!/usr/bin/env bash
[[ -n ${BAD_SHA:-} && $(readlink -f "$ARMREVIEW_ROOT/current") == *"-$BAD_SHA" ]] && exit 7
exit 0
EOF
chmod +x "$BIN"/*

# Исходный репозиторий и серверная раскладка: /opt/armreview/{repo.git,releases,shared}
SRC=$T/src; git init -q -b main "$SRC"
commit() { echo "$1" > "$SRC/version.txt"; git -C "$SRC" add -A; git -C "$SRC" -c user.name=t -c user.email=t@t commit -qm "$1"; git -C "$SRC" rev-parse --short HEAD; }
mkdir -p "$SRC/deploy"; echo '{}' > "$SRC/package.json"
v1=$(commit v1)
R=$T/opt; mkdir -p "$R/releases" "$R/shared"; echo 'DATABASE_URI=file:///x' > "$R/shared/.env"
git clone -q --mirror "$SRC" "$R/repo.git"
DB=$T/data/armreview.db

release() { # переменные окружения для сценария, последним — git-ref
  local ref=${*: -1}
  local vars=("${@:1:$#-1}")
  : > "$T/log"
  env PATH="$BIN:$PATH" LOG="$T/log" ARMREVIEW_ROOT="$R" DB_PATH="$DB" HEALTH_WAIT=2 "${vars[@]}" \
    bash "$SCRIPT" "$ref" > "$T/out" 2>&1
  CODE=$?
}
current() { readlink -f "$R/current"; }
count_releases() { find "$R/releases" -mindepth 1 -maxdepth 1 -type d | wc -l; }

echo "1. Первый релиз: базы нет"
release main
check "код 0" "[[ $CODE == 0 ]]"
check "current → релиз с $v1" "[[ \$(current) == *-$v1 ]]"
check "код выгружен из git" "[[ \$(cat \$(current)/version.txt) == v1 ]]"
check ".env — симлинк на shared" "[[ \$(readlink \$(current)/.env) == $R/shared/.env ]]"
check "бэкап пропущен (базы нет)" "! grep -q backup $T/log && grep -q 'бэкап пропущен' $T/out"
check "порядок: ci → build → migrate:status → migrate → restart" "[[ \$(grep -oE 'npm ci|npm run build|payload migrate:status|payload migrate$|payload migrate @|restart armreview' $T/log | tr '\n' ',') == 'npm ci,npm run build,payload migrate:status,payload migrate @,restart armreview,' ]]"
first=$(current)

echo "2. Второй релиз: база есть — сначала бэкап"
mkdir -p "$T/data"; touch "$DB"
sleep 1; v2=$(commit v2); release main
check "код 0" "[[ $CODE == 0 ]]"
check "бэкап до сборки" "[[ \$(grep -nE 'armreview-backup|npm ci' $T/log | head -1) == *armreview-backup* ]]"
check "current → $v2" "[[ \$(current) == *-$v2 ]]"
check "прежний релиз на месте" "[[ -d $first ]]"
second=$(current)

echo "3. Сборка упала"
sleep 1; v3=$(commit v3); release NPM_FAIL=build main
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "current не тронут" "[[ \$(current) == $second ]]"
check "недособранная папка удалена" "! ls $R/releases | grep -q -- -$v3"
check "без миграций и перезапуска" "! grep -qE 'payload migrate|restart' $T/log"

echo "4. Миграция упала"
sleep 1; release MIGRATE_FAIL=1 main
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "current не тронут" "[[ \$(current) == $second ]]"
check "без перезапуска" "! grep -q restart $T/log"
check "подсказка про восстановление базы" "grep -q 'Восстановить из бэкапа' $T/out"

echo "5. Новый релиз не отвечает — откат"
sleep 1; release BAD_SHA=$v3 main
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "current вернулся на прежний" "[[ \$(current) == $second ]]"
check "два перезапуска: новый и прежний" "[[ \$(grep -c 'restart armreview' $T/log) == 2 ]]"
check "сообщение об откате" "grep -q 'откат на' $T/out"

echo "6. Бэкап упал"
sleep 1; v4=$(commit v4); release BACKUP_FAIL=1 main
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "сборки не было" "! grep -q 'npm ci' $T/log"
check "current не тронут" "[[ \$(current) == $second ]]"

echo "7. Несуществующий ref"
release no-such-branch
check "код ≠ 0" "[[ $CODE != 0 ]]"
check "current не тронут" "[[ \$(current) == $second ]]"

echo "8. Очистка: храним 3 последних"
for n in 5 6 7; do sleep 1; commit "v$n" > /dev/null; release main; done
check "код 0" "[[ $CODE == 0 ]]"
check "релизов осталось 3" "[[ \$(count_releases) == 3 ]]"
check "current — самый новый" "[[ \$(current) == \$(find $R/releases -mindepth 1 -maxdepth 1 -type d | sort | tail -1) ]]"

echo; echo "итог: $pass PASS, $fail FAIL"
rm -rf "$T"
exit $((fail > 0))
