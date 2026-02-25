# Story 2.1: Task List View & Database Foundation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to see my personal task list when I log in, with an always-visible inline creation row at the top,
So that I can immediately start adding tasks without any extra navigation.

## Acceptance Criteria

**AC1 — Inline creation row always visible:**
- **Given** I am authenticated and navigate to the task list
- **When** the page loads
- **Then** I see an inline task creation row permanently visible at the top of the list (no modal, no "+ New Task" button opening a form)
- **And** the row contains a text input and a submit affordance (Enter key or button)

**AC2 — Empty state:**
- **Given** I have no tasks yet
- **When** the task list loads
- **Then** I see an empty state with a prompt to add my first task
- **And** the task count in the header shows `0/0`

**AC3 — `GET /api/tasks` returns only the authenticated user's tasks:**
- **Given** `GET /api/tasks` is called with a valid session cookie
- **When** the request is authenticated
- **Then** only tasks belonging to the authenticated user are returned (`WHERE user_id = $userId`)
- **And** the response is a direct array (no `{ data: [...] }` wrapper)
- **And** the response status is `200 OK`

**AC4 — Schema integrity (integration test only):**
- **Given** the `002_tasks.sql` migration has run
- **When** the database schema is inspected
- **Then** the `tasks` table has exactly these columns: `id`, `user_id`, `title`, `is_completed`, `completed_at`, `deadline`, `created_at`, `updated_at`
- **And** the table has NO `points` or `is_system` columns
- **And** the required indexes exist: `idx_tasks_user_id`, `idx_tasks_completed`, `idx_tasks_deadline`

> **Developer note (QA-5):** Schema verification (AC4) cannot be UI-verified. It MUST be asserted in a Vitest integration test using Testcontainers against a real PostgreSQL container. The test should query `information_schema.columns` to verify column names.

## Tasks / Subtasks

- [x] **Task 1: Database — `002_tasks.sql` migration** (AC: AC4)
  - [x] 1.1 Create `backend/src/db/migrations/002_tasks.sql`:
    ```sql
    -- 002_tasks.sql
    -- Creates the tasks table (Story 2.1)
    -- labels, task_labels, subtasks tables are added in Story 3.x

    CREATE TABLE IF NOT EXISTS tasks (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      deadline     DATE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(user_id, is_completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(user_id, deadline) WHERE deadline IS NOT NULL;
    ```
  - [x] 1.2 The existing `migrate.ts` runner reads all `.sql` files in `migrations/` in filename order and tracks them in `_migrations`. No changes to `migrate.ts` are required — drop the file and the runner picks it up automatically.
  - [x] 1.3 Verify migration runs cleanly: `docker-compose up --build` (api logs should show `002_tasks.sql` applied)

- [x] **Task 2: Backend types — `backend/src/types/tasks.ts`** (AC: AC3)
  - [x] 2.1 Create `backend/src/types/tasks.ts` following the pattern from `backend/src/types/auth.ts`:
    ```typescript
    import { Type, type Static } from '@sinclair/typebox'

    export const TaskSchema = Type.Object({
      id:           Type.Number(),
      user_id:      Type.Number(),
      title:        Type.String(),
      is_completed: Type.Boolean(),
      completed_at: Type.Union([Type.String(), Type.Null()]),
      deadline:     Type.Union([Type.String(), Type.Null()]),
      created_at:   Type.String(),
      updated_at:   Type.String(),
    })

    export type Task = Static<typeof TaskSchema>
    ```
  - [x] 2.2 Verify TypeScript compiles: `cd backend && npx tsc --noEmit`

- [x] **Task 3: Backend query — `backend/src/db/queries/tasks.ts`** (AC: AC3)
  - [x] 3.1 Create `backend/src/db/queries/tasks.ts`:
    ```typescript
    import type { Sql } from 'postgres'
    import type { Task } from '../../types/tasks.js'

    export const getTasks = (sql: Sql, userId: number): Promise<Task[]> =>
      sql<Task[]>`
        SELECT id, user_id, title, is_completed, completed_at, deadline, created_at, updated_at
        FROM tasks
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `
    ```
  - [x] 3.2 Explicit column selection (no `SELECT *`) — this ensures the query never accidentally returns extra columns if the schema changes.
  - [x] 3.3 `ORDER BY created_at DESC` — newest tasks appear first; this is the default sort (no user-configurable sort until Epic 4).
  - [x] 3.4 Verify TypeScript compiles: `cd backend && npx tsc --noEmit`

