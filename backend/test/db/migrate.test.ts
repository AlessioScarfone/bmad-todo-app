import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Sql } from 'postgres'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createTestDb } from '../helpers/db.js'

let sql: Sql
let container: StartedPostgreSqlContainer

beforeAll(async () => {
  const db = await createTestDb()
  sql = db.sql
  container = db.container
})

afterAll(async () => {
  await sql?.end()
  await container?.stop()
})

describe('migrate.ts', () => {
  it('creates the _migrations table', async () => {
    const result = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_migrations'
      ) AS exists
    `
    expect(result[0].exists).toBe(true)
  })

  it('records 001_init.sql in _migrations', async () => {
    const result = await sql<{ filename: string }[]>`
      SELECT filename FROM _migrations WHERE filename = '001_init.sql'
    `
    expect(result).toHaveLength(1)
    expect(result[0].filename).toBe('001_init.sql')
  })

  it('creates the users table', async () => {
    const result = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'users'
      ) AS exists
    `
    expect(result[0].exists).toBe(true)
  })

  it('users table has all required columns', async () => {
    const result = await sql<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
    `
    const columns = result.map(r => r.column_name)
    expect(columns).toContain('id')
    expect(columns).toContain('email')
    expect(columns).toContain('password_hash')
    expect(columns).toContain('created_at')
  })

  it('users table does NOT have gamification columns (regression guard)', async () => {
    const result = await sql<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
    `
    const columns = result.map(r => r.column_name)
    expect(columns).not.toContain('points')
    expect(columns).not.toContain('score')
    expect(columns).not.toContain('is_system')
  })

  it('is idempotent — running migrations twice does not fail', async () => {
    // Re-running migrations should skip already-applied files
    const { runMigrations } = await import('../../src/db/migrate.js')
    await expect(runMigrations(sql)).resolves.not.toThrow()

    const result = await sql<{ count: string }[]>`
      SELECT COUNT(*) AS count FROM _migrations WHERE filename = '001_init.sql'
    `
    // Should still be exactly one record (not duplicated)
    expect(parseInt(result[0].count)).toBe(1)
  })
})
