import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from '../helpers/db.js'
import { buildServer } from '../../src/server.js'
import bcrypt from 'bcrypt'

describe('Subtask routes', () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>
  let app: ReturnType<typeof buildServer>

  beforeAll(async () => {
    ctx = await createTestDb()
    app = buildServer('test-secret', ctx.sql)
    await app.ready()
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await ctx.sql.end()
    await ctx.container.stop()
  })

  async function registerAndLogin(email: string): Promise<string> {
    const passwordHash = await bcrypt.hash('password123', 12)
    await ctx.sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'password123' },
    })
    const setCookie = loginRes.headers['set-cookie'] as string
    return setCookie.split(';')[0] // extracts "token=..."
  }

  async function createTask(cookie: string, title: string): Promise<number> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { cookie },
      payload: { title },
    })
    return (res.json() as { id: number }).id
  }

  describe('POST /api/tasks/:id/subtasks', () => {
    it('returns 201 with subtask object on success', async () => {
      const cookie = await registerAndLogin('subtask-route-post1@test.com')
      const taskId = await createTask(cookie, 'Parent task')

      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie },
        payload: { title: 'My first subtask' },
      })

      expect(res.statusCode).toBe(201)
      const body = res.json() as {
        id: number
        taskId: number
        title: string
        isCompleted: boolean
        createdAt: string
      }
      expect(body.title).toBe('My first subtask')
      expect(body.isCompleted).toBe(false)
      expect(body.taskId).toBe(taskId)
      expect(body.id).toBeTypeOf('number')
    })

    it('returns 401 without authentication', async () => {
      const cookie = await registerAndLogin('subtask-route-post2@test.com')
      const taskId = await createTask(cookie, 'Task for unauth test')

      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        payload: { title: 'Subtask' },
      })

      expect(res.statusCode).toBe(401)
    })

    it('returns 404 when task belongs to another user (user isolation)', async () => {
      const cookie1 = await registerAndLogin('subtask-route-post3@test.com')
      const cookie2 = await registerAndLogin('subtask-route-post4@test.com')
      const taskId = await createTask(cookie1, 'User1 task')

      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie: cookie2 },
        payload: { title: 'Cross-user subtask' },
      })

      expect(res.statusCode).toBe(404)
    })

    it('returns 400 for blank title', async () => {
      const cookie = await registerAndLogin('subtask-route-post5@test.com')
      const taskId = await createTask(cookie, 'Task for blank title test')

      const res = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie },
        payload: { title: '   ' },
      })

      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /api/tasks/:id/subtasks', () => {
    it('returns 200 with subtask array', async () => {
      const cookie = await registerAndLogin('subtask-route-get1@test.com')
      const taskId = await createTask(cookie, 'Task with subtasks')

      await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie },
        payload: { title: 'Sub A' },
      })
      await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie },
        payload: { title: 'Sub B' },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json() as Array<{ title: string }>
      expect(Array.isArray(body)).toBe(true)
      expect(body).toHaveLength(2)
      expect(body[0].title).toBe('Sub A')
      expect(body[1].title).toBe('Sub B')
    })

    it('returns 401 without authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/tasks/1/subtasks',
      })

      expect(res.statusCode).toBe(401)
    })

    it('returns empty array for another user\'s task (user isolation)', async () => {
      const cookie1 = await registerAndLogin('subtask-route-get2@test.com')
      const cookie2 = await registerAndLogin('subtask-route-get3@test.com')
      const taskId = await createTask(cookie1, 'User1 task with subtasks')

      await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie: cookie1 },
        payload: { title: 'Private subtask' },
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie: cookie2 },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual([])
    })
  })

  describe('PATCH /api/tasks/:id/subtasks/:subId', () => {
    it('returns 200 with updated isCompleted', async () => {
      const cookie = await registerAndLogin('subtask-route-patch1@test.com')
      const taskId = await createTask(cookie, 'Task for patch test')

      const createRes = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie },
        payload: { title: 'Toggle me' },
      })
      const subtask = createRes.json() as { id: number; isCompleted: boolean }

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${taskId}/subtasks/${subtask.id}`,
        headers: { cookie },
        payload: { isCompleted: true },
      })

      expect(res.statusCode).toBe(200)
      const updated = res.json() as { isCompleted: boolean }
      expect(updated.isCompleted).toBe(true)
    })

    it('returns 401 without authentication', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/tasks/1/subtasks/1',
        payload: { isCompleted: true },
      })

      expect(res.statusCode).toBe(401)
    })

    it('returns 404 for cross-user access', async () => {
      const cookie1 = await registerAndLogin('subtask-route-patch2@test.com')
      const cookie2 = await registerAndLogin('subtask-route-patch3@test.com')
      const taskId = await createTask(cookie1, 'User1 task')

      const createRes = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie: cookie1 },
        payload: { title: 'User1 subtask' },
      })
      const subtask = createRes.json() as { id: number }

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/tasks/${taskId}/subtasks/${subtask.id}`,
        headers: { cookie: cookie2 },
        payload: { isCompleted: true },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/tasks/:id/subtasks/:subId', () => {
    it('returns 204 on successful delete', async () => {
      const cookie = await registerAndLogin('subtask-route-delete1@test.com')
      const taskId = await createTask(cookie, 'Task for delete test')

      const createRes = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie },
        payload: { title: 'Delete me' },
      })
      const subtask = createRes.json() as { id: number }

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${taskId}/subtasks/${subtask.id}`,
        headers: { cookie },
      })

      expect(res.statusCode).toBe(204)
    })

    it('returns 401 without authentication', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/tasks/1/subtasks/1',
      })

      expect(res.statusCode).toBe(401)
    })

    it('returns 404 for cross-user delete attempt', async () => {
      const cookie1 = await registerAndLogin('subtask-route-delete2@test.com')
      const cookie2 = await registerAndLogin('subtask-route-delete3@test.com')
      const taskId = await createTask(cookie1, 'User1 task')

      const createRes = await app.inject({
        method: 'POST',
        url: `/api/tasks/${taskId}/subtasks`,
        headers: { cookie: cookie1 },
        payload: { title: 'User1 subtask' },
      })
      const subtask = createRes.json() as { id: number }

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${taskId}/subtasks/${subtask.id}`,
        headers: { cookie: cookie2 },
      })

      expect(res.statusCode).toBe(404)
    })

    it('returns 404 for non-existent subtask', async () => {
      const cookie = await registerAndLogin('subtask-route-delete4@test.com')
      const taskId = await createTask(cookie, 'Task for ghost delete')

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/tasks/${taskId}/subtasks/999999999`,
        headers: { cookie },
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
