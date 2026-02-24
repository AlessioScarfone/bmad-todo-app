# Story 1.2: User Registration

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an unregistered user,
I want to create an account with my email and password,
So that I can access the application and my personal task list.

## Acceptance Criteria

**AC1 — Successful registration:**
- **Given** I am on the registration page (`/register`)
- **When** I submit a valid email and password
- **Then** my account is created and I am immediately redirected to the authenticated task list (`/`)
- **And** my password is stored as a bcrypt hash (12 rounds) — never plaintext

**AC2 — Duplicate email:**
- **Given** I attempt to register with an email already in use
- **When** I submit the form
- **Then** I see an inline error message indicating the email is already taken
- **And** no duplicate account is created

**AC3 — Empty field validation (client-side):**
- **Given** I submit the registration form with an empty email or password
- **When** the form is validated
- **Then** I see inline field-level validation errors
- **And** no API call is made

**AC4 — Server-side schema validation:**
- **Given** the registration API receives a request
- **When** the request body is validated server-side via TypeBox schema
- **Then** any invalid input returns `400` with `{ statusCode, error: "BAD_REQUEST", message }` shape
- **And** the request body is never logged

## Tasks / Subtasks

- [ ] **Task 1: Shared types — registration schemas** (AC: AC4)
  - [ ] 1.1 In `shared/types/index.ts`, add:
    - `RegisterBodySchema` → `{ email: Type.String({ format: 'email', minLength: 1 }), password: Type.String({ minLength: 8 }) }`
    - `type RegisterBody = Static<typeof RegisterBodySchema>`
    - `AuthUserSchema` → `{ id: Type.Number(), email: Type.String() }` (the response shape on register/login)
    - `type AuthUser = Static<typeof AuthUserSchema>`
  - [ ] 1.2 Verify `shared/types/index.ts` still compiles cleanly after additions

- [ ] **Task 2: Backend — DB query** (AC: AC1, AC2)
  - [ ] 2.1 Create `backend/src/db/queries/auth.ts`:
    - `getUserByEmail(sql, email: string): Promise<{ id: number; email: string; password_hash: string } | undefined>` — `SELECT id, email, password_hash FROM users WHERE email = $email LIMIT 1`
    - `createUser(sql, email: string, passwordHash: string): Promise<{ id: number; email: string }>` — `INSERT INTO users (email, password_hash) VALUES ($email, $passwordHash) RETURNING id, email`
  - [ ] 2.2 Use the `sql` tagged-template literal from `../client.js` (ESM import with `.js` extension)
  - [ ] 2.3 No default exports — named exports only

- [ ] **Task 3: Backend — auth route plugin** (AC: AC1, AC2, AC4)
  - [ ] 3.1 Create `backend/src/routes/auth.ts` as a Fastify plugin using `fastify-plugin` (`fp`):
    ```typescript
    import fp from 'fastify-plugin'
    import type { FastifyPluginAsync } from 'fastify'
    import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
    // ...
    const authRoutes: FastifyPluginAsync = async (fastify) => {
      const f = fastify.withTypeProvider<TypeBoxTypeProvider>()
      f.post('/auth/register', { schema: { body: RegisterBodySchema } }, async (req, reply) => { ... })
    }
    export default fp(authRoutes)
    ```
  - [ ] 3.2 Install `fastify-plugin`: `npm install fastify-plugin` in `backend/`
  - [ ] 3.3 `POST /auth/register` handler logic:
    - ⚠️ **NEVER log `req.body`** on auth routes
    - Hash password with `bcrypt.hash(password, 12)`
    - Call `createUser()` — catch `unique_violation` (PG error code `23505`) and return `409` with `{ statusCode: 409, error: "CONFLICT", message: "Email already in use" }`
    - On success: return `201` with `{ id, email }` (direct object, no wrapper)
  - [ ] 3.4 Register the auth plugin in `backend/src/server.ts` inside `buildServer()`:
    ```typescript
    fastify.register(authRoutes, { prefix: '/api' })
    ```
    This makes the route accessible at `POST /api/auth/register` (path within plugin: `/auth/register`)

