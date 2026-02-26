import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from '../helpers/db.js'
import { buildServer } from '../../src/server.js'
import bcrypt from 'bcrypt'

describe('GET /api/tasks', () => {
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

  async function registerAndLogin(email: string) {
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

  describe('GET /api/tasks labels regression (Story 3.1)', () => {
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

    async function registerAndLogin(email: string) {
      const passwordHash = await bcrypt.hash('password123', 12)
      await ctx.sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email, password: 'password123' },
      })
      const setCookie = loginRes.headers['set-cookie'] as string
      return setCookie.split(';')[0]
    }

    it('includes labels: [] for tasks without labels', async () => {
      const cookie = await registerAndLogin('tasks-labels-empty@test.com')

      await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: { cookie },
        payload: { title: 'No labels yet' },
      })

      const res = await app.inject({ method: 'GET', url: '/api/tasks', headers: { cookie } })
      expect(res.statusCode).toBe(200)

      const tasks = res.json() as Array<{ title: string; labels: Array<{ id: number; name: string }> }>
      expect(tasks[0].title).toBe('No labels yet')
      expect(tasks[0].labels).toEqual([])
    })

    it('includes attached labels in the labels array', async () => {
      const cookie = await registerAndLogin('tasks-labels-attached@test.com')

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        headers: { cookie },
        payload: { title: 'Task with labels' },
      })

      const task = createRes.json() as { id: number }

      await app.inject({
        method: 'POST',
        url: `/api/tasks/${task.id}/labels`,
        headers: { cookie },
        payload: { name: 'Backend' },
      })

      const res = await app.inject({ method: 'GET', url: '/api/tasks', headers: { cookie } })
      expect(res.statusCode).toBe(200)

      const tasks = res.json() as Array<{ id: number; labels: Array<{ id: number; name: string }> }>
      const loaded = tasks.find(t => t.id === task.id)
      expect(loaded?.labels).toHaveLength(1)
      expect(loaded?.labels[0].name).toBe('Backend')
    })
  })
  it('returns 401 when not authenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tasks' })
    expect(res.statusCode).toBe(401)
  })

  it('returns empty array when user has no tasks (AC2, AC3)', async () => {
    const cookie = await registerAndLogin('task-user1@test.com')
    const res = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([]) // direct array, no wrapper
  })

  it('returns only tasks belonging to authenticated user (AC3)', async () => {
    const cookie1 = await registerAndLogin('task-user2@test.com')
    const cookie2 = await registerAndLogin('task-user3@test.com')

    // Get user IDs
    const [u1] = await ctx.sql`SELECT id FROM users WHERE email = 'task-user2@test.com'`
    const [u2] = await ctx.sql`SELECT id FROM users WHERE email = 'task-user3@test.com'`

    await ctx.sql`INSERT INTO tasks (user_id, title) VALUES (${u1.id}, 'User 2 task')`
    await ctx.sql`INSERT INTO tasks (user_id, title) VALUES (${u2.id}, 'User 3 task')`

    const res1 = await app.inject({ method: 'GET', url: '/api/tasks', headers: { cookie: cookie1 } })
    expect(res1.statusCode).toBe(200)
    const tasks1 = res1.json()
    expect(tasks1).toHaveLength(1)
    expect(tasks1[0].title).toBe('User 2 task')

    const res2 = await app.inject({ method: 'GET', url: '/api/tasks', headers: { cookie: cookie2 } })
    expect(res2.json()).toHaveLength(1)
    expect(res2.json()[0].title).toBe('User 3 task')
  })

  it('response is a direct array (no wrapper object) (AC3)', async () => {
    const cookie = await registerAndLogin('task-user4@test.com')
    const res = await app.inject({ method: 'GET', url: '/api/tasks', headers: { cookie } })
    expect(Array.isArray(res.json())).toBe(true)
  })
})

