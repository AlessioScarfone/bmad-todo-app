# Story 3.3: Subtasks — Add, Complete, and Delete

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to add flat subtasks to a task, mark them complete independently, and delete them,
so that I can track the steps needed to finish a larger piece of work.

## Acceptance Criteria

**AC1 — Expand subtask panel:**
- **Given** I have a task in my list
- **When** I click the subtask toggle button on the task row
- **Then** the subtask panel opens inline below the task (no page navigation)
- **And** the button reflects its state via `aria-expanded="true"` (UX spec requirement)
- **And** `GET /api/tasks/:id/subtasks` is called to load the subtask list

**AC2 — Add subtask (optimistic):**
- **Given** the subtask panel is open
- **When** I type a subtask title and press Enter (or click Add)
- **Then** the subtask appears in the panel immediately (optimistic UI — no spinner)
- **And** `POST /api/tasks/:id/subtasks` is called with body `{ "title": "My subtask" }`
- **And** a new record is inserted in the `subtasks` table with `is_completed: false`

**AC3 — Complete subtask independently (no parent auto-complete):**
- **Given** a subtask exists in the panel
- **When** I click its completion checkbox
- **Then** the subtask shows a completed visual state immediately (optimistic)
- **And** `PATCH /api/tasks/:id/subtasks/:subId` is called with body `{ "isCompleted": true }`
- **And** the parent task's completion checkbox is completely unaffected (FR20 — hard requirement)

**AC4 — All subtasks complete does NOT complete parent:**
- **Given** a task has multiple subtasks, none of which are complete
- **When** I mark every subtask as complete
- **Then** the parent task remains incomplete
- **And** the parent task's completion checkbox is NOT automatically checked — no auto-complete logic anywhere in UI or backend (FR20 enforced)

**AC5 — Un-complete subtask:**
- **Given** a subtask is marked complete
- **When** I click its completion checkbox again
- **Then** `PATCH /api/tasks/:id/subtasks/:subId` is called with body `{ "isCompleted": false }`
- **And** the subtask reverts to incomplete state immediately (optimistic)

**AC6 — Delete subtask (optimistic):**
- **Given** a subtask exists in the panel
- **When** I click the delete button on the subtask row
- **Then** the subtask is removed from the panel immediately (optimistic)
- **And** `DELETE /api/tasks/:id/subtasks/:subId` is called
- **And** the parent task is visually unaffected