- [ ] **Task 4: Backend — integration tests** (AC: AC1, AC2, AC4)
  - [ ] 4.1 Create `backend/test/routes/auth.test.ts` using Testcontainers:
    - Use `createTestDb()` from `test/helpers/db.ts`
    - Use `buildServer(jwtSecret)` — pass a fixed test secret (e.g. `'test-secret'`)
    - **Wire the test db's `sql` into the server** — see Dev Notes for pattern
    - Test cases:
      - `POST /api/auth/register` with valid body → 201, returns `{ id, email }`, no `password_hash` in response
      - `POST /api/auth/register` with same email twice → 409 `{ statusCode: 409, error: "CONFLICT" }`
      - `POST /api/auth/register` with missing email → 400
      - `POST /api/auth/register` with password shorter than 8 chars → 400
      - Assert `password_hash` stored in DB is NOT equal to plaintext password (bcrypt)
  - [ ] 4.2 Run `npm test` — all tests (previous + new) must pass

- [ ] **Task 5: Frontend — RegisterPage** (AC: AC1, AC2, AC3)
  - [ ] 5.1 Replace the placeholder `frontend/src/pages/RegisterPage.tsx` with a real registration form:
    - Controlled form: `email` + `password` fields
    - Client-side validation on submit: empty email or password → show inline field-level error, **no API call**
    - Email format validation (basic: must contain `@`)
    - Password minimum length: 8 characters — show inline hint
    - Submit calls `api.post<AuthUser>('/auth/register', { email, password })`
    - On success → `navigate('/')` (React Router `useNavigate`)
    - On error (409 from server) → show inline error: "An account with this email already exists"
    - On other error → show generic inline error: "Registration failed. Please try again."
    - Submit button disabled while request is in-flight
    - **Pixel-art aesthetic** (8bitcn-ui / Tailwind) — simple, composed, not celebratory
    - "Already have an account? Log in" link → `/login`
  - [ ] 5.2 No toast or modal errors — **all errors inline only** (per UX spec)
  - [ ] 5.3 Verify TypeScript compiles cleanly: `cd frontend && npx tsc --noEmit`

## Dev Notes

### Previous Story Intelligence (Story 1.1)

> Critical learnings that directly impact this story:

1. **`buildServer(jwtSecret: string)` parameter pattern** — `server.ts` exports `buildServer(jwtSecret)` taking the secret as a parameter (not from `process.env` inside the function). This was the fix for the `string | undefined` TS strict-mode narrowing issue. Auth route registration must happen **inside** `buildServer()`.

2. **ESM `.js` extensions required** — All internal imports use `.js` extension even for `.ts` source files (e.g. `import { sql } from '../db/client.js'`). The project uses `"type": "module"` in `package.json`.

3. **`__dirname` replacement for ESM** — Use `fileURLToPath(import.meta.url)` + `path.dirname()` if file-relative paths are needed in any new files (same pattern as `migrate.ts`).

4. **Testcontainers env setup** — `npm test` script already includes `TESTCONTAINERS_RYUK_DISABLED=true` and `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock`. No changes needed to `package.json` scripts.

5. **Fastify under-pressure owns `/health`** — The health route is registered via `@fastify/under-pressure` `exposeStatusRoute`. Do not add a manual `/health` route. Auth routes go under `/api` prefix.

6. **Tailwind v4 CSS-based config** — `frontend/src/index.css` uses `@import "tailwindcss"` and `@theme {}`. No `tailwind.config.ts` functional changes needed for new components.

7. **`createTestDb()` helper exists** — at `backend/test/helpers/db.ts`. Returns `{ sql, container }`. Always call `await container.stop()` in `afterAll()`.

---

### Wiring Test DB Into `buildServer()` — Critical Pattern

The `buildServer()` function currently does **not** accept a `sql` parameter — the `sql` client is imported at module level in `server.ts`. For integration tests, you need the routes to use the **test database `sql` instance**, not the production one.