- [x] **Task 4: Backend route — `backend/src/routes/tasks.ts`** (AC: AC3)
  - [x] 4.1 Create `backend/src/routes/tasks.ts` as a `fastify-plugin` wrapped plugin (same pattern as `auth.ts`):
    ```typescript
    import fp from 'fastify-plugin'
    import type { FastifyPluginAsync } from 'fastify'
    import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
    import { getTasks } from '../db/queries/tasks.js'

    const taskRoutes: FastifyPluginAsync = async fastify => {
      const f = fastify.withTypeProvider<TypeBoxTypeProvider>()

      f.get(
        '/tasks',
        {
          preHandler: [fastify.authenticate],
        },
        async (req, reply) => {
          const userId = (req.user as { id: number }).id
          const tasks = await getTasks(fastify.sql, userId)
          return reply.status(200).send(tasks)
        },
      )
    }

    export default fp(taskRoutes)
    ```
  - [x] 4.2 `preHandler: [fastify.authenticate]` — every task route MUST be protected. The `authenticate` decorator is already declared in `server.ts` via `fastify.decorate('authenticate', ...)`.
  - [x] 4.3 `req.user` cast — `@fastify/jwt` injects the decoded payload as `req.user` after `jwtVerify()`. The payload shape (from `POST /auth/login`) is `{ id, email }`. Cast as `{ id: number }` to extract the userId.
  - [x] 4.4 Response is a direct array — no `{ data: [...] }` wrapper (architecture rule: collection responses are direct arrays).
  - [x] 4.5 The `preHandler` accepts `query params` (`?label=`, `?status=`, `?deadline=`, `?sort=`) per the route surface definition, but filtering/sorting is implemented in Epic 4. For now, return all tasks for the user unfiltered. The query params are silently ignored.

- [x] **Task 5: Register tasks route in `server.ts`** (AC: AC3)
  - [x] 5.1 In `backend/src/server.ts`, import and register `taskRoutes` alongside `authRoutes`:
    ```typescript
    import taskRoutes from './routes/tasks.js'
    ```
    ```typescript
    // After authRoutes registration:
    fastify.register(taskRoutes, {
      prefix: '/api',
    })
    ```
  - [x] 5.2 The `prefix: '/api'` means `GET /tasks` inside the plugin becomes `GET /api/tasks` externally.
  - [x] 5.3 Verify TypeScript compiles: `cd backend && npx tsc --noEmit`

- [x] **Task 6: Backend tests — schema verification + `getTasks` query** (AC: AC4)
  - [x] 6.1 Create `backend/test/db/queries/tasks.test.ts`:
    ```typescript
    import { describe, it, expect, beforeAll, afterAll } from 'vitest'
    import { createTestDb } from '../helpers/db'
    import { getTasks } from '../../src/db/queries/tasks'

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
        const names = columns.map(c => c.column_name)
        expect(names).toEqual(
          expect.arrayContaining(['id', 'user_id', 'title', 'is_completed', 'completed_at', 'deadline', 'created_at', 'updated_at'])
        )
        // QA-5 explicit: no stale/gamification columns
        expect(names).not.toContain('points')
        expect(names).not.toContain('is_system')
        expect(names).toHaveLength(8) // exactly 8 columns — no extras
      })

      it('required indexes exist', async () => {
        const indexes = await ctx.sql<{ indexname: string }[]>`
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'tasks'
        `
        const names = indexes.map(i => i.indexname)
        expect(names).toContain('idx_tasks_user_id')
        expect(names).toContain('idx_tasks_completed')
        expect(names).toContain('idx_tasks_deadline')
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
        expect(u1Tasks[0].user_id).toBe(u1.id)
      })

      it('getTasks returns empty array when user has no tasks', async () => {
        const [u3] = await ctx.sql`
          INSERT INTO users (email, password_hash) VALUES ('c@test.com', 'hash3') RETURNING id
        `
        const tasks = await getTasks(ctx.sql, u3.id)
        expect(tasks).toEqual([])
      })
    })
    ```

