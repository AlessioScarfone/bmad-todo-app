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

describe('POST /api/auth/login', () => {
  const loginEmail = 'login-user@example.com'
  const loginPassword = 'loginpassword123'

  beforeAll(async () => {
    // Pre-register a user for login tests
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: loginEmail, password: loginPassword },
    })
  })

  it('returns 200 with id and email, sets token cookie on valid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: loginEmail, password: loginPassword },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json() as { id: number; email: string }
    expect(body.id).toBeTypeOf('number')
    expect(body.email).toBe(loginEmail)

    const setCookie = response.headers['set-cookie'] as string | string[]
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie
    expect(cookieStr).toBeDefined()
    expect(cookieStr).toMatch(/^token=/)
    expect(cookieStr).toMatch(/HttpOnly/i)
    expect(cookieStr).toMatch(/SameSite=Strict/i)
  })

  it('returns 401 with UNAUTHORIZED on wrong password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: loginEmail, password: 'wrongpassword' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({
      statusCode: 401,
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    })
  })

  it('returns 401 with UNAUTHORIZED on non-existent email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: 'somepassword' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({
      statusCode: 401,
      error: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    })
  })

  it('returns 400 when email is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'notanemail', password: 'somepassword' },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ statusCode: 400, error: 'BAD_REQUEST' })
  })

  it('returns 400 when password is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: loginEmail },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ statusCode: 400, error: 'BAD_REQUEST' })
  })
})

describe('GET /api/auth/me', () => {
  const meEmail = 'me-user@example.com'
  const mePassword = 'mepassword123'

  beforeAll(async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: meEmail, password: mePassword },
    })
  })

  it('returns 200 with id and email when valid cookie provided', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: meEmail, password: mePassword },
    })
    expect(loginRes.statusCode).toBe(200)

    const setCookie = loginRes.headers['set-cookie'] as string | string[]
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie },
    })

    expect(meRes.statusCode).toBe(200)
    expect(meRes.json()).toMatchObject({ email: meEmail })
    const body = meRes.json() as { id: number; email: string }
    expect(body.id).toBeTypeOf('number')
  })

  it('returns 401 when no cookie provided', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({
      statusCode: 401,
      error: 'UNAUTHORIZED',
    })
  })

  it('returns 401 when token cookie is tampered / invalid JWT', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { cookie: 'token=totally.invalid.jwt' },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({
      statusCode: 401,
      error: 'UNAUTHORIZED',
    })
  })
})

describe('POST /api/auth/logout', () => {
  const logoutEmail = 'logout-user@example.com'
  const logoutPassword = 'logoutpassword123'

  beforeAll(async () => {
    await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: logoutEmail, password: logoutPassword },
    })
  })

  it('returns 200 and clears the token cookie with a valid session cookie', async () => {
    // First login to get a valid token cookie
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: logoutEmail, password: logoutPassword },
    })
    expect(loginRes.statusCode).toBe(200)

    const setCookie = loginRes.headers['set-cookie'] as string | string[]
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie

    // Call logout with valid session cookie
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie },
    })

    expect(logoutRes.statusCode).toBe(200)
    expect(logoutRes.json()).toMatchObject({ message: 'Logged out' })

    // Cookie must be cleared (Max-Age=0 or past Expires)
    const responseCookie = logoutRes.headers['set-cookie'] as string | string[]
    const responseCookieStr = Array.isArray(responseCookie)
      ? responseCookie.join('; ')
      : responseCookie
    expect(responseCookieStr).toMatch(/Max-Age=0|expires=.*1970/i)
  })

  it('returns 200 with no cookie present (idempotent)', async () => {
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    })

    expect(logoutRes.statusCode).toBe(200)
    expect(logoutRes.json()).toMatchObject({ message: 'Logged out' })
  })

  it('returns 200 with a tampered / invalid JWT cookie (idempotent, no auth check)', async () => {
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: 'token=totally.invalid.jwt' },
    })

    expect(logoutRes.statusCode).toBe(200)
    expect(logoutRes.json()).toMatchObject({ message: 'Logged out' })
  })
})