**Recommended approach — extend `buildServer()` signature:**

```typescript
// backend/src/server.ts
export function buildServer(jwtSecret: string, sqlOverride?: Sql) {
  // ...
  // When registering auth routes, pass sql to the plugin:
  fastify.register(authRoutes, { prefix: '/api', sql: sqlOverride ?? sql })
}
```

And in `backend/src/routes/auth.ts`, receive `sql` via plugin options:

```typescript
const authRoutes: FastifyPluginAsync<{ sql: Sql }> = async (fastify, opts) => {
  const { sql } = opts
  // use sql in handlers
}
```

In tests:

```typescript
const { sql, container } = await createTestDb()
const app = buildServer('test-secret', sql)
await app.ready()
const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'a@b.com', password: 'password123' } })
```

> If refactoring `buildServer()` to accept `sqlOverride` feels too invasive, an alternative is injecting `sql` via Fastify's decorator: `fastify.decorate('sql', sqlOverride ?? sql)` and reading `fastify.sql` in route handlers. Either approach is acceptable — pick the one that feels cleaner.

---

### Backend Route Structure

```
backend/src/
  routes/
    auth.ts       ← NEW this story (Fastify plugin: POST /auth/register)
  db/
    queries/
      auth.ts     ← NEW this story (getUserByEmail, createUser)
```

**Registration in `server.ts`** (inside `buildServer()`):
```typescript
import authRoutes from './routes/auth.js'
// ...
fastify.register(authRoutes, { prefix: '/api' })
// Makes available: POST /api/auth/register
```

---

### API Contract

**`POST /api/auth/register`**

Request body (TypeBox-validated):
```json
{ "email": "user@example.com", "password": "mypassword123" }
```

Success response — `201 Created`:
```json
{ "id": 1, "email": "user@example.com" }
```
Note: Return **only** `id` and `email` — never return `password_hash` or any other sensitive field.

Error responses:
| Status | `error` | `message` | Trigger |
|--------|---------|-----------|---------|
| `400` | `"BAD_REQUEST"` | TypeBox validation message | Invalid/missing email or password |
| `409` | `"CONFLICT"` | `"Email already in use"` | Duplicate `UNIQUE` constraint violation (PG code `23505`) |
| `500` | `"INTERNAL_SERVER_ERROR"` | `"Internal server error"` | Unexpected DB or runtime error |

**Detecting PG unique violation:**
```typescript
import { DatabaseError } from 'postgres'
// ...
} catch (err) {
  if (err instanceof DatabaseError && err.code === '23505') {
    return reply.status(409).send({ statusCode: 409, error: 'CONFLICT', message: 'Email already in use' })
  }
  throw err  // re-throw for Fastify's global error handler
}
```

---

### Shared Types — Changes to `shared/types/index.ts`

Add to the existing file (do not replace existing schemas):

```typescript
// ─── Auth — Request/Response schemas ─────────────────────────────────────────

export const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email', minLength: 1 }),
  password: Type.String({ minLength: 8 }),
})
export type RegisterBody = Static<typeof RegisterBodySchema>

export const AuthUserSchema = Type.Object({
  id: Type.Number(),
  email: Type.String(),
})
export type AuthUser = Static<typeof AuthUserSchema>
```

The existing `UserSchema` (which includes `created_at`) is a full DB-row type. `AuthUserSchema` is the slim response type for auth endpoints — just `id` + `email`. Both coexist.

---

### Frontend Registration Form — Key Constraints

1. **No API call on empty fields** (AC3) — validate before calling `api.post()`
2. **All errors inline** — no toast, no modal, no auto-dismissing banners (UX spec)
3. **Relative path** — `api.post('/auth/register', ...)` (not `http://localhost:3001/...`)
4. **`api.ts` already handles non-ok responses** — throws an `Error` with `.statusCode` attached; catch it in the form handler and inspect `err.statusCode === 409`
5. **`useNavigate()`** from `react-router-dom` for redirect after successful registration
6. **TypeScript strict** — no `any`; type the form state and the caught error properly