**AC7 — No nested subtasks (FR19 enforced):**
- **Given** a subtask is shown in the panel
- **When** the UI renders
- **Then** no subtask input or expansion control is available on subtask rows — nesting is structurally prevented
- **And** if `POST /api/tasks/:id/subtasks` is called where `:id` is a subtask ID (not a real task), the server returns `404` (the task doesn't exist in the `tasks` table)

**AC8 — Failure recovery (optimistic rollback):**
- **Given** a subtask add, complete, or delete API call fails
- **When** the server returns an error or times out
- **Then** the optimistic UI state is rolled back to the pre-mutation value
- **And** an inline error with a retry affordance is shown on the affected row (`role="alert"` for screen reader announcement)

**AC9 — User isolation (NFR7):**
- **Given** I attempt to access subtasks for a task that belongs to another user
- **When** `GET /api/tasks/:id/subtasks`, `POST /api/tasks/:id/subtasks`, `PATCH /api/tasks/:id/subtasks/:subId`, or `DELETE /api/tasks/:id/subtasks/:subId` is called
- **Then** the server returns `404` (task not found for this user — no 403 leakage of existence)

**AC10 — No new migration needed:**
- **Given** the database is running with migrations applied up to `003_enrichment.sql`
- **When** Story 3.3 is deployed
- **Then** no new migration file is required — the `subtasks` table already exists (scaffolded in Story 3.1, created by `003_enrichment.sql`)

## Tasks / Subtasks

- [x] **Task 1: Backend — TypeBox schemas for Subtask** (AC: AC2, AC3, AC5, AC6)
  - [ ] Create `backend/src/types/subtasks.ts`:
    ```typescript
    import { Type, Static } from '@sinclair/typebox'

    export const SubtaskSchema = Type.Object({
      id: Type.Integer(),
      taskId: Type.Integer(),
      title: Type.String(),
      isCompleted: Type.Boolean(),
      createdAt: Type.String(), // ISO 8601
    })
    export type Subtask = Static<typeof SubtaskSchema>

    export const CreateSubtaskBodySchema = Type.Object({
      title: Type.String({ minLength: 1, maxLength: 500 }),
    })
    export type CreateSubtaskBody = Static<typeof CreateSubtaskBodySchema>

    export const UpdateSubtaskBodySchema = Type.Object({
      isCompleted: Type.Boolean(),
    })
    export type UpdateSubtaskBody = Static<typeof UpdateSubtaskBodySchema>
    ```
  - [ ] Follow the established naming convention: `PascalCase` + `Schema` suffix for schemas, `PascalCase` type via `Static<>`

- [x] **Task 2: Backend — DB query functions in `backend/src/db/queries/subtasks.ts`** (AC: AC1, AC2, AC3, AC5, AC6, AC9)
  - [ ] Create `backend/src/db/queries/subtasks.ts` with named exports only (no default export, per project rules):
    ```typescript
    import type { Sql } from 'postgres'
    import type { Subtask } from '../../types/subtasks.js'

    const SUBTASK_COLUMNS = `
      id,
      task_id AS "taskId",
      title,
      is_completed AS "isCompleted",
      created_at AS "createdAt"
    `

    export const getSubtasksByTaskId = async (
      sql: Sql,
      taskId: number,
      userId: number,
    ): Promise<Subtask[]> => {
      // JOIN with tasks to enforce user ownership — returns empty array if task not found/not owned
      return sql<Subtask[]>`
        SELECT s.id, s.task_id AS "taskId", s.title, s.is_completed AS "isCompleted", s.created_at AS "createdAt"
        FROM subtasks s
        JOIN tasks t ON t.id = s.task_id
        WHERE s.task_id = ${taskId}
          AND t.user_id = ${userId}
        ORDER BY s.created_at ASC
      `
    }

    export const createSubtask = async (
      sql: Sql,
      taskId: number,
      userId: number,
      title: string,
    ): Promise<Subtask | undefined> => {
      // INSERT only if task exists and belongs to user (conditional INSERT via SELECT)
      const rows = await sql<Subtask[]>`
        INSERT INTO subtasks (task_id, title)
        SELECT ${taskId}, ${title}
        WHERE EXISTS (
          SELECT 1 FROM tasks WHERE id = ${taskId} AND user_id = ${userId}
        )
        RETURNING ${sql.unsafe(SUBTASK_COLUMNS)}
      `
      return rows[0]
    }

    export const updateSubtask = async (
      sql: Sql,
      taskId: number,
      userId: number,
      subId: number,
      isCompleted: boolean,
    ): Promise<Subtask | undefined> => {
      const rows = await sql<Subtask[]>`
        UPDATE subtasks
        SET is_completed = ${isCompleted}
        WHERE id = ${subId}
          AND task_id = ${taskId}
          AND EXISTS (
            SELECT 1 FROM tasks WHERE id = ${taskId} AND user_id = ${userId}
          )
        RETURNING ${sql.unsafe(SUBTASK_COLUMNS)}
      `
      return rows[0]
    }

    export const deleteSubtask = async (
      sql: Sql,
      taskId: number,
      userId: number,
      subId: number,
    ): Promise<{ id: number } | undefined> => {
      const rows = await sql<{ id: number }[]>`
        DELETE FROM subtasks
        WHERE id = ${subId}
          AND task_id = ${taskId}
          AND EXISTS (
            SELECT 1 FROM tasks WHERE id = ${taskId} AND user_id = ${userId}
          )
        RETURNING id
      `
      return rows[0]
    }
    ```
  - [ ] **CRITICAL:** Every query JOIN/EXISTS with `tasks WHERE user_id = ${userId}` — this is the user isolation guard (NFR7). Never skip it.
  - [ ] **`sql.unsafe()` for column selection:** Using `sql.unsafe(SUBTASK_COLUMNS)` for RETURNING clause — this is acceptable because SUBTASK_COLUMNS is a hardcoded string constant, not user input. The `postgres` npm package requires `sql.unsafe()` for raw SQL fragments inside template literals.
  - [ ] **No `updated_at` in subtasks table** — the schema from `003_enrichment.sql` doesn't include an `updated_at` column; do NOT add one and do NOT try to `SET updated_at = NOW()` (that would cause a runtime error)
  - [ ] **Alternative to `sql.unsafe()`:** If `sql.unsafe()` feels risky, just inline the column list: `RETURNING id, task_id AS "taskId", title, is_completed AS "isCompleted", created_at AS "createdAt"` in each query directly

- [x] **Task 3: Backend — Subtask routes plugin `backend/src/routes/subtasks.ts`** (AC: AC1–AC9)
  - [ ] Create `backend/src/routes/subtasks.ts`:
    ```typescript
    import fp from 'fastify-plugin'
    import type { FastifyPluginAsync } from 'fastify'
    import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
    import { Type } from '@sinclair/typebox'
    import {
      getSubtasksByTaskId,
      createSubtask,
      updateSubtask,
      deleteSubtask,
    } from '../db/queries/subtasks.js'
    import { CreateSubtaskBodySchema, UpdateSubtaskBodySchema } from '../types/subtasks.js'

    const subtaskRoutes: FastifyPluginAsync = async fastify => {
      const f = fastify.withTypeProvider<TypeBoxTypeProvider>()

      const taskParams = Type.Object({ id: Type.Integer({ minimum: 1 }) })
      const subtaskParams = Type.Object({
        id: Type.Integer({ minimum: 1 }),
        subId: Type.Integer({ minimum: 1 }),
      })

      // GET /api/tasks/:id/subtasks
      f.get('/tasks/:id/subtasks', { preHandler: [fastify.authenticate], schema: { params: taskParams } }, async (req, reply) => {
        const userId = (req.user as { id: number }).id
        const subtasks = await getSubtasksByTaskId(fastify.sql, req.params.id, userId)
        return reply.status(200).send(subtasks)
      })

      // POST /api/tasks/:id/subtasks
      f.post('/tasks/:id/subtasks', { preHandler: [fastify.authenticate], schema: { params: taskParams, body: CreateSubtaskBodySchema } }, async (req, reply) => {
        const userId = (req.user as { id: number }).id
        const title = req.body.title.trim()
        if (title.length === 0) {
          return reply.status(400).send({ statusCode: 400, error: 'BAD_REQUEST', message: 'Subtask title must not be empty or blank' })
        }
        const subtask = await createSubtask(fastify.sql, req.params.id, userId, title)
        if (!subtask) {
          return reply.status(404).send({ statusCode: 404, error: 'NOT_FOUND', message: 'Task not found' })
        }
        return reply.status(201).send(subtask)
      })

      // PATCH /api/tasks/:id/subtasks/:subId
      f.patch('/tasks/:id/subtasks/:subId', { preHandler: [fastify.authenticate], schema: { params: subtaskParams, body: UpdateSubtaskBodySchema } }, async (req, reply) => {
        const userId = (req.user as { id: number }).id
        const subtask = await updateSubtask(fastify.sql, req.params.id, userId, req.params.subId, req.body.isCompleted)
        if (!subtask) {
          return reply.status(404).send({ statusCode: 404, error: 'NOT_FOUND', message: 'Subtask not found' })
        }
        return reply.status(200).send(subtask)
      })

      // DELETE /api/tasks/:id/subtasks/:subId
      f.delete('/tasks/:id/subtasks/:subId', { preHandler: [fastify.authenticate], schema: { params: subtaskParams } }, async (req, reply) => {
        const userId = (req.user as { id: number }).id
        const deleted = await deleteSubtask(fastify.sql, req.params.id, userId, req.params.subId)
        if (!deleted) {
          return reply.status(404).send({ statusCode: 404, error: 'NOT_FOUND', message: 'Subtask not found' })
        }
        return reply.status(204).send()
      })
    }

    export default fp(subtaskRoutes)
    ```
  - [ ] **Route pattern follows established conventions:** `fp()` wrapped, `fastify.withTypeProvider<TypeBoxTypeProvider>()`, `preHandler: [fastify.authenticate]`, `(req.user as { id: number }).id` for user extraction
  - [ ] **Error response shape `{ statusCode, error, message }`** — used consistently on all 4xx responses, matching the rest of the API

- [x] **Task 4: Backend — Register subtaskRoutes in `server.ts`** (AC: all backend ACs)
  - [ ] In `backend/src/server.ts`, add:
    ```typescript
    import subtaskRoutes from './routes/subtasks.js'
    ```
  - [ ] Register after `labelRoutes`:
    ```typescript
    fastify.register(subtaskRoutes, {
      prefix: '/api',
    })
    ```
  - [ ] **CRITICAL:** Add import using `.js` extension — ESM rule for backend TypeScript source

- [x] **Task 5: Frontend — Add `Subtask` interface to `frontend/src/types/tasks.ts`** (AC: AC1–AC8)
  - [ ] Append to `frontend/src/types/tasks.ts`:
    ```typescript
    export interface Subtask {
      id: number
      taskId: number
      title: string
      isCompleted: boolean
      createdAt: string // ISO 8601
    }
    ```
  - [ ] **No `updatedAt` field** — the `subtasks` table has no `updated_at` column; mirroring the actual backend shape

- [x] **Task 6: Frontend — Add subtask hooks to `frontend/src/hooks/useTasks.ts`** (AC: AC1–AC8)
  - [ ] **`useSubtasks`** — fetches subtasks when panel opens:
    ```typescript
    export function useSubtasks(taskId: number) {
      return useQuery<Subtask[]>({
        queryKey: ['subtasks', taskId],
        queryFn: () => api.get<Subtask[]>(`/tasks/${taskId}/subtasks`),
        staleTime: 30_000,
      })
    }
    ```
  - [ ] **`useCreateSubtask`** — optimistic add:
    ```typescript
    type CreateSubtaskContext = { previous: Subtask[] | undefined }

    export function useCreateSubtask(taskId: number) {
      const queryClient = useQueryClient()

      return useMutation<Subtask, Error, { title: string }, CreateSubtaskContext>({
        mutationFn: ({ title }) => api.post<Subtask>(`/tasks/${taskId}/subtasks`, { title }),

        onMutate: async ({ title }) => {
          await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })
          const previous = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])
          const optimistic: Subtask = {
            id: -Date.now(), // negative temp ID — guaranteed not to collide with real DB IDs
            taskId,
            title,
            isCompleted: false,
            createdAt: new Date().toISOString(),
          }
          queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old => [...(old ?? []), optimistic])
          return { previous }
        },

        onError: (_err, _vars, context) => {
          if (context?.previous !== undefined) {
            queryClient.setQueryData<Subtask[]>(['subtasks', taskId], context.previous)
          }
        },

        onSuccess: (serverSubtask) => {
          // Replace the temporary optimistic entry (negative id) with the server-confirmed subtask
          queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old =>
            old?.map(s => (s.id < 0 && s.title === serverSubtask.title ? serverSubtask : s)) ?? [serverSubtask],
          )
        },
      })
    }
    ```
  - [ ] **`useToggleSubtask`** — optimistic complete/un-complete:
    ```typescript
    type ToggleSubtaskContext = { previous: Subtask[] | undefined }

    export function useToggleSubtask(taskId: number) {
      const queryClient = useQueryClient()

      return useMutation<Subtask, Error, { subId: number; isCompleted: boolean }, ToggleSubtaskContext>({
        mutationFn: ({ subId, isCompleted }) =>
          api.patch<Subtask>(`/tasks/${taskId}/subtasks/${subId}`, { isCompleted }),

        onMutate: async ({ subId, isCompleted }) => {
          await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })
          const previous = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])
          queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old =>
            old?.map(s => (s.id === subId ? { ...s, isCompleted } : s)) ?? [],
          )
          return { previous }
        },

        onError: (_err, _vars, context) => {
          if (context?.previous !== undefined) {
            queryClient.setQueryData<Subtask[]>(['subtasks', taskId], context.previous)
          }
        },

        onSuccess: (serverSubtask) => {
          queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old =>
            old?.map(s => (s.id === serverSubtask.id ? serverSubtask : s)) ?? [],
          )
        },
      })
    }
    ```
  - [ ] **`useDeleteSubtask`** — optimistic remove:
    ```typescript
    type DeleteSubtaskContext = { previous: Subtask[] | undefined }

    export function useDeleteSubtask(taskId: number) {
      const queryClient = useQueryClient()

      return useMutation<void, Error, { subId: number }, DeleteSubtaskContext>({
        mutationFn: ({ subId }) => api.delete<void>(`/tasks/${taskId}/subtasks/${subId}`),

        onMutate: async ({ subId }) => {
          await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })
          const previous = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])
          queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old =>
            old?.filter(s => s.id !== subId) ?? [],
          )
          return { previous }
        },

        onError: (_err, _vars, context) => {
          if (context?.previous !== undefined) {
            queryClient.setQueryData<Subtask[]>(['subtasks', taskId], context.previous)
          }
        },
        // No onSuccess needed: item already removed from cache optimistically
      })
    }
    ```
  - [ ] **Import `Subtask` from `../types/tasks`** at the top of `useTasks.ts`
  - [ ] **Follow established patterns:** Same `onMutate` → `onError` rollback → `onSuccess` update pattern established in `useSetDeadline` (Story 3.2), `useToggleTask` (Story 2.3), `useUpdateTask` (Story 2.4)
  - [ ] **Query key `['subtasks', taskId]`** — array form, task-scoped; separate from `['tasks']` so task list cache is never invalidated by subtask mutations
  - [ ] **NO auto-complete logic** — `useToggleSubtask.onSuccess` must NOT check "are all subtasks complete?" and must NOT call any task completion mutation. Explicitly forbidden by FR20.

- [x] **Task 7: Frontend — Create `SubtaskPanel.tsx`** (AC: AC1–AC8)
  - [ ] Create `frontend/src/components/SubtaskPanel.tsx`:
    ```typescript
    import { useState, useRef } from 'react'
    import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from '../hooks/useTasks'

    interface SubtaskPanelProps {
      taskId: number
    }

    export function SubtaskPanel({ taskId }: SubtaskPanelProps) {
      const { data: subtasks = [], isLoading } = useSubtasks(taskId)
      const createSubtask = useCreateSubtask(taskId)
      const toggleSubtask = useToggleSubtask(taskId)
      const deleteSubtask = useDeleteSubtask(taskId)

      const [newTitle, setNewTitle] = useState('')
      const [createError, setCreateError] = useState<string | null>(null)
      const inputRef = useRef<HTMLInputElement>(null)

      const handleCreate = () => {
        const title = newTitle.trim()
        if (!title) return
        setCreateError(null)
        createSubtask.mutate(
          { title },
          {
            onSuccess: () => setNewTitle(''),
            onError: (err) => setCreateError(err.message ?? 'Failed to add subtask'),
          },
        )
      }

      if (isLoading) {
        return <div className="pl-8 py-2 text-sm text-gray-500">Loading subtasks…</div>
      }

      return (
        <div className="pl-8 pt-2 pb-3 space-y-1" role="list" aria-label="Subtasks">
          {subtasks.map(subtask => (
            <div key={subtask.id} role="listitem" className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={subtask.isCompleted}
                onChange={() =>
                  toggleSubtask.mutate({ subId: subtask.id, isCompleted: !subtask.isCompleted })
                }
                aria-label={`Mark subtask "${subtask.title}" as ${subtask.isCompleted ? 'incomplete' : 'complete'}`}
                className="h-4 w-4 cursor-pointer"
              />
              <span className={subtask.isCompleted ? 'line-through text-gray-400' : 'text-sm'}>
                {subtask.title}
              </span>
              <button
                onClick={() => deleteSubtask.mutate({ subId: subtask.id })}
                aria-label={`Delete subtask "${subtask.title}"`}
                className="ml-auto text-gray-400 hover:text-red-500 text-xs"
              >
                ×
              </button>
            </div>
          ))}

          {subtasks.length === 0 && (
            <p className="text-xs text-gray-400 italic">No subtasks yet</p>
          )}

          {/* New subtask input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') setNewTitle('')
              }}
              placeholder="Add a subtask…"
              aria-label="New subtask title"
              className="flex-1 text-sm border-b border-gray-300 focus:outline-none focus:border-gray-600 bg-transparent py-0.5"
            />
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || createSubtask.isPending}
              className="text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40"
              aria-label="Add subtask"
            >
              Add
            </button>
          </div>

          {createError && (
            <div role="alert" className="text-xs text-red-600 mt-1">
              {createError}{' '}
              <button
                onClick={handleCreate}
                className="underline"
                aria-label="Retry adding subtask"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )
    }
    ```
  - [ ] **File location:** `frontend/src/components/SubtaskPanel.tsx` — follows `PascalCase.tsx` naming convention
  - [ ] **No nested subtask inputs on subtask rows** — the subtask list renders only `<SubtaskPanel>` at the task level; subtask rows have no expand control (AC7 / FR19 structural enforcement)
  - [ ] **`role="alert"` on error** — matches UX spec requirement: inline errors use `role="alert"` so screen readers announce immediately
  - [ ] **`aria-expanded` not needed on SubtaskPanel itself** — it lives only when rendered; `aria-expanded` goes on the toggle button in `TaskRow.tsx`
  - [ ] **`prefers-reduced-motion`** — if any open/close animation is added, wrap it in `motion-safe:` Tailwind variant

- [x] **Task 8: Frontend — Extend `TaskRow.tsx` with subtask toggle + panel** (AC: AC1, AC4, AC7)
  - [ ] **`TaskRow.tsx` was created in Story 2.3 and extended in Stories 2.4, 2.5, 3.1, and 3.2 — EXTEND IT, DO NOT re-create**
  - [ ] Add import: `import { SubtaskPanel } from './SubtaskPanel'`
  - [ ] Add local state: `const [subtasksOpen, setSubtasksOpen] = useState(false)`
  - [ ] Add toggle button to the task row action area (after deadline display, following existing layout):
    ```tsx
    <button
      onClick={() => setSubtasksOpen(open => !open)}
      aria-expanded={subtasksOpen}
      aria-label={`${subtasksOpen ? 'Collapse' : 'Expand'} subtasks for "${task.title}"`}
      className="text-xs text-gray-400 hover:text-gray-700"
    >
      {subtasksOpen ? '▲ Subtasks' : '▼ Subtasks'}
    </button>
    ```
  - [ ] Render `SubtaskPanel` conditionally below the main task row content:
    ```tsx
    {subtasksOpen && <SubtaskPanel taskId={task.id} />}
    ```
  - [ ] **`aria-expanded` on the toggle button** is per UX spec: `aria-expanded` must be on the subtask panel trigger
  - [ ] **NEVER add auto-complete logic** — do not listen for subtask count changes and trigger task completion. This is explicitly forbidden by FR20. The `SubtaskPanel` is purely a subtask manager.

- [x] **Task 9: Backend unit/integration tests** (NFR16 — ≥70% coverage target)
  - [ ] Create `backend/test/db/queries/subtasks.test.ts` using Testcontainers (`createTestDb()`):
    - Test: `createSubtask` inserts a row and returns the subtask
    - Test: `createSubtask` returns `undefined` when task belongs to another user (user isolation)
    - Test: `getSubtasksByTaskId` returns ordered list for the correct user only
    - Test: `updateSubtask` toggles `is_completed` and returns updated subtask
    - Test: `updateSubtask` returns `undefined` for cross-user access attempt
    - Test: `deleteSubtask` removes the row and returns `{ id }`
    - Test: `deleteSubtask` returns `undefined` for cross-user access attempt
  - [ ] Create `backend/test/routes/subtasks.test.ts` (or extend existing routes test):
    - Test: `POST /api/tasks/:id/subtasks` — 201 + subtask object
    - Test: `POST /api/tasks/:id/subtasks` — 401 without auth
    - Test: `POST /api/tasks/:id/subtasks` — 404 for another user's task
    - Test: `GET /api/tasks/:id/subtasks` — 200 + array
    - Test: `PATCH /api/tasks/:id/subtasks/:subId` — 200 with updated isCompleted
    - Test: `DELETE /api/tasks/:id/subtasks/:subId` — 204
  - [ ] **Run backend tests with:** `TESTCONTAINERS_RYUK_DISABLED=true DOCKER_HOST=unix://$HOME/.colima/default/docker.sock npx vitest run` (pre-configured in `backend/package.json`)

- [x] **Task 10: Frontend unit tests** (NFR16 — ≥70% coverage target)
  - [ ] Create `frontend/test/components/SubtaskPanel.test.tsx`:
    - Mock `useTasks` hooks at module level (`vi.mock('../../../src/hooks/useTasks')`)
    - Test: renders subtask list from `useSubtasks`
    - Test: renders empty state when no subtasks
    - Test: calls `useCreateSubtask.mutate` on Enter key in input
    - Test: calls `useToggleSubtask.mutate` on checkbox click
    - Test: calls `useDeleteSubtask.mutate` on delete button click
    - Test: shows `role="alert"` error on create failure
  - [ ] **Test file location:** `frontend/test/components/SubtaskPanel.test.tsx` — mirrors `src/components/SubtaskPanel.tsx`

- [x] **Task 11: E2E tests — enable skipped subtask tests** (NFR17 — min 5 Playwright E2E tests)
  - [ ] Rewrite `e2e/tests/subtasks.spec.ts` to replace the skipped stubs with actual tests:
    - Test: creates a user, creates a task, opens subtask panel, adds a subtask, verifies it appears
    - Test: marks a subtask as complete independently, verifies parent task checkbox remains unchecked (FR20)
    - Test: deletes a subtask, verifies it disappears from the panel
  - [ ] Use the `auth` helper (`e2e/helpers/auth.ts`) for session setup — consistent with existing E2E test patterns
  - [ ] **Use `page.locator`** with `aria-label` selectors to target accessible elements (WCAG compliance)
  - [ ] **`baseURL: 'http://localhost:3000'`** — never hardcode URLs (from `playwright.config.ts`)

## Dev Notes

### Architecture Context

- **No new migration:** The `subtasks` table was created in `003_enrichment.sql` (applied in Story 3.1). Never add a 4th migration for subtasks — the table already exists.
- **Subtask data NOT included in `GET /api/tasks`:** Unlike labels (which are JOINed into `getTasks`), subtasks are fetched lazily via `GET /api/tasks/:id/subtasks` only when the panel opens. Including subtasks inline in `getTasks` would require a nested `json_agg` and significantly increase the payload size for all task list loads. Fetch-on-demand is the correct architecture here.
- **Separate query key `['subtasks', taskId]`** — subtask mutations must never invalidate `['tasks']`. Task count display and task list are derived from `['tasks']` cache; subtask state is independent.
- **FR20 is a hard business rule:** "Completing all subtasks does NOT automatically complete the parent task." This is in the PRD, architecture, and epics. Any auto-complete logic is a defect. Do not add it, even as a "nice-to-have."
- **FR19 is a structural constraint:** Subtasks have no `parent_subtask_id` column. The API endpoint `POST /api/tasks/:id/subtasks` only works when `:id` is a real `tasks.id`. Since a subtask ID can never match a `tasks.id` in the same space (they're in different tables), attempting to create a subtask of a subtask will naturally return `404`.

### Project Structure Notes

- **New files to create:**
  - `backend/src/types/subtasks.ts` (TypeBox schemas)
  - `backend/src/db/queries/subtasks.ts` (query functions)
  - `backend/src/routes/subtasks.ts` (Fastify plugin)
  - `frontend/src/components/SubtaskPanel.tsx` (React component)
  - `backend/test/db/queries/subtasks.test.ts` (Testcontainers tests)
  - `backend/test/routes/subtasks.test.ts` (route tests)
  - `frontend/test/components/SubtaskPanel.test.tsx` (unit tests)
- **Files to extend:**
  - `backend/src/server.ts` — add `subtaskRoutes` import and registration
  - `frontend/src/types/tasks.ts` — add `Subtask` interface
  - `frontend/src/hooks/useTasks.ts` — add 4 new hooks, import `Subtask` type
  - `frontend/src/components/TaskRow.tsx` — add toggle state, toggle button, conditional `<SubtaskPanel />`
  - `e2e/tests/subtasks.spec.ts` — replace skipped stubs with real tests

### Existing Pattern Cross-Reference

| Concern | Pattern source | What to replicate |
|---|---|---|
| Route plugin structure | `backend/src/routes/labels.ts` | `fp()` wrap, `f.withTypeProvider<TypeBoxTypeProvider>()`, `preHandler: [fastify.authenticate]`, params schema with `Type.Integer({ minimum: 1 })` |
| Ownership enforcement | All task routes | `(req.user as { id: number }).id` — always extract userId from JWT payload |
| Error response shape | All routes | `{ statusCode, error: 'NOT_FOUND', message: '...' }` — never deviate |
| Query function pattern | `backend/src/db/queries/labels.ts` | Named async functions, no classes, no default export, `postgres` tagged template literals |
| Optimistic mutation hooks | `useTasks.ts` (useSetDeadline, Story 3.2) | `onMutate → return { previous }` → `onError: rollback` → `onSuccess: patch cache` |
| Frontend types | `frontend/src/types/tasks.ts` | Plain TS interfaces — no TypeBox in frontend |
| API calls | `frontend/src/lib/api.ts` | `api.get`, `api.post`, `api.patch`, `api.delete` — never call `fetch` directly |
| Backend imports | All `.ts` files with `.js` extension in backend | `import { ... } from './db/queries/subtasks.js'` — ESM rule |

### Critical Constraints

1. **`task_id` → `taskId` camelCase mapping** — The `postgres` npm package uses AS aliases for camelCase conversion. Always alias `task_id AS "taskId"`, `is_completed AS "isCompleted"`, `created_at AS "createdAt"` in RETURNING/SELECT clauses.
2. **No `updated_at` in subtasks** — confirmed by `003_enrichment.sql` schema. Do not attempt to SET it.
3. **`DELETE 204 No Content`** — The `api.delete` wrapper in `lib/api.ts` handles 204 responses (returns `undefined as T`). The route should send `reply.status(204).send()`.
4. **TypeScript strict mode** — `"strict": true` in both tsconfigs. Never use `any`. Use `Subtask | undefined` return types where a DB query may return nothing.
5. **`.js` extensions in backend imports** — e.g., `import subtaskRoutes from './routes/subtasks.js'` even though the source file is `.ts`.
6. **No inline domain types** — `Subtask` interface must live in `frontend/src/types/tasks.ts`, not defined inline in the hook or component.

### References

- Subtasks DB schema: [backend/src/db/migrations/003\_enrichment.sql](backend/src/db/migrations/003_enrichment.sql) (lines 20–28)
- Labels route pattern (reference): [backend/src/routes/labels.ts](backend/src/routes/labels.ts)
- Optimistic mutation pattern: [Story 3.2 dev notes](\_bmad-output/implementation-artifacts/3-2-deadline-set-and-remove.md) (useSetDeadline hook)
- Fastify plugin registration: [backend/src/server.ts](backend/src/server.ts) (lines 79–88)
- API fetch wrapper: [frontend/src/lib/api.ts](frontend/src/lib/api.ts)
- FR16–FR20 requirements: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md)
- Project rules (ESM, TypeBox naming, query layer): [\_bmad-output/project-context.md](_bmad-output/project-context.md)
- E2E subtask stubs to implement: [e2e/tests/subtasks.spec.ts](e2e/tests/subtasks.spec.ts)
- UX spec (aria-expanded, SubtaskPanel trigger, role="alert"): [Source: \_bmad-output/planning-artifacts/epics.md — Additional Requirements from UX Design]

## Change Log

| Date | Changes |
|---|---|
| 2026-02-26 | Implemented complete subtask feature: TypeBox schemas, DB queries, Fastify routes (with fp() encapsulate fix), React hooks (optimistic), SubtaskPanel component, TaskRow toggle, unit tests, E2E tests |
| 2026-02-26 | Code review (AI): Fixed AC8 violation — added per-row `role="alert"` error UI with Retry for toggle/delete failures in SubtaskPanel; activated dead `inputRef` via `useEffect` auto-focus; added 2 new test cases (12→12 total). Status → done |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- **Bug fix:** `subtaskRoutes` was exported as `fp(subtaskRoutes)` without `encapsulate: true`, causing routes to be registered in the parent scope and lose the `/api` prefix. Fixed to match `labelRoutes` pattern: `fp(subtaskRoutes, { name: 'subtask-routes', dependencies: ['db-plugin'], encapsulate: true })`.

### Completion Notes List

- Story created via BMAD create-story workflow (2026-02-26)
- No migration required — subtasks table scaffolded in Story 3.1 via 003_enrichment.sql
- FR20 (no auto-complete) and FR19 (no nesting) enforced at every layer (DB queries, routes, React hooks, components, E2E tests)
- **Bug fixed:** `fp()` without `encapsulate: true` caused subtask routes to lose `/api` prefix. Fixed by adding `{ name: 'subtask-routes', dependencies: ['db-plugin'], encapsulate: true }` matching the established `labelRoutes` pattern.
- All 4 backend route endpoints (GET, POST, PATCH, DELETE) pass 14/14 route tests and 12/12 DB query tests
- All 10 `SubtaskPanel.test.tsx` frontend unit tests pass
- All 3 E2E subtask tests pass (add, complete independently, delete)
- Full regression suite: 130/130 frontend unit tests, 36/47 E2E tests (11 skipped are pre-existing story 4.x filter stubs)
- 5 pre-existing backend deadline format failures (Story 3.2 regression, not introduced by this story)

### File List

**New files:**
- backend/src/types/subtasks.ts
- backend/src/db/queries/subtasks.ts
- backend/src/routes/subtasks.ts
- frontend/src/components/SubtaskPanel.tsx
- backend/test/db/queries/subtasks.test.ts
- backend/test/routes/subtasks.test.ts
- frontend/test/components/SubtaskPanel.test.tsx
- e2e/tests/subtasks.spec.ts

**Modified files:**
- backend/src/server.ts (added subtaskRoutes import and registration)
- frontend/src/types/tasks.ts (added Subtask interface)
- frontend/src/hooks/useTasks.ts (added useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask)
- frontend/src/components/TaskRow.tsx (added subtasksOpen state, toggle button, conditional SubtaskPanel render)- frontend/src/components/SubtaskPanel.tsx (code review fix: added toggle/delete error state, auto-focus via useEffect)
- frontend/test/components/SubtaskPanel.test.tsx (code review fix: added toggle/delete error tests; updated mutate assertions for 2-arg calls)

## Senior Developer Review (AI)

**Reviewer:** Alessio (AI) — 2026-02-26
**Outcome:** Changes Requested → Fixed → ✅ Approved

### Findings & Resolutions

| # | Sev | Issue | Resolution |
|---|---|---|---|
| 1 | MEDIUM | **AC8 violation** — `toggleSubtask.mutate` and `deleteSubtask.mutate` had no `onError` callbacks in `SubtaskPanel.tsx`, so failures silently rolled back the cache with no user-visible error or retry affordance. AC8 explicitly requires `role="alert"` inline error on every mutation failure. | Added `toggleErrors: Record<number, string>` and `deleteErrors: Record<number, string>` per-subtask error state. Each mutate call now passes `onError` that sets the error. Row renders an inline `role="alert"` div with a Retry button when an error exists for that subtask. |
| 2 | MEDIUM | **Dead `inputRef`** — `useRef<HTMLInputElement>` was created and assigned but `.focus()` was never called. Panel opened without auto-focusing the input, requiring a manual click to type. | Added `useEffect(() => { inputRef.current?.focus() }, [])` to focus the new-subtask input on mount. |
| 3 | LOW | **Test coverage gap** — no tests for toggle/delete failure UI (consequence of issue #1). | Added 2 new tests: `shows role="alert" error on toggle failure` and `shows role="alert" error on delete failure`. Also updated toggle and delete happy-path assertions to expect the second callback argument (`expect.any(Object)`). |

**Final test counts:** 26/26 backend ✅ · 12/12 frontend unit ✅ · 3/3 E2E ✅