- [x] **Task 7: Backend tests — `GET /api/tasks` route** (AC: AC3)
  - [x] 7.1 Create `backend/test/routes/tasks.test.ts`:
    ```typescript
    import { describe, it, expect, beforeAll, afterAll } from 'vitest'
    import { createTestDb } from '../helpers/db'
    import { buildServer } from '../../src/server'
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
    ```
  - [x] 7.2 Run all tests: `cd backend && npm test` — all existing auth + migrate tests must still pass alongside new tasks tests.

- [x] **Task 8: Frontend types — `frontend/src/types/tasks.ts`** (no AC, enables typing downstream)
  - [x] 8.1 Create `frontend/src/types/tasks.ts` (plain TypeScript interface matching the API response shape):
    ```typescript
    export interface Task {
      id: number
      user_id: number
      title: string
      is_completed: boolean
      completed_at: string | null
      deadline: string | null
      created_at: string
      updated_at: string
    }
    ```
  - [x] 8.2 **No cross-package imports** — frontend types are kept in sync with the backend TypeBox schema manually (architecture ADR update, Story 1.2). Do not import from `backend/`.

- [x] **Task 9: Frontend hook — `frontend/src/hooks/useTasks.ts`** (AC: AC2, AC3)
  - [x] 9.1 Create `frontend/src/hooks/useTasks.ts`:
    ```typescript
    import { useQuery } from '@tanstack/react-query'
    import { api } from '../lib/api'
    import type { Task } from '../types/tasks'

    export function useTasks() {
      return useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.get<Task[]>('/tasks'),
        staleTime: 30_000, // 30s — avoids unnecessary refetches on tab focus
      })
    }
    ```
  - [x] 9.2 `queryKey: ['tasks']` — this key is used throughout Epic 2 for optimistic mutations (`queryClient.setQueryData(['tasks'], ...)`) and invalidations (`queryClient.invalidateQueries({ queryKey: ['tasks'] })`). **Never change this key without updating all mutation files in Stories 2.2–2.5.**
  - [x] 9.3 Check that `api.get<T>()` exists in `frontend/src/lib/api.ts`. If only `api.post` is implemented, add a `get` method following the same pattern. The `api` wrapper sends credentials via the cookie automatically on same-origin requests.

- [x] **Task 10: Frontend component — `frontend/src/components/TaskCountDisplay.tsx`** (AC: AC2)
  - [x] 10.1 Create `frontend/src/components/TaskCountDisplay.tsx`:
    ```tsx
    interface TaskCountDisplayProps {
      completed: number
      total: number
    }

    export function TaskCountDisplay({ completed, total }: TaskCountDisplayProps) {
      return (
        <span
          className="font-pixel text-[8px] text-gray-600"
          aria-label={`Tasks completed: ${completed} of ${total}`}
          aria-live="polite"
        >
          {completed}/{total}
        </span>
      )
    }
    ```
  - [x] 10.2 `aria-live="polite"` — as per UX spec: count updates are announced by screen readers without interrupting current speech.
  - [x] 10.3 `aria-label="Tasks completed: N of M"` — exact ARIA label format from UX spec. Do not use a different phrase.
  - [x] 10.4 No animation on count change — UX spec: "static number update, no animation". Do not add CSS transitions/animations to the count.
  - [x] 10.5 `font-pixel text-[8px]` — matches the pattern in `AppHeader.tsx`. Uses the CSS-based Tailwind v4 font utility (the project uses `font-pixel` as a custom class defined in `index.css`, not `font-['Press_Start_2P']`).

