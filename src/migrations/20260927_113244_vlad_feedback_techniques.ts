import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

import { techniqueFromText } from '../lib/techniques'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`athletes\` ADD \`nickname\` text;`)
  await db.run(sql`ALTER TABLE \`athletes\` ADD \`main_technique\` text;`)
  await db.run(sql`ALTER TABLE \`matches\` ADD \`technique1\` text;`)
  await db.run(sql`ALTER TABLE \`matches\` ADD \`technique2\` text;`)

  // Перенос свободного текста «Стиль» в справочник техник. Нераспознанное не угадываем:
  // старый текст остаётся в архивном поле, Влад разбирает список в админке (вопрос 25)
  const rows = await db.all<{ id: number; name: string; style: string }>(
    sql`SELECT id, name, style FROM athletes WHERE style IS NOT NULL AND style <> ''`,
  )
  const unknown: string[] = []
  for (const row of rows) {
    const technique = techniqueFromText(row.style)
    if (technique) await db.run(sql`UPDATE athletes SET main_technique = ${technique} WHERE id = ${row.id}`)
    else unknown.push(`${row.name}: «${row.style}»`)
  }
  if (unknown.length > 0) payload.logger.warn(`Техника не распознана, заполнить вручную: ${unknown.join('; ')}`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`athletes\` DROP COLUMN \`nickname\`;`)
  await db.run(sql`ALTER TABLE \`athletes\` DROP COLUMN \`main_technique\`;`)
  await db.run(sql`ALTER TABLE \`matches\` DROP COLUMN \`technique1\`;`)
  await db.run(sql`ALTER TABLE \`matches\` DROP COLUMN \`technique2\`;`)
}
