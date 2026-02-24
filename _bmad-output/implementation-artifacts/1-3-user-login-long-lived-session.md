# Story 1.3: User Login & Long-lived Session

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a registered user,
I want to log in with my email and password and remain authenticated across browser restarts for 30 days,
So that I don't have to re-authenticate on return visits.

## Acceptance Criteria

**AC1 — Successful login:**
- **Given** I am on the login page and enter valid credentials
- **When** I submit the login form
- **Then** I am redirected to the authenticated task list (`/`)
- **And** the server sets an `httpOnly`, `SameSite=Strict` cookie named `token` containing a 30-day JWT

**AC2 — Session persists across browser restart:**
- **Given** I have previously logged in and close/reopen the browser
- **When** my browser sends the stored cookie on the next visit
- **Then** `GET /api/auth/me` validates the JWT server-side and returns my user record
- **And** I land directly on the task list (`/`) without seeing the login page

**AC3 — Invalid credentials:**
- **Given** I enter an incorrect password or unregistered email
- **When** I submit the login form
- **Then** I see a generic inline error: "Invalid email or password" — no field-specific hint
- **And** the server returns `401` with `{ statusCode: 401, error: "UNAUTHORIZED", message: "Invalid email or password" }`

**AC4 — Expired session:**
- **Given** my session cookie has expired (> 30 days) or is invalid
- **When** I visit the app at `/`
- **Then** I am redirected to `/login`
- **And** no stale session data is shown

## Tasks / Subtasks

- [ ] **Task 1: Shared types — login schemas** (AC: AC1, AC3)
  - [ ] 1.1 Add to `shared/types/index.ts` (do NOT remove existing schemas):
    ```typescript
    export const LoginBodySchema = Type.Object({
      email: Type.String({ format: 'email', minLength: 1 }),
      password: Type.String({ minLength: 1 }),
    })
    export type LoginBody = Static<typeof LoginBodySchema>
    ```
    Note: `AuthUserSchema` was already added in Story 1.2 — reuse it for `GET /auth/me` response.
  - [ ] 1.2 Verify `shared/types/index.ts` compiles cleanly

- [ ] **Task 2: Backend — Fastify `authenticate` decorator** (AC: AC2, AC4)
  - [ ] 2.1 In `backend/src/server.ts`, inside `buildServer()`, declare a reusable `authenticate` preHandler decorator **after** JWT plugin registration:
    ```typescript
    fastify.decorate('authenticate', async function (
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      try {
        await request.jwtVerify()
      } catch {
        return reply.status(401).send({
          statusCode: 401,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        })
      }
    })
    ```
  - [ ] 2.2 Add TypeScript module augmentation in `backend/src/types.d.ts` (new file) to declare the decorator on `FastifyInstance`:
    ```typescript
    import type { FastifyRequest, FastifyReply } from 'fastify'
    declare module 'fastify' {
      interface FastifyInstance {
        authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>
      }
    }
    ```
  - [ ] 2.3 Add JWT payload type declaration so `request.user` is typed (same file or separate `jwt.d.ts`):
    ```typescript
    declare module '@fastify/jwt' {
      interface FastifyJWT {
        payload: { id: number; email: string }
        user: { id: number; email: string }
      }
    }
    ```