- [x] **Task 11: Update `AppHeader.tsx` to render `TaskCountDisplay`** (AC: AC2)
  - [x] 11.1 Modify `frontend/src/components/AppHeader.tsx`:
    - Import `TaskCountDisplay`
    - Accept `tasks` prop (or `completed`/`total` computed outside — preferred: pass raw counts)
    - Replace the `{/* TODO Story 2.3: <TaskCountDisplay /> goes here */}` comment with the actual component
    ```tsx
    import { TaskCountDisplay } from './TaskCountDisplay'

    interface AppHeaderProps {
      userEmail?: string
      completedTasks: number
      totalTasks: number
    }

    export function AppHeader({ userEmail, completedTasks, totalTasks }: AppHeaderProps) {
      // ... existing logout logic unchanged ...
      return (
        <header className="flex items-center justify-between px-6 py-3 border-b-4 border-black bg-white">
          <h1 className="font-pixel text-[10px]">bmad-todo</h1>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="font-pixel text-[8px] text-gray-500 hidden sm:block" aria-label={`Logged in as ${userEmail}`}>
                {userEmail}
              </span>
            )}
            <TaskCountDisplay completed={completedTasks} total={totalTasks} />
            <button onClick={handleLogout} disabled={isLoggingOut} aria-label="Log out"
              className="font-pixel text-[8px] px-3 py-2 border-2 border-black bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px">
              {isLoggingOut ? '...' : 'Logout'}
            </button>
          </div>
        </header>
      )
    }
    ```
  - [x] 11.2 The `completedTasks` and `totalTasks` prop values are computed in `TaskListPage` (Task 12) from the TanStack Query cache — **no separate API call** (architecture rule).
  - [x] 11.3 Verify TypeScript compiles: `cd frontend && npx tsc --noEmit`

- [x] **Task 12: Update `TaskListPage.tsx` — task list, empty state, inline creation row UI** (AC: AC1, AC2)
  - [x] 12.1 Replace the placeholder content in `frontend/src/pages/TaskListPage.tsx`:
    ```tsx
    import { AppHeader } from '../components/AppHeader'
    import { useAuth } from '../hooks/useAuth'
    import { useTasks } from '../hooks/useTasks'
    import { EmptyState } from '../components/EmptyState'
    import { InlineTaskInput } from '../components/InlineTaskInput'

    export default function TaskListPage() {
      const { user } = useAuth()
      const { data: tasks = [], isLoading } = useTasks()

      // Task count derived client-side — no extra API call (architecture rule)
      const completedTasks = tasks.filter(t => t.is_completed).length
      const totalTasks = tasks.length

      return (
        <div className="min-h-screen bg-gray-50">
          <AppHeader
            userEmail={user?.email}
            completedTasks={completedTasks}
            totalTasks={totalTasks}
          />
          <main className="max-w-2xl mx-auto px-4 py-8">
            {/* Inline creation row — always visible at top (AC1 / UX spec) */}
            <InlineTaskInput />

            {/* Task list or empty state */}
            {isLoading ? null : tasks.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="mt-4 space-y-2" aria-label="Task list">
                {tasks.map(task => (
                  <li key={task.id} className="p-3 border-2 border-black bg-white font-pixel text-[8px]">
                    {task.title}
                  </li>
                ))}
              </ul>
            )}
          </main>
        </div>
      )
    }
    ```
  - [x] 12.2 `tasks = []` default — when the query is loading or returns undefined, `tasks` defaults to `[]`, so `completedTasks = 0`, `totalTasks = 0`, which renders `0/0` in the header (satisfying AC2).
  - [x] 12.3 `isLoading ? null` — suppress both the empty state and the list while the first fetch is in flight; avoids FOUC (flash of empty state).
  - [x] 12.4 The task list `<li>` items in this story are minimal stubs. Full task row UI (checkbox, edit, delete) is built in Stories 2.2–2.5. Keep them simple here.
  - [x] 12.5 Verify TypeScript compiles: `cd frontend && npx tsc --noEmit`

