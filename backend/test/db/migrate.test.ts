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

describe('003_enrichment.sql migration', () => {
  it('records 003_enrichment.sql in _migrations', async () => {
    const result = await sql<{ filename: string }[]>`
      SELECT filename FROM _migrations WHERE filename = '003_enrichment.sql'
    `
    expect(result).toHaveLength(1)
    expect(result[0].filename).toBe('003_enrichment.sql')
  })

  it('creates the labels table', async () => {
    const result = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'labels'
      ) AS exists
    `
    expect(result[0].exists).toBe(true)
  })

  it('creates the task_labels table', async () => {
    const result = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'task_labels'
      ) AS exists
    `
    expect(result[0].exists).toBe(true)
  })

  it('creates the subtasks table', async () => {
    const result = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'subtasks'
      ) AS exists
    `
    expect(result[0].exists).toBe(true)
  })

  it('enforces UNIQUE(user_id, name) constraint on labels', async () => {
    // Insert a test user
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('label-test@test.com', 'hash')
      RETURNING id
    `

    // Insert first label should succeed
    await sql`
      INSERT INTO labels (user_id, name)
      VALUES (${user.id}, 'Backend')
    `

    // Insert duplicate label for same user should fail
    await expect(
      sql`
        INSERT INTO labels (user_id, name)
        VALUES (${user.id}, 'Backend')
      `
    ).rejects.toThrow()
  })

  it('CASCADE deletes task_labels when label is deleted', async () => {
    // Create user and task
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('cascade-test@test.com', 'hash')
      RETURNING id
    `

    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user.id}, 'Test task')
      RETURNING id
    `

    // Create label and attach to task
    const [label] = await sql<{ id: number }[]>`
      INSERT INTO labels (user_id, name)
      VALUES (${user.id}, 'TestLabel')
      RETURNING id
    `

    await sql`
      INSERT INTO task_labels (task_id, label_id)
      VALUES (${task.id}, ${label.id})
    `

    // Verify link exists
    const beforeDelete = await sql`
      SELECT * FROM task_labels
      WHERE task_id = ${task.id} AND label_id = ${label.id}
    `
    expect(beforeDelete).toHaveLength(1)

    // Delete label
    await sql`DELETE FROM labels WHERE id = ${label.id}`

    // Verify task_labels row is gone (CASCADE)
    const afterDelete = await sql`
      SELECT * FROM task_labels
      WHERE task_id = ${task.id} AND label_id = ${label.id}
    `
    expect(afterDelete).toHaveLength(0)
  })
})