- [ ] **Task 3: Backend — login and `/me` routes** (AC: AC1, AC2, AC3, AC4)
  - [ ] 3.1 Add `POST /auth/login` to the **existing** `backend/src/routes/auth.ts` plugin (same file as `POST /auth/register` from Story 1.2):
    - ⚠️ **NEVER log `req.body`** on auth routes
    - Call `getUserByEmail(sql, email)` — if not found → `401`
    - `bcrypt.compare(password, user.password_hash)` — if false → `401` (same generic message, never reveal which field is wrong)
    - Sign JWT: `fastify.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '30d' })`
    - Set cookie via `reply.setCookie('token', token, { httpOnly: true, sameSite: 'strict', secure: NODE_ENV === 'production', path: '/', maxAge: 30 * 24 * 60 * 60 })`
    - Return `200` with `{ id: user.id, email: user.email }` (direct object, no wrapper)
    - **Note on `secure` flag:** In development (Docker Compose on localhost) set `secure: false`; in production set `secure: true` — use `process.env.NODE_ENV === 'production'`
  - [ ] 3.2 Add `GET /auth/me` to the same `routes/auth.ts` plugin:
    - Protect with `{ preHandler: [fastify.authenticate] }`
    - Extract `const { id, email } = request.user`
    - Return `200` with `{ id, email }` (the `AuthUserSchema` shape from shared types)
  - [ ] 3.3 `NODE_ENV` must be read from `process.env` at the module level or inside the plugin options — do not hardcode

- [ ] **Task 4: Backend — integration tests** (AC: AC1, AC2, AC3, AC4)
  - [ ] 4.1 Extend `backend/test/routes/auth.test.ts` (from Story 1.2) with new test cases:
    - `POST /api/auth/login` with valid credentials → 200, `{ id, email }`, response sets `Set-Cookie: token=...`
    - `POST /api/auth/login` with wrong password → 401, `{ statusCode: 401, error: "UNAUTHORIZED" }`
    - `POST /api/auth/login` with non-existent email → 401 (same shape — no field hint)
    - `GET /api/auth/me` with valid cookie → 200, `{ id, email }`
    - `GET /api/auth/me` with no cookie → 401
    - `GET /api/auth/me` with tampered/invalid token → 401
  - [ ] 4.2 For cookie-based test flow, extract the `Set-Cookie` header from login response and pass it in subsequent `GET /api/auth/me` inject call:
    ```typescript
    const loginRes = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } })
    const cookie = loginRes.headers['set-cookie'] as string
    const meRes = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } })
    ```
  - [ ] 4.3 Run `npm test` — **all** previous tests (migrate, auth register) plus new login/me tests must pass

- [ ] **Task 5: Frontend — QueryClientProvider setup** (AC: AC2, AC4)
  - [ ] 5.1 Add `QueryClientProvider` to `frontend/src/main.tsx` — this is required for `useAuth` hook (uses `useQuery`) to work:
    ```tsx
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
    const queryClient = new QueryClient()
    // Wrap BrowserRouter with QueryClientProvider:
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>...</BrowserRouter>
    </QueryClientProvider>
    ```

- [ ] **Task 6: Frontend — `useAuth` hook** (AC: AC2, AC4)
  - [ ] 6.1 Create `frontend/src/hooks/useAuth.ts`:
    ```typescript
    import { useQuery } from '@tanstack/react-query'
    import { api } from '../lib/api'
    import type { AuthUser } from '../../../shared/types'

    export function useAuth() {
      const { data: user, isLoading, isError } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: () => api.get<AuthUser>('/auth/me'),
        retry: false,              // don't retry on 401
        staleTime: 5 * 60 * 1000, // consider auth fresh for 5 min
      })
      return {
        user: isError ? undefined : user,
        isLoading,
        isAuthenticated: !!user && !isError,
      }
    }
    ```

- [ ] **Task 7: Frontend — `ProtectedRoute` component** (AC: AC2, AC4)
  - [ ] 7.1 Create `frontend/src/components/ProtectedRoute.tsx`:
    ```tsx
    import { Navigate } from 'react-router-dom'
    import { useAuth } from '../hooks/useAuth'

    export function ProtectedRoute({ children }: { children: React.ReactNode }) {
      const { user, isLoading } = useAuth()
      if (isLoading) return <div className="p-8 text-center font-['Press_Start_2P'] text-sm">Loading...</div>
      if (!user) return <Navigate to="/login" replace />
      return <>{children}</>
    }
    ```
  - [ ] 7.2 Wrap the `TaskListPage` route in `main.tsx` with `<ProtectedRoute>`:
    ```tsx
    <Route path="/" element={<ProtectedRoute><TaskListPage /></ProtectedRoute>} />
    ```
    Login and Register pages remain unprotected (accessible without auth).