- [x] **Task 13: Frontend component — `frontend/src/components/EmptyState.tsx`** (AC: AC2)
  - [x] 13.1 Create `frontend/src/components/EmptyState.tsx`:
    ```tsx
    export function EmptyState() {
      return (
        <div
          className="mt-8 text-center"
          aria-live="polite"  // UX spec: aria-live="polite" on empty state region
        >
          <p className="font-pixel text-[8px] text-gray-500">
            No tasks yet. Add your first task above!
          </p>
        </div>
      )
    }
    ```
  - [x] 13.2 `aria-live="polite"` — UX spec requirement for the empty state region.

- [x] **Task 14: Frontend component — `frontend/src/components/InlineTaskInput.tsx` (stub)** (AC: AC1)
  - [x] 14.1 Create `frontend/src/components/InlineTaskInput.tsx` as a **UI-only stub** — input renders but submission (`POST /api/tasks`) is implemented in Story 2.2:
    ```tsx
    export function InlineTaskInput() {
      return (
        <div className="flex gap-2 p-3 border-2 border-black bg-white">
          <input
            type="text"
            placeholder="Add a task..."
            className="flex-1 font-pixel text-[8px] outline-none bg-transparent"
            aria-label="New task title"
            disabled  // Story 2.2 will enable and wire up onKeyDown + mutation
          />
          <span className="font-pixel text-[8px] text-gray-400">↵</span>
        </div>
      )
    }
    ```
  - [x] 14.2 The input is `disabled` in this story because `POST /api/tasks` has not been implemented yet. Story 2.2 will remove `disabled`, wire up the `onKeyDown` handler, and implement the optimistic mutation.
  - [x] 14.3 Keep the component isolated — do not inline the creation row directly in `TaskListPage`. Story 2.2 will add the mutation logic inside `InlineTaskInput`.

- [x] **Task 15: Smoke test end-to-end** (AC: AC1, AC2, AC3)
  - [x] 15.1 Run `docker-compose up --build` — verify all three services start cleanly.
  - [x] 15.2 Log in → verify redirect to task list.
  - [x] 15.3 Task list renders with the inline creation row at the top (input is visible, disabled).
  - [x] 15.4 Header shows `0/0` task count.
  - [x] 15.5 Empty state message is visible below the creation row.
  - [x] 15.6 `GET http://localhost:3000/api/tasks` via DevTools Network tab → verify `200 OK` with `[]` response.
  - [x] 15.7 Run `cd backend && npm test` — all tests pass (existing auth + migrate + new tasks tests).

## Dev Notes

### This Story's Position in Epic 2

> Story 2.1 is the **database + API foundation** for all subsequent task stories. It establishes the `tasks` table, query layer, and `GET /api/tasks` endpoint. Stories 2.2–2.5 build CRUD operations on top of this foundation without altering the table schema again.

### Previous Story Intelligence (Epic 1 — always applies)

#### From Story 1.1 (permanent rules)
1. **ESM `.js` extensions in backend imports** — all internal TypeScript imports in the backend use `.js` extension (e.g., `import { getTasks } from '../db/queries/tasks.js'`). The TypeScript compiler resolves `.js` → `.ts` at compile time. **Frontend (Vite) does NOT need `.js` extensions in `.tsx` files.**
2. **`buildServer(jwtSecret, sqlOverride?)` signature** — the second argument `sqlOverride` exists for Testcontainers injection in tests. Do not change this signature.
3. **Testcontainers colima env** — `npm test` in `backend/package.json` already includes `TESTCONTAINERS_RYUK_DISABLED=true DOCKER_HOST=...`. No modifications needed.

#### From Story 1.2 (permanent rules)
4. **Routes use `fastify-plugin` (`fp`) wrapping** — see `routes/auth.ts` for the exact pattern. All new route plugins follow the same `fp(taskRoutes)` export.
5. **Error handler on each plugin** — `auth.ts` sets a custom `setErrorHandler` for TypeBox validation errors. Add the same handler to `taskRoutes` if schema validation is added (not needed in this story since `GET /tasks` takes no body).
6. **Shared types rule (ADR update):** Types are **not** shared via a root `shared/` package. Backend types live in `backend/src/types/`, frontend types in `frontend/src/types/`. Keep in sync manually.