Minimal form state shape:
```typescript
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [emailError, setEmailError] = useState<string | null>(null)
const [passwordError, setPasswordError] = useState<string | null>(null)
const [serverError, setServerError] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)
```

---

### Testing Standards

- **Test location:** `backend/test/routes/auth.test.ts` (mirrors `backend/src/routes/auth.ts`)
- **Pattern:** Testcontainers real PostgreSQL — same pattern as `backend/test/db/migrate.test.ts`
- **Use `app.inject()`** for HTTP testing within Vitest (no real HTTP server needed in tests)
- **`afterAll`** must call `await container.stop()` and `await app.close()`
- **`TESTCONTAINERS_RYUK_DISABLED=true`** — already in `package.json` test script; no changes needed
- **No mocking of bcrypt or the DB** — test against real implementations

---

### QA Regression Guard

The Testcontainers test for Story 1.1 (`backend/test/db/migrate.test.ts`) must still pass after this story. Do not alter `001_init.sql`. No new migration file is needed for Story 1.2 — the `users` table already exists.

---

### What NOT to Build in This Story

| Feature | Belongs to |
|---|---|
| Login (`POST /api/auth/login`) | Story 1.3 |
| Session check (`GET /api/auth/me`) | Story 1.3 |
| JWT cookie issuance | Story 1.3 |
| Logout (`POST /api/auth/logout`) | Story 1.4 |
| Email pre-fill in localStorage | Story 1.4 |
| Redirect unauthenticated users to `/login` | Story 1.3 |
| `LoginPage.tsx` implementation | Story 1.3 |
| Task list real implementation | Story 2.x |

The `TaskListPage.tsx` and `LoginPage.tsx` remain as placeholders. After successful registration, redirect to `/` — it will be a placeholder page, that is expected and correct for this story.

---

### Cross-Story Context (for awareness only)

**Story 1.3** will extend `auth.ts` query file with `getUserByEmail()` (already added here — reused). It will add `POST /api/auth/login` and `GET /api/auth/me` to the **same** `routes/auth.ts` plugin. The plugin will also issue the JWT httpOnly cookie on login. The `buildServer()` pattern established here (auth plugin registered with `{ prefix: '/api' }`) is the template for login/me routes.

**Story 1.4** will use `auth.ts` (frontend `lib/auth.ts`) to save email to `localStorage` after login, and clear it on logout — functions already stubbed in `frontend/src/lib/auth.ts`.

### Project Structure Notes

- `fastify-plugin` must be installed (`npm install fastify-plugin --save` inside `backend/`)
- This is the first story to use `fastify-plugin` — it is mandatory for Fastify's encapsulation model; route plugins must be wrapped with `fp()` to share parent decorators (like `fastify.jwt`)
- `backend/src/routes/` directory is new this story — create it

### References

- [Source: epics.md — Story 1.2 Acceptance Criteria]
- [Source: architecture.md — Authentication & Security table]
- [Source: architecture.md — API Route Surface (`POST /api/auth/register`)]
- [Source: architecture.md — Error Response Shape]
- [Source: architecture.md — ADR-002 Backend Framework (TypeBox + type-provider-typebox)]
- [Source: architecture.md — ADR-004 Query Layer (postgres tagged templates)]
- [Source: architecture.md — ADR-005 Testing Stack (Vitest + Testcontainers)]
- [Source: architecture.md — Naming Patterns (snake_case DB, camelCase TS)]
- [Source: architecture.md — API responses — Success single resource returns object directly]
- [Source: architecture.md — Process Patterns / Auth flow]
- [Source: architecture.md — Enforcement Guidelines (never log req.body on auth routes)]
- [Source: story 1.1 Dev Agent Record — JWT_SECRET type narrowing fix]
- [Source: story 1.1 Dev Agent Record — ESM .js extensions]
- [Source: story 1.1 Dev Agent Record — Testcontainers Colima env setup]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (via GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List