- [ ] **Task 8: Frontend — `LoginPage.tsx` implementation** (AC: AC1, AC3)
  - [ ] 8.1 Replace the placeholder `frontend/src/pages/LoginPage.tsx` with a real login form:
    - Controlled form: `email` + `password` fields
    - Client-side validation on submit: empty email or password → show inline error, **no API call**
    - Submit calls `api.post<AuthUser>('/auth/login', { email, password })`
    - On success → `navigate('/')` (React Router `useNavigate`)
    - On error (401) → show generic inline error: _"Invalid email or password"_ — **same message regardless of which field is wrong** (security requirement; never hint which field failed)
    - On other error → generic: _"Login failed. Please try again."_
    - Submit button disabled while request is in-flight
    - **Pixel-art aesthetic** (Press Start 2P font, Tailwind) — calm and composed
    - "Don't have an account? Register" link → `/register`
  - [ ] 8.2 If authenticated user navigates to `/login`, redirect them to `/` (avoid double-login):
    ```tsx
    const { user, isLoading } = useAuth()
    if (isLoading) return null
    if (user) return <Navigate to="/" replace />
    ```
  - [ ] 8.3 **Do NOT** save email to localStorage here — that belongs to Story 1.4
  - [ ] 8.4 Verify TypeScript compiles cleanly: `cd frontend && npx tsc --noEmit`

## Dev Notes

### Previous Story Intelligence (Stories 1.1 & 1.2)

> Critical learnings that directly impact this story:

**From Story 1.1 (still applies):**
1. **ESM `.js` extensions** — All internal TypeScript imports use `.js` extension: `import { ... } from '../db/queries/auth.js'`
2. **`buildServer(jwtSecret, sqlOverride?)` signature** — The function signature was designed to accept `sqlOverride` for test injection. If Story 1.2 implemented this correctly, the pattern is already in place. If not, extend `buildServer()` now — the `authenticate` decorator needs to be added inside `buildServer()` alongside the JWT plugin.
3. **Testcontainers Colima env** — `npm test` already includes `TESTCONTAINERS_RYUK_DISABLED=true` and `DOCKER_HOST`. No changes needed.
4. **`__dirname` ESM replacement** — `fileURLToPath(import.meta.url)` + `path.dirname()` (not needed this story but pattern established).

**From Story 1.2 (assumed complete when Story 1.3 starts):**
5. **`routes/auth.ts` already exists** as a `fastify-plugin` (`fp`) plugin registered at `{ prefix: '/api' }`. Add the new routes (`POST /auth/login`, `GET /auth/me`) **into the same plugin file** — do not create a second auth plugin.
6. **`db/queries/auth.ts` has `getUserByEmail(sql, email)`** — reuse it directly in the login handler. Do not redefine.
7. **`AuthUserSchema` in `shared/types/index.ts`** — already defined as `{ id: Type.Number(), email: Type.String() }`. Use it as the response schema for `GET /auth/me` and `POST /auth/login`.
8. **`buildServer(jwtSecret, sqlOverride?)` pattern** — `routes/auth.ts` plugin receives `sql` via options (`FastifyPluginAsync<{ sql: Sql }>`). The login handler uses the same `opts.sql` as register.
9. **`fastify-plugin` is installed** — `fastify-plugin` was added as a dep in Story 1.2. No need to reinstall.
10. **`api.ts` fetch wrapper** — throws `Error` with `.statusCode` attached on non-ok responses. Login form catches this and inspects `err.statusCode === 401`.

### `@fastify/jwt` Cookie Behaviour

`server.ts` already configures `@fastify/jwt` with:
```typescript
fastify.register(jwt, {
  secret: jwtSecret,
  cookie: { cookieName: 'token', signed: false },
})
```

This means `request.jwtVerify()` **automatically reads from the `token` cookie** (because `cookieName: 'token'` is set). The `authenticate` decorator just needs to call `request.jwtVerify()` — no manual cookie extraction needed.