describe('POST /api/tasks', () => {
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

  async function registerAndLogin(email: string) {
    const passwordHash = await bcrypt.hash('password123', 12)
    await ctx.sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'password123' },
    })
    const setCookie = loginRes.headers['set-cookie'] as string
    return setCookie.split(';')[0]
  }

  it('returns 401 when not authenticated (AC3)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'A task' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 201 with created task object — direct (no wrapper) (AC3)', async () => {
    const cookie = await registerAndLogin('create-task-user1@test.com')
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'Buy groceries' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(201)
    const task = res.json()
    expect(task.title).toBe('Buy groceries')
    expect(task.isCompleted).toBe(false)
    expect(task.completedAt).toBeNull()
    expect(typeof task.id).toBe('number')
    expect(typeof task.userId).toBe('number')
    expect(typeof task.createdAt).toBe('string')
    expect(typeof task.updatedAt).toBe('string')
  })

  it('trims whitespace from title before insert (AC2)', async () => {
    const cookie = await registerAndLogin('create-task-user2@test.com')
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: '  Trimmed Title  ' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().title).toBe('Trimmed Title')
  })

  it('returns 400 when title is empty string (AC2)', async () => {
    const cookie = await registerAndLogin('create-task-user3@test.com')
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: '' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when title is whitespace only (AC2)', async () => {
    const cookie = await registerAndLogin('create-task-user4@test.com')
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: '   ' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(400)
  })

  it('task is created with is_completed = false by default (AC3)', async () => {
    const cookie = await registerAndLogin('create-task-user5@test.com')
    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'Check default' },
      headers: { cookie },
    })
    const [u] = await ctx.sql`SELECT id FROM users WHERE email = 'create-task-user5@test.com'`
    const [row] = await ctx.sql`SELECT is_completed FROM tasks WHERE user_id = ${u.id}`
    expect(row.is_completed).toBe(false)
  })

  it('task is scoped to authenticated user — other users cannot see it (AC3)', async () => {
    const cookie1 = await registerAndLogin('create-task-user6@test.com')
    const cookie2 = await registerAndLogin('create-task-user7@test.com')

    await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'User 6 private task' },
      headers: { cookie: cookie1 },
    })

    const res = await app.inject({ method: 'GET', url: '/api/tasks', headers: { cookie: cookie2 } })
    const tasks = res.json()
    expect(tasks.every((t: { title: string }) => t.title !== 'User 6 private task')).toBe(true)
  })
})

