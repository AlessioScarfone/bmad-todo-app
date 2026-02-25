import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from '../../helpers/db.js'
import { getTasks } from '../../../src/db/queries/tasks.js'

describe('tasks schema + query', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>

  beforeAll(async () => {
    ctx = await createTestDb()
  }, 60_000)

  afterAll(async () => {
    await ctx.sql.end()
    await ctx.container.stop()
  })

  it('tasks table has exactly the expected columns (AC4 / QA-5)', async () => {
    const columns = await ctx.sql<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tasks'
      ORDER BY ordinal_position
    `
    const names = columns.map((c: { column_name: string }) => c.column_name)
    expect(names).toEqual(
      expect.arrayContaining(['id', 'user_id', 'title', 'is_completed', 'completed_at', 'deadline', 'created_at', 'updated_at'])
    )
    // QA-5 explicit: no stale/gamification columns
    expect(names).not.toContain('points')
    expect(names).not.toContain('is_system')
    expect(names).toHaveLength(8) // exactly 8 columns — no extras
  })

  it('required indexes exist', async () => {
    const indexes = await ctx.sql<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'tasks'
    `
    const names = indexes.map((i: { indexname: string }) => i.indexname)
    expect(names).toContain('idx_tasks_user_id')
    expect(names).toContain('idx_tasks_completed')
    expect(names).toContain('idx_tasks_deadline')

    const completedIndex = indexes.find((index: { indexname: string }) => index.indexname === 'idx_tasks_completed')
    expect(completedIndex?.indexdef).toContain('WHERE (is_completed = true)')
  })

  it('getTasks returns only tasks for the given user', async () => {
    // Insert two users
    const [u1] = await ctx.sql`
      INSERT INTO users (email, password_hash) VALUES ('a@test.com', 'hash1') RETURNING id
    `
    const [u2] = await ctx.sql`
      INSERT INTO users (email, password_hash) VALUES ('b@test.com', 'hash2') RETURNING id
    `
    // Insert tasks for each user
    await ctx.sql`INSERT INTO tasks (user_id, title) VALUES (${u1.id}, 'Task for User 1')`
    await ctx.sql`INSERT INTO tasks (user_id, title) VALUES (${u2.id}, 'Task for User 2')`

    const u1Tasks = await getTasks(ctx.sql, u1.id)
    expect(u1Tasks).toHaveLength(1)
    expect(u1Tasks[0].title).toBe('Task for User 1')
    expect(u1Tasks[0].userId).toBe(u1.id)
  })

  it('getTasks returns empty array when user has no tasks', async () => {
    const [u3] = await ctx.sql`
      INSERT INTO users (email, password_hash) VALUES ('c@test.com', 'hash3') RETURNING id
    `
    const tasks = await getTasks(ctx.sql, u3.id)
    expect(tasks).toEqual([])
  })
})
