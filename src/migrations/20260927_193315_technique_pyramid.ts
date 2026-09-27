import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// Справочник из 8 техник → пирамида (docs/changes/technique-pyramid.md § 3). Схема не меняется:
// техники хранятся текстом, переписываем значения. Коды заморожены здесь, а не взяты из lib —
// миграция описывает переход между двумя конкретными версиями справочника.
// hook и top_roll остаются как есть — теперь это семейства «без уточнения».
const RENAMED: Record<string, string> = {
  supinated_hook: 'hook',
  wrist_hook: 'hook',
  triceps: 'press',
  pronation: 'top_roll',
}

// Не сопоставляются однозначно (Hook & Drive или Shoulder Press?) — не угадываем: стираем и печатаем
// в лог, заполняет Влад (TODO(вопрос 60))
const AMBIGUOUS: Record<string, string> = {
  side_pressure: 'Боковое давление',
  straight: 'Прямое движение',
}

// Откат — к ближайшему старому коду: точек пирамиды в старом справочнике не было
const ROLLBACK: Record<string, string> = {
  press: 'triceps',
  flop_press: 'triceps',
  shoulder_press: 'triceps',
  hook_drive: 'hook',
  hook_drag: 'hook',
  high_hook: 'hook',
  posting_top_roll: 'top_roll',
  sweeping_top_roll: 'top_roll',
  low_hand_top_roll: 'top_roll',
  open_top_roll: 'top_roll',
  kings_move: 'top_roll',
}

async function remap(db: MigrateUpArgs['db'], map: Record<string, string | null>) {
  for (const [from, to] of Object.entries(map)) {
    await db.run(sql`UPDATE athletes SET main_technique = ${to} WHERE main_technique = ${from}`)
    await db.run(sql`UPDATE matches SET technique1 = ${to} WHERE technique1 = ${from}`)
    await db.run(sql`UPDATE matches SET technique2 = ${to} WHERE technique2 = ${from}`)
  }
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const lost: string[] = []
  for (const [code, label] of Object.entries(AMBIGUOUS)) {
    const athletes = await db.all<{ name: string }>(sql`SELECT name FROM athletes WHERE main_technique = ${code}`)
    const sides = await db.all<{ id: number; side: number }>(
      sql`SELECT id, 1 AS side FROM matches WHERE technique1 = ${code}
          UNION ALL SELECT id, 2 AS side FROM matches WHERE technique2 = ${code}`,
    )
    lost.push(
      ...athletes.map((a) => `${a.name}: «${label}»`),
      ...sides.map((s) => `матч ${s.id}, борец ${s.side}: «${label}»`),
    )
  }

  await remap(db, { ...RENAMED, ...Object.fromEntries(Object.keys(AMBIGUOUS).map((code) => [code, null])) })
  if (lost.length > 0) payload.logger.warn(`Техника не сопоставлена с пирамидой, заполнить вручную: ${lost.join('; ')}`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await remap(db, ROLLBACK)
}