#### From Story 1.4 (relevant to AppHeader change)
7. **`AppHeader.tsx` already exists** at `frontend/src/components/AppHeader.tsx`. This story extends its props interface (adds `completedTasks`, `totalTasks`). The logout logic is **unchanged** — do not touch `handleLogout`.
8. **`queryClient.clear()` in logout clears `['tasks']`** — when the user logs out, the tasks cache is wiped. On next login, `useTasks` fetches fresh. This is correct behaviour.
9. **`font-pixel` not `font-['Press_Start_2P']`** — during Epic 1 implementation, the font utility class was shortened to `font-pixel` via a Tailwind v4 CSS alias in `index.css`. Use `font-pixel`, not the raw font-family string.

### Backend: Route Pattern (mirror of `auth.ts`)

```typescript
// backend/src/routes/tasks.ts
import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { getTasks } from '../db/queries/tasks.js'  // ← note .js extension

const taskRoutes: FastifyPluginAsync = async fastify => {
  const f = fastify.withTypeProvider<TypeBoxTypeProvider>()
  // routes go here
}

export default fp(taskRoutes)  // ← fp() wrapping is required
```

### Backend: `fastify.sql` decorator

The `sql` client is injected via `backend/src/plugins/db.ts` as `fastify.sql`. It is available on the `fastify` instance inside any plugin registered after `dbPlugin`. Since `taskRoutes` is registered in `buildServer()` after `dbPlugin`, `fastify.sql` is available. Pass it to query functions: `getTasks(fastify.sql, userId)`.

### Backend: TypeScript `types.d.ts` augmentation

`backend/src/types.d.ts` contains module augmentation for Fastify. If a TypeScript error arises from `fastify.sql`, check that the property is augmented there. The `sql` property should already be declared from Story 1.1.

### Frontend: `api.ts` — verify `get` method exists

The `api` wrapper in `frontend/src/lib/api.ts` was used in Stories 1.2–1.4 with `api.post(...)`. **Verify a `get<T>(path)` method exists.** If not, add:
```typescript
get: <T>(path: string): Promise<T> =>
  fetch(`/api${path}`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }).then(r => r.json() as Promise<T>),
```
Follow the existing error handling pattern in `api.ts` (throw on non-2xx).

### Frontend: TanStack Query `queryKey: ['tasks']` convention

All task-related mutations in Epic 2 will use:
```typescript
await queryClient.cancelQueries({ queryKey: ['tasks'] })
queryClient.setQueryData(['tasks'], ...)       // optimistic update
queryClient.invalidateQueries({ queryKey: ['tasks'] })  // after settle
```
The key `['tasks']` must be used consistently. `useTasks` is the single source of truth for this key.

### Frontend: Task Count is Client-Side Derived (architecture rule)

```typescript
// ✅ Correct — derived from TanStack Query cache, zero extra API call
const completedTasks = tasks.filter(t => t.is_completed).length
const totalTasks = tasks.length

// ❌ Wrong — do NOT create a separate /api/task-count endpoint
// ❌ Wrong — do NOT use useQuery with a separate count query key
```

This is an explicit architecture decision (ADR + FR21). The count updates atomically with task mutations because they all modify the `['tasks']` cache.

### UX: Inline Creation Row Rules (from UX spec)

- **Always visible** — do not conditionally hide behind a button or modal
- **No separate "+ New Task" button** that opens a form — the row IS the form
- **Tab / Enter** as primary submit mechanism (implemented in Story 2.2)
- **No spinner on submit** — optimistic UI (Story 2.2)
- In this story, the input is `disabled` (stub only). Story 2.2 activates it.

### ARIA Requirements (from UX spec)

| Element | ARIA |
|---|---|
| `TaskCountDisplay` | `aria-label="Tasks completed: N of M"`, `aria-live="polite"` |
| `EmptyState` | `aria-live="polite"` |
| Task list | `aria-label="Task list"` on `<ul>` |
| Inline task input | `aria-label="New task title"` |

### Project Structure: Files Created in This Story

