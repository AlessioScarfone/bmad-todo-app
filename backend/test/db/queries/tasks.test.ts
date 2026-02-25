import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from '../../helpers/db.js'
import { getTasks, createTask, completeTask, uncompleteTask, updateTaskTitle } from '../../../src/db/queries/tasks.js'

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

  it('createTask inserts a task and returns it with camelCase fields', async () => {
    const [u] = await ctx.sql`
      INSERT INTO users (email, password_hash) VALUES ('create1@test.com', 'hash') RETURNING id
    `
    const task = await createTask(ctx.sql, u.id, 'My new task')
    expect(task.title).toBe('My new task')
    expect(task.isCompleted).toBe(false)
    expect(task.completedAt).toBeNull()
    expect(task.userId).toBe(u.id)
    expect(typeof task.id).toBe('number')
    // postgres returns native Date objects for timestamp columns at the query layer;
    // ISO string serialization happens when Fastify sends the JSON response.
    expect(task.createdAt instanceof Date || typeof task.createdAt === 'string').toBe(true)
    expect(task.updatedAt instanceof Date || typeof task.updatedAt === 'string').toBe(true)
  })

  it('createTask enforces ownership \u2014 task belongs to specified userId', async () => {
    const [u1] = await ctx.sql`
      INSERT INTO users (email, password_hash) VALUES ('create2@test.com', 'hash') RETURNING id
    `
    const [u2] = await ctx.sql`
      INSERT INTO users (email, password_hash) VALUES ('create3@test.com', 'hash') RETURNING id
    `
    await createTask(ctx.sql, u1.id, 'Task for u1')
    const u2Tasks = await getTasks(ctx.sql, u2.id)
    expect(u2Tasks.every(t => t.title !== 'Task for u1')).toBe(true)
  })
})

