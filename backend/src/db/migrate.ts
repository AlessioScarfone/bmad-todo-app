import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type { Sql } from 'postgres'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export async function runMigrations(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    const [existing] = await sql`SELECT id FROM _migrations WHERE filename = ${file}`
    if (existing) continue

    const content = await readFile(path.join(migrationsDir, file), 'utf-8')
    await sql.unsafe(content)
    await sql`INSERT INTO _migrations (filename) VALUES (${file})`
    console.log(`Applied migration: ${file}`)
  }
}
