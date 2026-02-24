import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import bcrypt from 'bcrypt'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import type { Sql } from 'postgres'
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
  await app?.close()
  await sql?.end()
  await container?.stop()
})

describe('POST /api/auth/register', () => {
  it('returns 201 with id and email for valid payload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'valid@example.com',
        password: 'password123',
      },
    })

    expect(response.statusCode).toBe(201)

    const body = response.json() as { id: number; email: string; password_hash?: string }
    expect(body.id).toBeTypeOf('number')
    expect(body.email).toBe('valid@example.com')
    expect(body.password_hash).toBeUndefined()
  })

  it('returns 409 when trying to register duplicate email', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'duplicate@example.com',
        password: 'password123',
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'duplicate@example.com',
        password: 'password123',
      },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toMatchObject({
      statusCode: 409,
      error: 'CONFLICT',
      message: 'Email already in use',
    })
  })

  it('returns 400 when email is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        password: 'password123',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      statusCode: 400,
      error: 'BAD_REQUEST',
    })
  })

  it('returns 400 when password is shorter than 8 chars', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'short@example.com',
        password: 'short',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      statusCode: 400,
      error: 'BAD_REQUEST',
    })
  })

  it('returns 400 when email format is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'notanemail',
        password: 'password123',
      },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      statusCode: 400,
      error: 'BAD_REQUEST',
    })
  })

  it('stores password_hash and never plaintext', async () => {
    const password = 'mysecurepassword'
    const email = 'hash-check@example.com'

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password,
      },
    })

    expect(response.statusCode).toBe(201)

    const users = await sql<{ password_hash: string }[]>`
      SELECT password_hash
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `

    expect(users).toHaveLength(1)
    expect(users[0].password_hash).not.toBe(password)
    expect(await bcrypt.compare(password, users[0].password_hash)).toBe(true)
  })
})