When setting the cookie on login, use exactly `'token'` as the cookie name to match the jwt plugin config.

### Backend Route Additions (to existing `routes/auth.ts`)

The plugin already has `POST /auth/register`. Add two more routes in the same `async (fastify, opts) => {}` block:

```typescript
// POST /auth/login
f.post('/auth/login', { schema: { body: LoginBodySchema } }, async (req, reply) => {
  const { email, password } = req.body
  // NEVER log req.body
  const user = await getUserByEmail(opts.sql, email)
  if (!user) {
    return reply.status(401).send({ statusCode: 401, error: 'UNAUTHORIZED', message: 'Invalid email or password' })
  }
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return reply.status(401).send({ statusCode: 401, error: 'UNAUTHORIZED', message: 'Invalid email or password' })
  }
  const token = fastify.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '30d' })
  return reply
    .setCookie('token', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })
    .status(200)
    .send({ id: user.id, email: user.email })
})

// GET /auth/me
f.get('/auth/me', { preHandler: [fastify.authenticate] }, async (req) => {
  const { id, email } = req.user
  return { id, email }
})
```

### API Contract

**`POST /api/auth/login`**

Request body:
```json
{ "email": "user@example.com", "password": "mypassword" }
```
Success — `200 OK`:
```json
{ "id": 1, "email": "user@example.com" }
```
+ Response header: `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`

Error responses:
| Status | `error` | `message` | Trigger |
|--------|---------|-----------|---------|
| `400` | `"BAD_REQUEST"` | TypeBox validation message | Missing/empty email or password |
| `401` | `"UNAUTHORIZED"` | `"Invalid email or password"` | Wrong password OR unknown email |
| `500` | `"INTERNAL_SERVER_ERROR"` | `"Internal server error"` | Unexpected error |

**`GET /api/auth/me`**

No request body. Reads `token` cookie automatically via `@fastify/jwt`.

Success — `200 OK`:
```json
{ "id": 1, "email": "user@example.com" }
```
Error — `401` if cookie absent, expired, or invalid:
```json
{ "statusCode": 401, "error": "UNAUTHORIZED", "message": "Authentication required" }
```

### `NODE_ENV` and `secure` Cookie Flag

```
Development (docker-compose on localhost): NODE_ENV=development → secure: false
Production (HTTPS):                        NODE_ENV=production  → secure: true
```

The `secure: process.env.NODE_ENV === 'production'` pattern handles both automatically. The `.env` already has `NODE_ENV=development` — no change needed.

### TypeScript Declaration Files

Create `backend/src/types.d.ts` for the Fastify augmentations (Task 2.2 and 2.3). This file is picked up automatically by TypeScript if included in `tsconfig.json`'s `include` array or in the same directory as `server.ts`. No import needed — declaration files are globally merged.

```typescript
// backend/src/types.d.ts
import type { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string }
    user:    { id: number; email: string }
  }
}
```

### Frontend Auth Architecture

**QueryClient placement:** `main.tsx` — single `QueryClient` instance created outside render, shared across test utils.

**`useAuth` query key:** `['auth', 'me']` — used consistently. The login success in `LoginPage` should call `queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })` to refresh auth state, then navigate.

**Alternative to invalidate:** calling `navigate('/')` after successful login causes `ProtectedRoute` to re-evaluate `useAuth`, which refetches `/auth/me` automatically since the cookie is now set.

**Loading state in `ProtectedRoute`:** Show minimal placeholder while `isLoading=true` (brief flash on first load). The pixel font class `font-['Press_Start_2P']` is available via Tailwind v4 if declared in the `@theme` block.

**Redirect-if-already-authenticated in `LoginPage`:** Call `useAuth()` at top of `LoginPage`. If `user` is defined and `!isLoading`, render `<Navigate to="/" replace />`. This prevents an authenticated user from seeing the login page.

### Testing Pattern — Cookie Flow in `app.inject()`