```
backend/
  src/
    db/
      migrations/002_tasks.sql       ← NEW
      queries/tasks.ts               ← NEW
    types/tasks.ts                   ← NEW
    routes/tasks.ts                  ← NEW
    server.ts                        ← MODIFIED (register taskRoutes)
  test/
    db/queries/tasks.test.ts         ← NEW
    routes/tasks.test.ts             ← NEW

frontend/
  src/
    types/tasks.ts                   ← NEW
    hooks/useTasks.ts                ← NEW
    components/
      TaskCountDisplay.tsx           ← NEW
      EmptyState.tsx                 ← NEW
      InlineTaskInput.tsx            ← NEW (stub)
      AppHeader.tsx                  ← MODIFIED (add TaskCountDisplay, extend props)
    pages/TaskListPage.tsx           ← MODIFIED (full task list layout)
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — tasks table schema, indexes, client-side count derivation
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — route surface, error response shape, direct array responses
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — TanStack Query optimistic UI pattern, component file structure, state management split
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-004] — `postgres` raw SQL pattern, query file structure
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-005] — Vitest + Testcontainers pattern, `createTestDb` helper
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — Story acceptance criteria, QA-5 note
- [Source: _bmad-output/planning-artifacts/epics.md#Additional Requirements] — Inline creation row, task count ARIA, `prefers-reduced-motion`
- [Source: _bmad-output/implementation-artifacts/1-4-email-pre-fill-on-return-logout.md#Dev Notes] — Previous story intelligence (ESM `.js` extensions, `fp` pattern, `font-pixel`, AppHeader structure)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Fastify `authenticate` decorator ordering bug: decorator must be declared before route plugins that reference `fastify.authenticate` in `preHandler`. Moving the `decorate()` call before `register(taskRoutes, ...)` resolved the 404 on `GET /api/tasks`.
- Backend test file `test/db/queries/tasks.test.ts` imports required `../../helpers/db.js` path (one extra `../` since the file is nested in `db/queries/`), and `.js` extensions on all internal imports per ESM rules.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created
- Tasks 1–15 implemented and verified. All 31 backend tests pass (4 new + 27 existing). TypeScript compiles clean in both backend and frontend. Docker stack rebuilt with `002_tasks.sql` migration applied. `GET /api/tasks` is authenticated, returns direct array, and scoped per user. Frontend renders `InlineTaskInput` (stub), `EmptyState`, `TaskCountDisplay` (0/0 on empty), and task list stubs.
- Code review remediation applied: inline creation row now includes a button submit affordance, `/api/tasks` accepts typed query params (`label`, `status`, `deadline`, `sort`) while still returning unfiltered user tasks, API task payload fields standardized to camelCase, and `idx_tasks_completed` aligned to partial-index strategy.

### Senior Developer Review (AI)

- Outcome: **Approved after fixes**
- High/medium issues from review were resolved in code and validated with backend tests (`31 passed`).
- Story status moved from `review` to `done`; sprint tracking synced accordingly.

### File List

- backend/src/db/migrations/002_tasks.sql
- backend/src/types/tasks.ts
- backend/src/db/queries/tasks.ts
- backend/src/routes/tasks.ts
- backend/src/server.ts
- backend/test/db/queries/tasks.test.ts
- backend/test/routes/tasks.test.ts
- frontend/src/types/tasks.ts
- frontend/src/hooks/useTasks.ts
- frontend/src/components/TaskCountDisplay.tsx
- frontend/src/components/EmptyState.tsx
- frontend/src/components/InlineTaskInput.tsx
- frontend/src/components/AppHeader.tsx
- frontend/src/pages/TaskListPage.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-02-25: Story 2.1 implemented — tasks DB migration, `GET /api/tasks` backend route + tests, frontend task list page with inline creation row stub, empty state, and task count display (claude-sonnet-4-6)
- 2026-02-25: Code review remediation — fixed AC1 submit affordance, added typed `/api/tasks` query params surface, aligned task API fields to camelCase, aligned `idx_tasks_completed` partial index, and synchronized sprint status to done (GPT-5.3-Codex)