describe('completeTask / uncompleteTask queries', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>

  beforeAll(async () => {
    ctx = await createTestDb()
  }, 60_000)

  afterAll(async () => {
    await ctx.sql.end()
    await ctx.container.stop()
  })

  async function createUserAndTask(emailSuffix: string) {
    const [u] = await ctx.sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash) VALUES (${`toggle-${emailSuffix}@test.com`}, 'hash') RETURNING id
    `
    const task = await createTask(ctx.sql, u.id, 'Toggle me')
    return { userId: u.id, task }
  }

  it('completeTask marks task as completed and sets completedAt', async () => {
    const { userId, task } = await createUserAndTask('1')
    const result = await completeTask(ctx.sql, task.id, userId)
    expect(result).toBeDefined()
    expect(result!.isCompleted).toBe(true)
    expect(result!.completedAt).not.toBeNull()
    expect(result!.id).toBe(task.id)
    expect(result!.userId).toBe(userId)
  })

  it('completeTask sets updated_at to a new value', async () => {
    const { userId, task } = await createUserAndTask('2')
    // Small delay so updated_at can differ
    await new Promise(r => setTimeout(r, 10))
    const result = await completeTask(ctx.sql, task.id, userId)
    expect(result).toBeDefined()
    const originalUpdated = new Date(task.updatedAt as string).getTime()
    const newUpdated = new Date(result!.updatedAt as string).getTime()
    expect(newUpdated).toBeGreaterThan(originalUpdated)
  })

  it('completeTask returns undefined when task not found', async () => {
    const { userId } = await createUserAndTask('3')
    const result = await completeTask(ctx.sql, 999_999_999, userId)
    expect(result).toBeUndefined()
  })

  it('completeTask returns undefined when task belongs to another user', async () => {
    const { task } = await createUserAndTask('4')
    const [other] = await ctx.sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash) VALUES ('toggle-4b@test.com', 'hash') RETURNING id
    `
    const result = await completeTask(ctx.sql, task.id, other.id)
    expect(result).toBeUndefined()
  })

  it('uncompleteTask reverts completed task to incomplete and nulls completedAt', async () => {
    const { userId, task } = await createUserAndTask('5')
    await completeTask(ctx.sql, task.id, userId)
    const result = await uncompleteTask(ctx.sql, task.id, userId)
    expect(result).toBeDefined()
    expect(result!.isCompleted).toBe(false)
    expect(result!.completedAt).toBeNull()
  })

  it('uncompleteTask updates updated_at', async () => {
    const { userId, task } = await createUserAndTask('6')
    await completeTask(ctx.sql, task.id, userId)
    await new Promise(r => setTimeout(r, 10))
    const result = await uncompleteTask(ctx.sql, task.id, userId)
    expect(result).toBeDefined()
    const originalUpdated = new Date(task.updatedAt as string).getTime()
    const newUpdated = new Date(result!.updatedAt as string).getTime()
    expect(newUpdated).toBeGreaterThan(originalUpdated)
  })

  it('uncompleteTask returns undefined when task not found', async () => {
    const { userId } = await createUserAndTask('7')
    const result = await uncompleteTask(ctx.sql, 999_999_999, userId)
    expect(result).toBeUndefined()
  })

  it('uncompleteTask returns undefined when task belongs to another user', async () => {
    const { task } = await createUserAndTask('8')
    const [other] = await ctx.sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash) VALUES ('toggle-8b@test.com', 'hash') RETURNING id
    `
    const result = await uncompleteTask(ctx.sql, task.id, other.id)
    expect(result).toBeUndefined()
  })

  it('completeTask returns correct column aliases (camelCase)', async () => {
    const { userId, task } = await createUserAndTask('9')
    const result = await completeTask(ctx.sql, task.id, userId)
    expect(result).toBeDefined()
    expect(typeof result!.id).toBe('number')
    expect(typeof result!.userId).toBe('number')
    expect(typeof result!.title).toBe('string')
    expect(typeof result!.isCompleted).toBe('boolean')
  })
})

describe('updateTaskTitle query', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>

  beforeAll(async () => {
    ctx = await createTestDb()
  }, 60_000)

  afterAll(async () => {
    await ctx.sql.end()
    await ctx.container.stop()
  })

  async function createUserAndTask(emailSuffix: string, title = 'Original title') {
    const [u] = await ctx.sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES (${`update-title-${emailSuffix}@test.com`}, 'hash')
      RETURNING id
    `
    const task = await createTask(ctx.sql, u.id, title)
    return { userId: u.id, task }
  }

  it('returns updated task with new title and updated updatedAt', async () => {
    const { userId, task } = await createUserAndTask('1')
    await new Promise(r => setTimeout(r, 10))
    const result = await updateTaskTitle(ctx.sql, task.id, userId, 'New title')
    expect(result).toBeDefined()
    expect(result!.title).toBe('New title')
    expect(result!.id).toBe(task.id)
    expect(result!.userId).toBe(userId)
    const originalUpdated = new Date(task.updatedAt as string).getTime()
    const newUpdated = new Date(result!.updatedAt as string).getTime()
    expect(newUpdated).toBeGreaterThan(originalUpdated)
  })

  it('returns undefined when taskId does not exist', async () => {
    const { userId } = await createUserAndTask('2')
    const result = await updateTaskTitle(ctx.sql, 999_999_999, userId, 'Does not matter')
    expect(result).toBeUndefined()
  })

  it('returns undefined when task belongs to a different userId (ownership isolation)', async () => {
    const { task } = await createUserAndTask('3')
    const [other] = await ctx.sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash) VALUES ('update-title-3b@test.com', 'hash') RETURNING id
    `
    const result = await updateTaskTitle(ctx.sql, task.id, other.id, 'Attempted steal')
    expect(result).toBeUndefined()
  })

  it('returns correct camelCase column aliases', async () => {
    const { userId, task } = await createUserAndTask('4')
    const result = await updateTaskTitle(ctx.sql, task.id, userId, 'Alias check')
    expect(result).toBeDefined()
    expect(typeof result!.id).toBe('number')
    expect(typeof result!.userId).toBe('number')
    expect(typeof result!.title).toBe('string')
    expect(typeof result!.isCompleted).toBe('boolean')
  })
})