Fastify's `inject()` supports reading response cookies and passing them in follow-up requests:

```typescript
// Login flow
const loginRes = await app.inject({
  method: 'POST',
  url: '/api/auth/login',
  payload: { email: 'test@example.com', password: 'password123' },
})
expect(loginRes.statusCode).toBe(200)

// Extract cookie
const setCookie = loginRes.headers['set-cookie'] as string | string[]
const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie

// Use cookie in /me request
const meRes = await app.inject({
  method: 'GET',
  url: '/api/auth/me',
  headers: { cookie },
})
expect(meRes.statusCode).toBe(200)
expect(meRes.json()).toMatchObject({ email: 'test@example.com' })
```

### Testing Standards

- **Test location:** `backend/test/routes/auth.test.ts` — extend the existing file from Story 1.2
- **Use `app.inject()`** — no real HTTP server in tests
- **`afterAll`:** `await container.stop()` + `await app.close()`
- **No mocking of bcrypt or jwt** — real implementations only

### What NOT to Build in This Story

| Feature | Belongs to |
|---|---|
| Save email to `localStorage` on login | Story 1.4 |
| Pre-fill email from `localStorage` on login page | Story 1.4 |
| Logout (`POST /api/auth/logout`) | Story 1.4 |
| Clear cookie / localStorage on logout | Story 1.4 |
| Logout button in UI | Story 1.4 |
| Task list real implementation | Story 2.x |
| Task count display | Story 2.3 |

The `TaskListPage.tsx` remains a placeholder. After login, `ProtectedRoute` will let authenticated users through to the placeholder — that is correct and expected for this story.

### Project Structure This Story Adds

```
backend/src/
  types.d.ts          ← NEW — Fastify & JWT type augmentations
  routes/
    auth.ts           ← EXTENDED — add POST /auth/login, GET /auth/me
frontend/src/
  hooks/
    useAuth.ts        ← NEW — replaces .gitkeep
  components/
    ProtectedRoute.tsx ← NEW
  pages/
    LoginPage.tsx     ← REPLACED — full implementation
  main.tsx            ← MODIFIED — add QueryClientProvider, ProtectedRoute guard
```

### Cross-Story Context (for awareness only)

**Story 1.4** will extend `routes/auth.ts` with `POST /auth/logout` (clears the `token` cookie server-side — `reply.clearCookie('token', { path: '/' })`). It will also add the `saveEmail` call (from `frontend/src/lib/auth.ts`) to the `LoginPage` after successful login, and the `clearEmail` call in a logout handler. The `getSavedEmail()` function will pre-fill the email field in `LoginPage` on page load.

**Story 2.x** will use `fastify.authenticate` as a preHandler on all task routes — the decorator established in this story is the mechanism all subsequent protected routes depend on.

### References

- [Source: epics.md — Story 1.3 Acceptance Criteria]
- [Source: architecture.md — Authentication & Security table (httpOnly cookie, SameSite=Strict, 30-day JWT, no refresh token)]
- [Source: architecture.md — API Route Surface (POST /api/auth/login, GET /api/auth/me)]
- [Source: architecture.md — Process Patterns / Auth flow]
- [Source: architecture.md — Error Response Shape]
- [Source: architecture.md — Loading states (Button disabled + pixel spinner during auth form submit)]
- [Source: architecture.md — Frontend Architecture / Component File Structure (useAuth.ts, ProtectedRoute)]
- [Source: architecture.md — Enforcement Guidelines (never JWT in localStorage; never log req.body on auth routes)]
- [Source: ux-design-specification.md — Critical Success Moments (daily return — email pre-filled, one click, on list)]
- [Source: ux-design-specification.md — All errors inline, no toast/modal]
- [Source: story 1.1 Dev Agent Record — ESM .js extensions, buildServer pattern, Testcontainers Colima env]
- [Source: story 1.2 Dev Notes — routes/auth.ts plugin structure, getUserByEmail reuse, fastify-plugin usage]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (via GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List
