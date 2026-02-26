import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from '../../helpers/db.js'
import {
    createSubtask,
    getSubtasksByTaskId,
    updateSubtask,
    deleteSubtask,
} from '../../../src/db/queries/subtasks.js'
import bcrypt from 'bcrypt'

describe('subtasks query functions', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>

  beforeAll(async () => {
    ctx = await createTestDb()
  }, 60_000)

  afterAll(async () => {
    await ctx.sql.end()
    await ctx.container.stop()
  })

  async function createUser(email: string): Promise<number> {
    const passwordHash = await bcrypt.hash('password123', 12)
    const [user] = await ctx.sql`
      INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})
      RETURNING id
    `
    return user.id as number
  }

  async function createTask(userId: number, title: string): Promise<number> {
    const [task] = await ctx.sql`
      INSERT INTO tasks (user_id, title) VALUES (${userId}, ${title})
      RETURNING id
    `
    return task.id as number
  }

  describe('createSubtask', () => {
    it('inserts a row and returns the subtask', async () => {
      const userId = await createUser('subtask-create1@test.com')
      const taskId = await createTask(userId, 'Parent task')

      const subtask = await createSubtask(ctx.sql, taskId, userId, 'My subtask')

      expect(subtask).toBeDefined()
      expect(subtask!.title).toBe('My subtask')
      expect(subtask!.isCompleted).toBe(false)
      expect(subtask!.taskId).toBe(taskId)
      expect(subtask!.id).toBeTypeOf('number')
      // postgres npm returns Date objects for timestamp columns; Fastify serializes to ISO string
      expect(subtask!.createdAt).toBeTruthy()
    })

    it('returns undefined when task belongs to another user (user isolation)', async () => {
      const userId1 = await createUser('subtask-create2@test.com')
      const userId2 = await createUser('subtask-create3@test.com')
      const taskId = await createTask(userId1, 'User1 task')

      const result = await createSubtask(ctx.sql, taskId, userId2, 'Cross-user subtask')

      expect(result).toBeUndefined()
    })

    it('returns undefined for a non-existent task', async () => {
      const userId = await createUser('subtask-create4@test.com')

      const result = await createSubtask(ctx.sql, 999_999_999, userId, 'Ghost subtask')

      expect(result).toBeUndefined()
    })
  })

  describe('getSubtasksByTaskId', () => {
    it('returns ordered list for the correct user only', async () => {
      const userId = await createUser('subtask-get1@test.com')
      const taskId = await createTask(userId, 'Task for get test')

      await createSubtask(ctx.sql, taskId, userId, 'First subtask')
      await createSubtask(ctx.sql, taskId, userId, 'Second subtask')
      await createSubtask(ctx.sql, taskId, userId, 'Third subtask')

      const subtasks = await getSubtasksByTaskId(ctx.sql, taskId, userId)

      expect(subtasks).toHaveLength(3)
      expect(subtasks[0].title).toBe('First subtask')
      expect(subtasks[1].title).toBe('Second subtask')
      expect(subtasks[2].title).toBe('Third subtask')
    })

    it('returns empty array for another user accessing the same task', async () => {
      const userId1 = await createUser('subtask-get2@test.com')
      const userId2 = await createUser('subtask-get3@test.com')
      const taskId = await createTask(userId1, 'User1 task for isolation')

      await createSubtask(ctx.sql, taskId, userId1, 'User1 subtask')

      const result = await getSubtasksByTaskId(ctx.sql, taskId, userId2)
      expect(result).toEqual([])
    })

    it('returns empty array when task has no subtasks', async () => {
      const userId = await createUser('subtask-get4@test.com')
      const taskId = await createTask(userId, 'Task with no subtasks')

      const result = await getSubtasksByTaskId(ctx.sql, taskId, userId)
      expect(result).toEqual([])
    })
  })

  describe('updateSubtask', () => {
    it('toggles is_completed and returns updated subtask', async () => {
      const userId = await createUser('subtask-update1@test.com')
      const taskId = await createTask(userId, 'Task for update test')
      const subtask = await createSubtask(ctx.sql, taskId, userId, 'Update me')

      const updated = await updateSubtask(ctx.sql, taskId, userId, subtask!.id, true)

      expect(updated).toBeDefined()
      expect(updated!.isCompleted).toBe(true)
      expect(updated!.id).toBe(subtask!.id)
    })

    it('can toggle back to incomplete', async () => {
      const userId = await createUser('subtask-update2@test.com')
      const taskId = await createTask(userId, 'Task for un-complete test')
      const subtask = await createSubtask(ctx.sql, taskId, userId, 'Complete then revert')

      await updateSubtask(ctx.sql, taskId, userId, subtask!.id, true)
      const reverted = await updateSubtask(ctx.sql, taskId, userId, subtask!.id, false)

      expect(reverted!.isCompleted).toBe(false)
    })

    it('returns undefined for cross-user access attempt (user isolation)', async () => {
      const userId1 = await createUser('subtask-update3@test.com')
      const userId2 = await createUser('subtask-update4@test.com')
      const taskId = await createTask(userId1, 'User1 task')
      const subtask = await createSubtask(ctx.sql, taskId, userId1, 'User1 subtask')

      const result = await updateSubtask(ctx.sql, taskId, userId2, subtask!.id, true)

      expect(result).toBeUndefined()
    })
  })

  describe('deleteSubtask', () => {
    it('removes the row and returns { id }', async () => {
      const userId = await createUser('subtask-delete1@test.com')
      const taskId = await createTask(userId, 'Task for delete test')
      const subtask = await createSubtask(ctx.sql, taskId, userId, 'Delete me')

      const deleted = await deleteSubtask(ctx.sql, taskId, userId, subtask!.id)

      expect(deleted).toBeDefined()
      expect(deleted!.id).toBe(subtask!.id)

      // Verify it's actually gone
      const remaining = await getSubtasksByTaskId(ctx.sql, taskId, userId)
      expect(remaining).toEqual([])
    })

    it('returns undefined for cross-user access attempt (user isolation)', async () => {
      const userId1 = await createUser('subtask-delete2@test.com')
      const userId2 = await createUser('subtask-delete3@test.com')
      const taskId = await createTask(userId1, 'User1 task for delete')
      const subtask = await createSubtask(ctx.sql, taskId, userId1, 'User1 subtask')

      const result = await deleteSubtask(ctx.sql, taskId, userId2, subtask!.id)

      expect(result).toBeUndefined()

      // Verify it still exists for the real owner
      const subtasks = await getSubtasksByTaskId(ctx.sql, taskId, userId1)
      expect(subtasks).toHaveLength(1)
    })

    it('returns undefined for non-existent subtask', async () => {
      const userId = await createUser('subtask-delete4@test.com')
      const taskId = await createTask(userId, 'Task for ghost delete test')

      const result = await deleteSubtask(ctx.sql, taskId, userId, 999_999_999)
      expect(result).toBeUndefined()
    })
  })
})