describe('PATCH /api/tasks/:id/complete', () => {
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

  async function registerAndLogin(email: string) {
    const passwordHash = await bcrypt.hash('password123', 12)
    await ctx.sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'password123' },
    })
    const setCookie = loginRes.headers['set-cookie'] as string
    return setCookie.split(';')[0]
  }

  async function createUserTask(email: string, title: string) {
    const cookie = await registerAndLogin(email)
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title },
      headers: { cookie },
    })
    return { cookie, task: res.json() }
  }

  it('returns 401 when unauthenticated', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/tasks/1/complete' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when task does not exist', async () => {
    const cookie = await registerAndLogin('complete-notfound@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/999999999/complete',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' })
  })

  it('returns 404 when task belongs to another user', async () => {
    const { task } = await createUserTask('complete-owner@test.com', 'Owner task')
    const otherCookie = await registerAndLogin('complete-other@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/complete`,
      headers: { cookie: otherCookie },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 200 with isCompleted: true and completedAt set (AC1)', async () => {
    const { cookie, task } = await createUserTask('complete-success@test.com', 'To be completed')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/complete`,
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.isCompleted).toBe(true)
    expect(body.completedAt).not.toBeNull()
    expect(body.id).toBe(task.id)
    expect(body.title).toBe('To be completed')
  })

  it('updated_at is updated after complete (AC1)', async () => {
    const { cookie, task } = await createUserTask('complete-updtdat@test.com', 'Update at test')
    await new Promise(r => setTimeout(r, 10))
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/complete`,
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const original = new Date(task.updatedAt).getTime()
    const updated = new Date(res.json().updatedAt).getTime()
    expect(updated).toBeGreaterThan(original)
  })

  it('response is direct task object (no wrapper) (AC1)', async () => {
    const { cookie, task } = await createUserTask('complete-nowrapper@test.com', 'Direct task')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/complete`,
      headers: { cookie },
    })
    const body = res.json()
    expect(typeof body.id).toBe('number')
    expect(typeof body.title).toBe('string')
    expect(typeof body.isCompleted).toBe('boolean')
    expect(Array.isArray(body)).toBe(false)
  })
})

describe('PATCH /api/tasks/:id/uncomplete', () => {
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

  async function registerAndLogin(email: string) {
    const passwordHash = await bcrypt.hash('password123', 12)
    await ctx.sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'password123' },
    })
    const setCookie = loginRes.headers['set-cookie'] as string
    return setCookie.split(';')[0]
  }

  async function createAndCompleteTask(email: string, title: string) {
    const cookie = await registerAndLogin(email)
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title },
      headers: { cookie },
    })
    const task = createRes.json()
    await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/complete`,
      headers: { cookie },
    })
    return { cookie, task }
  }

  it('returns 401 when unauthenticated', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/tasks/1/uncomplete' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when task does not exist', async () => {
    const cookie = await registerAndLogin('uncomplete-notfound@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/999999999/uncomplete',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' })
  })

  it('returns 404 when task belongs to another user', async () => {
    const { task } = await createAndCompleteTask('uncomplete-owner@test.com', 'Owner task')
    const otherCookie = await registerAndLogin('uncomplete-other@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/uncomplete`,
      headers: { cookie: otherCookie },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 200 with isCompleted: false and completedAt: null (AC3)', async () => {
    const { cookie, task } = await createAndCompleteTask('uncomplete-success@test.com', 'To be uncompleted')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/uncomplete`,
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.isCompleted).toBe(false)
    expect(body.completedAt).toBeNull()
    expect(body.id).toBe(task.id)
  })

  it('updated_at is updated after uncomplete (AC3)', async () => {
    const { cookie, task } = await createAndCompleteTask('uncomplete-updtdat@test.com', 'Update at test')
    await new Promise(r => setTimeout(r, 10))
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/uncomplete`,
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const original = new Date(task.updatedAt).getTime()
    const updated = new Date(res.json().updatedAt).getTime()
    expect(updated).toBeGreaterThan(original)
  })

  it('response is direct task object (no wrapper) (AC3)', async () => {
    const { cookie, task } = await createAndCompleteTask('uncomplete-nowrapper@test.com', 'Direct task uncomplete')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}/uncomplete`,
      headers: { cookie },
    })
    const body = res.json()
    expect(typeof body.id).toBe('number')
    expect(typeof body.title).toBe('string')
    expect(typeof body.isCompleted).toBe('boolean')
    expect(Array.isArray(body)).toBe(false)
  })
})

describe('PATCH /api/tasks/:id (update title)', () => {
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

  async function registerAndLogin(email: string) {
    const passwordHash = await bcrypt.hash('password123', 12)
    await ctx.sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'password123' },
    })
    const setCookie = loginRes.headers['set-cookie'] as string
    return setCookie.split(';')[0]
  }

  async function createUserTask(email: string, title: string) {
    const cookie = await registerAndLogin(email)
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title },
      headers: { cookie },
    })
    return { cookie, task: res.json() }
  }

  it('returns 401 when unauthenticated', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/1',
      payload: { title: 'New title' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when body title is missing', async () => {
    const cookie = await registerAndLogin('patch-title-noBody@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/1',
      payload: {},
      headers: { cookie },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when body title is empty string (AC5)', async () => {
    const { cookie, task } = await createUserTask('patch-title-empty@test.com', 'Original title')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { title: '' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when body title is whitespace only (AC5)', async () => {
    const { cookie, task } = await createUserTask('patch-title-whitespace@test.com', 'Original title')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { title: '   ' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when task not found (AC4)', async () => {
    const cookie = await registerAndLogin('patch-title-notfound@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/999999999',
      payload: { title: 'New title' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' })
  })

  it('returns 404 when task belongs to another user (AC4)', async () => {
    const { task } = await createUserTask('patch-title-owner@test.com', 'Owner task')
    const otherCookie = await registerAndLogin('patch-title-other@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { title: 'Stolen title' },
      headers: { cookie: otherCookie },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 200 with updated task object and new title (AC2)', async () => {
    const { cookie, task } = await createUserTask('patch-title-success@test.com', 'Old title')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { title: 'New title' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.title).toBe('New title')
    expect(body.id).toBe(task.id)
    expect(body.isCompleted).toBe(false)
    expect(typeof body.userId).toBe('number')
    expect(typeof body.createdAt).toBe('string')
    expect(typeof body.updatedAt).toBe('string')
    expect(Array.isArray(body)).toBe(false)
  })

  it('updatedAt is strictly greater than createdAt after update (AC2)', async () => {
    const { cookie, task } = await createUserTask('patch-title-updtdat@test.com', 'Original')
    await new Promise(r => setTimeout(r, 10))
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      payload: { title: 'Updated' },
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
    const created = new Date(task.createdAt).getTime()
    const updated = new Date(res.json().updatedAt).getTime()
    expect(updated).toBeGreaterThan(created)
  })
})

describe('DELETE /api/tasks/:id (delete task)', () => {
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

  async function registerAndLogin(email: string) {
    const passwordHash = await bcrypt.hash('password123', 12)
    await ctx.sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'password123' },
    })
    const setCookie = loginRes.headers['set-cookie'] as string
    return setCookie.split(';')[0]
  }

  async function createUserTask(email: string, title: string) {
    const cookie = await registerAndLogin(email)
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      payload: { title },
      headers: { cookie },
    })
    return { cookie, task: res.json() }
  }

  it('returns 401 when unauthenticated (AC6)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/tasks/1',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 204 and task is actually gone after deletion (AC2)', async () => {
    const { cookie, task } = await createUserTask('delete-success@test.com', 'Task to delete')

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${task.id}`,
      headers: { cookie },
    })
    expect(deleteRes.statusCode).toBe(204)
    expect(deleteRes.body).toBe('')

    // Verify task is gone
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/tasks',
      headers: { cookie },
    })
    expect(getRes.statusCode).toBe(200)
    const tasks = getRes.json() as { id: number }[]
    expect(tasks.find(t => t.id === task.id)).toBeUndefined()
  })

  it('returns 404 when task does not exist (AC6)', async () => {
    const cookie = await registerAndLogin('delete-notfound@test.com')
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/tasks/999999999',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ statusCode: 404, error: 'NOT_FOUND', message: 'Task not found' })
  })

  it('returns 404 when task belongs to another user — ownership isolation (AC6)', async () => {
    const { task } = await createUserTask('delete-owner@test.com', 'Owner task')
    const otherCookie = await registerAndLogin('delete-other@test.com')

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${task.id}`,
      headers: { cookie: otherCookie },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' })

    // Verify task still exists for the real owner
    const ownerCookie = await registerAndLogin('delete-verify-owner@test.com')
    // Retrieve using direct DB check instead to avoid polluting test state
    const rows = await ctx.sql<{ id: number }[]>`SELECT id FROM tasks WHERE id = ${task.id}`
    expect(rows).toHaveLength(1)
  })
})
describe('PATCH /api/tasks/:id \u2014 deadline extension (Story 3.2)', () => {
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

  async function registerAndLogin(email: string) {
    const passwordHash = await bcrypt.hash('password123', 12)
    await ctx.sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'password123' },
    })
    const setCookie = loginRes.headers['set-cookie'] as string
    return setCookie.split(';')[0]
  }

  async function createTask(cookie: string, title: string) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks',
      headers: { cookie },
      payload: { title },
    })
    return res.json() as { id: number; title: string; deadline: string | null }
  }

  it('returns 401 when not authenticated (deadline body)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/1',
      payload: { deadline: '2026-03-15' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('sets deadline: returns 200 with deadline field populated (AC1/AC5)', async () => {
    const cookie = await registerAndLogin('deadline-set@test.com')
    const task = await createTask(cookie, 'Task with deadline')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: { cookie },
      payload: { deadline: '2026-03-15' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.deadline).toBe('2026-03-15')
  })

  it('clears deadline: returns 200 with deadline null (AC2)', async () => {
    const cookie = await registerAndLogin('deadline-clear@test.com')
    const task = await createTask(cookie, 'Task to clear deadline')
    // First set deadline
    await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: { cookie },
      payload: { deadline: '2026-04-01' },
    })
    // Now clear it
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: { cookie },
      payload: { deadline: null },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().deadline).toBeNull()
  })

  it('returns 404 on non-existent task', async () => {
    const cookie = await registerAndLogin('deadline-notfound@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tasks/999999999',
      headers: { cookie },
      payload: { deadline: '2026-03-15' },
    })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' })
  })

  it('returns 404 for a task belonging to another user', async () => {
    const ownerCookie = await registerAndLogin('deadline-owner@test.com')
    const task = await createTask(ownerCookie, 'Owner task')
    const otherCookie = await registerAndLogin('deadline-intruder@test.com')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: { cookie: otherCookie },
      payload: { deadline: '2026-03-15' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('regression: { title } only still updates title, deadline unchanged (AC5)', async () => {
    const cookie = await registerAndLogin('deadline-reg-title@test.com')
    const task = await createTask(cookie, 'Original title')
    // Set deadline
    await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: { cookie },
      payload: { deadline: '2026-05-10' },
    })
    // Now update only title
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: { cookie },
      payload: { title: 'Updated title' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.title).toBe('Updated title')
    // deadline should be unaffected — verify via GET
    const getRes = await app.inject({ method: 'GET', url: '/api/tasks', headers: { cookie } })
    const tasks = getRes.json() as { id: number; title: string; deadline: string | null }[]
    const updated = tasks.find(t => t.id === task.id)
    expect(updated?.deadline).toBe('2026-05-10')
  })

  it('regression: both title and deadline in same body — both updated (AC5)', async () => {
    const cookie = await registerAndLogin('deadline-both@test.com')
    const task = await createTask(cookie, 'Original')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: { cookie },
      payload: { title: 'New title', deadline: '2026-06-20' },
    })
    expect(res.statusCode).toBe(200)
    // When both are provided, deadline is the last update so response shows deadline
    const body = res.json()
    expect(body.deadline).toBe('2026-06-20')
    // title updated — verify via GET
    const getRes = await app.inject({ method: 'GET', url: '/api/tasks', headers: { cookie } })
    const tasks = getRes.json() as { id: number; title: string; deadline: string | null }[]
    const updated = tasks.find(t => t.id === task.id)
    expect(updated?.title).toBe('New title')
  })

  it('returns 400 when body is empty \u2014 no updatable fields (AC5)', async () => {
    const cookie = await registerAndLogin('deadline-empty@test.com')
    const task = await createTask(cookie, 'Empty body task')
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/tasks/${task.id}`,
      headers: { cookie },
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ statusCode: 400, error: 'Bad Request' })
  })
})