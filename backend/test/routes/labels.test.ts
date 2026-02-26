import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcrypt'
import type { Sql } from 'postgres'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createTestDb } from '../helpers/db.js'
import { buildServer } from '../../src/server.js'

let sql: Sql
let container: StartedPostgreSqlContainer
let app: ReturnType<typeof buildServer>

beforeAll(async () => {
  const db = await createTestDb()
  sql = db.sql
  container = db.container
  app = buildServer('test-secret', sql)
  await app.ready()
})

afterAll(async () => {
  await app.close()
  await sql.end()
  await container.stop()
})

async function registerAndLogin(email: string) {
  const passwordHash = await bcrypt.hash('password123', 12)
  await sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'password123' },
  })

  const setCookie = loginRes.headers['set-cookie'] as string
  return setCookie.split(';')[0]
}

async function createTaskForUser(email: string, title: string) {
  const cookie = await registerAndLogin(email)
  const taskRes = await app.inject({
    method: 'POST',
    url: '/api/tasks',
    headers: { cookie },
    payload: { title },
  })

  return {
    cookie,
    task: taskRes.json() as { id: number; userId: number; title: string },
  }
}

describe('GET /api/labels', () => {
  it('returns 401 unauthenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/labels' })
    expect(res.statusCode).toBe(401)
  })

  it('returns empty array for new user', async () => {
    const cookie = await registerAndLogin('labels-empty@test.com')
    const res = await app.inject({ method: 'GET', url: '/api/labels', headers: { cookie } })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('returns labels after attaching one to a task', async () => {
    const { cookie, task } = await createTaskForUser('labels-list@test.com', 'Task with label')

    const attachRes = await app.inject({
      method: 'POST',
      url: `/api/tasks/${task.id}/labels`,
      headers: { cookie },
      payload: { name: 'Backend' },
    })
    expect([200, 201]).toContain(attachRes.statusCode)

    const res = await app.inject({ method: 'GET', url: '/api/labels', headers: { cookie } })
    expect(res.statusCode).toBe(200)

    const labels = res.json() as Array<{ id: number; name: string }>
    expect(labels).toHaveLength(1)
    expect(labels[0].name).toBe('Backend')
  })
})

describe('POST /api/tasks/:id/labels', () => {
  it('returns 401 unauthenticated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks/1/labels',
      payload: { name: 'Backend' },
    })

    expect(res.statusCode).toBe(401)
  })

  it('returns 201 and attaches a new label', async () => {
    const { cookie, task } = await createTaskForUser('labels-attach@test.com', 'Attach label task')

    const res = await app.inject({
      method: 'POST',
      url: `/api/tasks/${task.id}/labels`,
      headers: { cookie },
      payload: { name: 'Frontend' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ name: 'Frontend' })
  })

  it('returns 200/201 when attaching same label twice (idempotent)', async () => {
    const { cookie, task } = await createTaskForUser('labels-idempotent@test.com', 'Idempotent attach')

    const first = await app.inject({
      method: 'POST',
      url: `/api/tasks/${task.id}/labels`,
      headers: { cookie },
      payload: { name: 'Admin' },
    })

    const second = await app.inject({
      method: 'POST',
      url: `/api/tasks/${task.id}/labels`,
      headers: { cookie },
      payload: { name: 'Admin' },
    })

    expect([200, 201]).toContain(first.statusCode)
    expect([200, 201]).toContain(second.statusCode)
  })

  it('returns 404 for non-existent task', async () => {
    const cookie = await registerAndLogin('labels-missing-task@test.com')

    const res = await app.inject({
      method: 'POST',
      url: '/api/tasks/999999/labels',
      headers: { cookie },
      payload: { name: 'Ops' },
    })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' })
  })
})

describe('DELETE /api/tasks/:id/labels/:labelId', () => {
  it('returns 401 unauthenticated', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/tasks/1/labels/1' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 204 on success', async () => {
    const { cookie, task } = await createTaskForUser('labels-remove@test.com', 'Remove label task')

    const attachRes = await app.inject({
      method: 'POST',
      url: `/api/tasks/${task.id}/labels`,
      headers: { cookie },
      payload: { name: 'ToRemove' },
    })

    const label = attachRes.json() as { id: number }

    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${task.id}/labels/${label.id}`,
      headers: { cookie },
    })

    expect(removeRes.statusCode).toBe(204)
  })

  it('returns 404 when label link does not exist', async () => {
    const { cookie, task } = await createTaskForUser('labels-remove-404@test.com', 'No label link')

    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/api/tasks/${task.id}/labels/999999`,
      headers: { cookie },
    })

    expect(removeRes.statusCode).toBe(404)
  })
})

describe('DELETE /api/labels/:id', () => {
  it('returns 401 unauthenticated', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/labels/1' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 204 on success and cascades task_labels rows', async () => {
    const { cookie, task } = await createTaskForUser('labels-global-delete@test.com', 'Global delete label task')

    const attachRes = await app.inject({
      method: 'POST',
      url: `/api/tasks/${task.id}/labels`,
      headers: { cookie },
      payload: { name: 'GlobalDelete' },
    })

    const { id: labelId } = attachRes.json() as { id: number }

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/labels/${labelId}`,
      headers: { cookie },
    })

    expect(delRes.statusCode).toBe(204)

    const links = await sql`SELECT * FROM task_labels WHERE label_id = ${labelId}`
    expect(links).toHaveLength(0)
  })

  it('returns 403 when label belongs to another user', async () => {
    const owner = await createTaskForUser('labels-owner@test.com', 'Owner task')
    const otherCookie = await registerAndLogin('labels-other@test.com')

    const attachRes = await app.inject({
      method: 'POST',
      url: `/api/tasks/${owner.task.id}/labels`,
      headers: { cookie: owner.cookie },
      payload: { name: 'PrivateLabel' },
    })

    const label = attachRes.json() as { id: number }

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/labels/${label.id}`,
      headers: { cookie: otherCookie },
    })

    expect(delRes.statusCode).toBe(403)
    expect(delRes.json()).toMatchObject({ statusCode: 403, error: 'FORBIDDEN' })
  })

  it('returns 404 when label does not exist', async () => {
    const cookie = await registerAndLogin('labels-delete-missing@test.com')

    const delRes = await app.inject({
      method: 'DELETE',
      url: '/api/labels/999999',
      headers: { cookie },
    })

    expect(delRes.statusCode).toBe(404)
    expect(delRes.json()).toMatchObject({ statusCode: 404, error: 'NOT_FOUND' })
  })
})
