# Story 3.2: Deadline — Set and Remove

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to set an optional deadline date on a task and remove it at any time,
so that I can track time-sensitive work at a glance.

## Acceptance Criteria

**AC1 — Set deadline (optimistic):**
- **Given** I have a task in my list
- **When** I set a deadline date via the task row (date picker input or typed `YYYY-MM-DD` date)
- **Then** the deadline appears visually on the task card immediately (optimistic UI — no spinner)
- **And** `PATCH /api/tasks/:id` is called with body `{ "deadline": "YYYY-MM-DD" }` (ISO date string)
- **And** the `deadline` column is set to that `DATE` value in the database

**AC2 — Remove deadline (optimistic):**
- **Given** a task has a deadline set
- **When** I click the "clear deadline" affordance (× button next to the displayed deadline)
- **Then** the deadline disappears from the task card immediately (optimistic UI)
- **And** `PATCH /api/tasks/:id` is called with body `{ "deadline": null }`
- **And** the `deadline` column is set to `NULL` in the database

**AC3 — Deadline visible in task list:**
- **Given** a task has a deadline set
- **When** I view the task list
- **Then** the deadline date is displayed on the task card in a clearly readable format (e.g., "15 Mar 2026")
- **And** no automatic overdue alerting or special styling beyond display is required in MVP — deadline is informational only

**AC4 — Failure recovery (optimistic rollback):**
- **Given** the set- or clear-deadline API call fails
- **When** the server returns an error or times out
- **Then** the optimistic UI state is rolled back (deadline restored to its pre-mutation value)
- **And** an inline error with a retry affordance is shown on the affected task row (consistent with label error pattern from Story 3.1)

**AC5 — `PATCH /api/tasks/:id` extended body schema (backward compatible):**
- **Given** `PATCH /api/tasks/:id` is called with body `{ "deadline": "2026-03-15" }` (deadline only, no title)
- **Then** only the deadline is updated; current title is preserved
- **Given** `PATCH /api/tasks/:id` is called with body `{ "title": "New title" }` (title only, no deadline)
- **Then** existing title-only behavior is fully preserved — no regression

**AC6 — No new database migration needed:**
- **Given** the database is running with migrations applied up to `003_enrichment.sql`
- **When** Story 3.2 is deployed
- **Then** no new migration file is required — `deadline DATE` column and `idx_tasks_deadline` partial index already exist in `002_tasks.sql`

## Tasks / Subtasks

- [x] **Task 1: Backend — Extend `UpdateTaskBodySchema` to accept `deadline`** (AC: AC5, AC1, AC2)
  - [x] Modify `UpdateTaskBodySchema` in `backend/src/types/tasks.ts`:
    - Change from `Type.Object({ title: Type.String({ minLength: 1 }) })` to a `Type.Partial(...)` object that accepts both `title` (optional) and `deadline` (optional, `Type.Union([Type.String(), Type.Null()])`)
    - Export updated `UpdateTaskBody = Static<typeof UpdateTaskBodySchema>`
  - [x] **CRITICAL:** The existing `useUpdateTask` frontend hook sends `{ title }` to `PATCH /api/tasks/:id` — after making the schema partial, this must still validate and work (title is still optional via Partial, but the route handler validates its presence when title is given)
  - [x] Ensure Ajv coercion is not stripping `null` values — explicitly allow `additionalProperties: false` on the partial schema to prevent surprises

- [x] **Task 2: Backend — Add `updateTaskDeadline` query function** (AC: AC1, AC2)
  - [x] Add to `backend/src/db/queries/tasks.ts`:
    ```typescript
    export const updateTaskDeadline = async (
      sql: Sql,
      taskId: number,
      userId: number,
      deadline: string | null,
    ): Promise<Task | undefined> => {
      const rows = await sql<Task[]>`
        UPDATE tasks
        SET deadline = ${deadline}, updated_at = NOW()
        WHERE id = ${taskId} AND user_id = ${userId}
        RETURNING
          id,
          user_id AS "userId",
          title,
          is_completed AS "isCompleted",
          completed_at AS "completedAt",
          deadline,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `
      return rows[0]
    }
    ```
  - [x] **Important:** Do NOT include the labels LEFT JOIN in this query — mutation responses intentionally exclude labels (pattern established in Story 3.1: only `getTasks` includes labels); the frontend cache merges labels from the optimistic snapshot via `onSuccess`
  - [x] Import `updateTaskDeadline` in `backend/src/routes/tasks.ts`

- [x] **Task 3: Backend — Extend `PATCH /api/tasks/:id` route handler** (AC: AC1, AC2, AC5)
  - [x] In `backend/src/routes/tasks.ts`, update the `PATCH /api/tasks/:id` handler to branch on which fields are present in `req.body`:
    ```typescript
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const taskId = req.params.id
      let task: Task | undefined

      if (req.body.title !== undefined) {
        const title = req.body.title.trim()
        if (title.length === 0) {
          return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Title must not be empty or blank' })
        }
        task = await updateTaskTitle(fastify.sql, taskId, userId, title)
        if (!task) return reply.status(404).send({ statusCode: 404, error: 'NOT_FOUND', message: 'Task not found' })
      }

      if ('deadline' in req.body) {
        task = await updateTaskDeadline(fastify.sql, taskId, userId, req.body.deadline ?? null)
        if (!task) return reply.status(404).send({ statusCode: 404, error: 'NOT_FOUND', message: 'Task not found' })
      }

      if (!task) {
        return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'No updatable fields provided' })
      }

      return reply.status(200).send(task)
    }
    ```
  - [x] **Note on `'deadline' in req.body` check:** TypeBox+Ajv will pass `null` values through (TypeBox Partial makes the key optional but allows null when the union is `Type.Union([Type.String(), Type.Null()])`). Use `'deadline' in req.body` (not `req.body.deadline !== undefined`) to correctly distinguish "field not sent" from "field sent as null"

- [x] **Task 4: Frontend — `useSetDeadline` mutation hook** (AC: AC1, AC2, AC4)
  - [x] Add to `frontend/src/hooks/useTasks.ts`:
    ```typescript
    type SetDeadlineContext = { previous: Task[] | undefined }

    export function useSetDeadline() {
      const queryClient = useQueryClient()

      return useMutation<TaskMutationResponse, Error, { id: number; deadline: string | null }, SetDeadlineContext>({
        mutationFn: ({ id, deadline }) => api.patch<TaskMutationResponse>(`/tasks/${id}`, { deadline }),

        onMutate: async ({ id, deadline }) => {
          await queryClient.cancelQueries({ queryKey: ['tasks'] })
          const previous = queryClient.getQueryData<Task[]>(['tasks'])
          queryClient.setQueryData<Task[]>(['tasks'], old =>
            old?.map(t => (t.id === id ? { ...t, deadline } : t)) ?? [],
          )
          return { previous }
        },

        onError: (_err, _vars, context) => {
          if (context?.previous !== undefined) {
            queryClient.setQueryData<Task[]>(['tasks'], context.previous)
          }
          queryClient.invalidateQueries({ queryKey: ['tasks'] })
        },

        onSuccess: (serverTask) => {
          // Update cache with server-confirmed task — merge labels from existing cache entry
          queryClient.setQueryData<Task[]>(['tasks'], old =>
            old?.map(t =>
              t.id === serverTask.id
                ? { ...serverTask, labels: serverTask.labels ?? t.labels }
                : t,
            ) ?? [],
          )
        },
      })
    }
    ```
  - [x] Follow established pattern from `useUpdateTask` and `useToggleTask` — no `invalidateQueries` on success (avoids extra GET)

- [x] **Task 5: Frontend — Extend `TaskRow.tsx` with deadline display + inline date input** (AC: AC1, AC2, AC3, AC4)
  - [x] **`TaskRow.tsx` was created in Story 2.3 and extended in Stories 2.4, 2.5, and 3.1 — EXTEND IT, DO NOT re-create**
  - [x] Import `useSetDeadline` from `../hooks/useTasks`
  - [x] Add local state: `const [showDeadlinePicker, setShowDeadlinePicker] = useState(false)`
  - [x] **Deadline display section** (below label pills, above task actions):
    - If `task.deadline` is set, display it in human-readable format + a clear (×) button:
      ```tsx
      {task.deadline && (
        <div className="...">
          <span aria-label={`Deadline: ${formatDeadline(task.deadline)}`}>
            📅 {formatDeadline(task.deadline)}
          </span>
          <button
            aria-label="Remove deadline"
            onClick={() => setDeadline.mutate({ id: task.id, deadline: null })}
          >
            ×
          </button>
        </div>
      )}
      ```
  - [x] **Date formatting helper** (`formatDeadline`):
    ```typescript
    function formatDeadline(isoDate: string): string {
      // Append T12:00:00 to avoid UTC/local timezone boundary issues
      // e.g. "2026-03-15" → "15 Mar 2026"
      return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    }
    ```
    - **CRITICAL timezone note:** Do NOT use `new Date("2026-03-15")` — this is parsed as UTC midnight and may display as the previous day in timezones west of UTC. Always append `T12:00:00` (local noon).
  - [x] **Inline date picker affordance** (when no deadline is set, show a "Set date" button):
    - Small calendar icon button (`aria-label="Set deadline for [task.title]"`) toggles `showDeadlinePicker`
    - When `showDeadlinePicker` is true, render `<input type="date" />` inline
    - `onChange` handler: `setDeadline.mutate({ id: task.id, deadline: e.target.value }); setShowDeadlinePicker(false)`
    - `onKeyDown` Escape: `setShowDeadlinePicker(false)` (no mutation)
    - Close picker on blur (`onBlur`)
  - [x] **Inline error state** on deadline set/remove failure:
    - Show error text inline on the task row (e.g., "Deadline update failed")
    - Include an explicit **retry button** (consistent with AC4 and Story 3.1 AC6 retry requirement): clicking retry re-calls the last attempted mutation
    - Error uses `role="alert"` (consistent with label error ARIA pattern)
  - [x] **ARIA:** `aria-label="Set deadline for {task.title}"` on the date trigger; `aria-label="Remove deadline"` on the × button
  - [x] **DO NOT break** Stories 2.3/2.4/2.5/3.1 features: checkbox toggle, Space-key completion, inline title edit, two-step delete, label pills — all must remain intact

- [x] **Task 6: Tests** (AC: AC1–AC6)
  - [x] **Backend query tests — add to `backend/test/db/queries/tasks.test.ts`** (Testcontainers):
    - `describe('updateTaskDeadline')`:
      - Sets a valid DATE string (`"2026-03-15"`) on a task — returned task has `deadline: "2026-03-15"`
      - Clears deadline to null — returned task has `deadline: null`
      - Returns `undefined` for a task belonging to another user (ownership enforced)
      - Preserves all other task fields (title, isCompleted, etc.) unchanged
  - [x] **Backend route tests — add to `backend/test/routes/tasks.test.ts`**:
    - `describe('PATCH /api/tasks/:id — deadline extension')`:
      - `401` when not authenticated (deadline body)
      - `200` sets deadline: body `{ deadline: "2026-03-15" }` → `deadline: "2026-03-15"` in response
      - `200` clears deadline: body `{ deadline: null }` → `deadline: null` in response
      - `404` on non-existent or another user's task
      - **Regression:** body `{ title: "New title" }` still updates title correctly — `deadline` field unchanged
      - **Regression:** body `{ title: "New title", deadline: "2026-03-15" }` (both fields) — both are updated (title changes + deadline changes)
      - `400` when body is empty `{}` (no updatable fields)
  - [x] **Frontend hook tests — add to `frontend/test/hooks/useTasks.test.ts`**:
    - `describe('useSetDeadline')`:
      - `onMutate` optimistically sets `deadline` on the target task in the cache
      - `onMutate` optimistically sets `deadline: null` when clearing
      - `onError` restores previous cache state
      - `onSuccess` updates cache with server-confirmed deadline value, preserving labels
  - [x] **Frontend component tests — add to `frontend/test/components/TaskRow.test.tsx`**:
    - `describe('Story 3.2 — deadline management')`:
      - Deadline is displayed when `task.deadline` is set (formatted as readable string)
      - Clicking the × button calls `useSetDeadline` with `{ id, deadline: null }`
      - The "Set date" trigger is rendered when task has no deadline
      - Clicking the trigger shows a date `<input type="date">`
      - Changing the date input value calls `useSetDeadline` with `{ id, deadline: value }` and closes picker
      - Pressing Escape on the date input closes picker without mutation
      - Inline retry affordance is rendered when deadline mutation fails; clicking retry re-calls mutation
      - Existing Stories 2.3, 2.4, 2.5, 3.1 tests still pass — no regressions

## Dev Notes

### 🚨 Critical: No New Migration Required

`deadline DATE` column **already exists** in `backend/src/db/migrations/002_tasks.sql` (Story 2.1). The partial index `idx_tasks_deadline ON tasks(user_id, deadline) WHERE deadline IS NOT NULL` was also created in that migration. **Do NOT create a `004_*.sql` migration file for this story.**

The `003_enrichment.sql` migration (Story 3.1) is the last applied migration. No new migration is needed for Story 3.2.

### Existing Files to Touch

| File | Action |
|---|---|
| `backend/src/types/tasks.ts` | Extend `UpdateTaskBodySchema` — add `deadline` field; make both fields optional via `Type.Partial` |
| `backend/src/db/queries/tasks.ts` | Add `updateTaskDeadline` function |
| `backend/src/routes/tasks.ts` | Update `PATCH /api/tasks/:id` handler to branch on title/deadline presence |
| `frontend/src/hooks/useTasks.ts` | Add `useSetDeadline` mutation |
| `frontend/src/components/TaskRow.tsx` | Extend with deadline display, clear button, inline date picker |
| `backend/test/db/queries/tasks.test.ts` | Add `updateTaskDeadline` describe block |
| `backend/test/routes/tasks.test.ts` | Add deadline extension tests + regression coverage |
| `frontend/test/hooks/useTasks.test.ts` | Add `useSetDeadline` describe block |
| `frontend/test/components/TaskRow.test.tsx` | Add Story 3.2 describe block |

### No New Files Required

All changes for this story land in existing files. There is no new route plugin, no new query file, no new hook file, and no new migration. This is an extension story.

### API Endpoint Contract

```
PATCH /api/tasks/:id
  Body (partial — all fields optional, at least one required):
    {
      "title"?: string (minLength 1),
      "deadline"?: string | null  // ISO date "YYYY-MM-DD" or null to clear
    }
  Response 200: Task (without labels — matches existing mutation response pattern)
    {
      "id": 1,
      "userId": 42,
      "title": "Write tests",
      "isCompleted": false,
      "completedAt": null,
      "deadline": "2026-03-15",   // or null if cleared
      "createdAt": "...",
      "updatedAt": "..."
    }
  Response 400: { "statusCode": 400, "error": "Bad Request", "message": "..." }
    — when body is empty (no updatable fields), or title is blank
  Response 401: (unauthenticated)
  Response 404: { "statusCode": 404, "error": "NOT_FOUND", "message": "Task not found" }
```

### DATE Column & Driver Behavior

PostgreSQL `DATE` columns returned by `postgres` (Porsager) are returned as **plain string values** in `YYYY-MM-DD` format (not JS `Date` objects). The TypeBox schema `Type.Union([Type.String(), Type.Null()])` correctly captures this. No special type parser configuration is needed.

When setting a deadline via the backend, pass the string directly to the parameterised query — `postgres` handles the type casting to PostgreSQL `DATE` automatically via the typed template syntax.

### Frontend Date Formatting — Timezone Safety

⚠️ Always append `T12:00:00` when parsing isolation date strings into `Date` objects for display:
```typescript
// WRONG — parses as UTC midnight, may show previous day in UTC-N timezones
new Date("2026-03-15").toLocaleDateString(...)

// CORRECT — local noon avoids DST/timezone boundary issues  
new Date("2026-03-15T12:00:00").toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric'
}) // → "15 Mar 2026"
```

### `Type.Partial` Schema Extension

Current `UpdateTaskBodySchema`:
```typescript
export const UpdateTaskBodySchema = Type.Object({
  title: Type.String({ minLength: 1 }),
})
```

Updated `UpdateTaskBodySchema`:
```typescript
export const UpdateTaskBodySchema = Type.Partial(
  Type.Object({
    title:    Type.String({ minLength: 1 }),
    deadline: Type.Union([Type.String(), Type.Null()]),
  }),
)
// Type.Partial makes all fields Optional (key may be absent entirely)
// deadline: null is distinct from deadline: undefined (absent) — Ajv preserves this.
```

**Backward compatibility:** The existing `useUpdateTask` sends `{ title: "..." }` — after making the schema partial, `title` remains valid as a standalone field. No frontend hook changes needed for the title path.

### Route Handler Branching — Key Detail

Use `'deadline' in req.body` (not `req.body.deadline !== undefined`) for the deadline check. This correctly distinguishes:
- `{}` → `'deadline' in req.body === false` (not a deadline update)
- `{ deadline: null }` → `'deadline' in req.body === true`, `req.body.deadline === null` (clear deadline)
- `{ deadline: "2026-03-15" }` → `'deadline' in req.body === true`, `req.body.deadline` is the string

TypeBox's `Type.Partial` + Ajv validation will strip truly absent keys but preserve explicitly-sent `null` values (because the union type includes `Type.Null()`).

### `useSetDeadline` — onSuccess Pattern

Follow the established mutation pattern from `useUpdateTask` and `useToggleTask`:
- **No `invalidateQueries` on success** — avoids an extra `GET /api/tasks` call which would violate the sub-1-second state reflection goal (NFR1/FR28)
- Merge labels from existing cache entry because mutation response does NOT include labels (`serverTask.labels ?? t.labels`)
- Optimistic deadline in `onMutate` is already correct for the happy path; `onSuccess` replaces it with the server-confirmed value (which is functionally identical, but ensures consistency)

### Previous Story Learnings (from Story 3.1 — Labels)

From Story 3.1 implementation and review (key patterns established):
- **Retry affordance is mandatory** for inline errors — Story 3.1 required a HIGH-severity fix because the retry button was missing. For Story 3.2, include the retry affordance from the start in `TaskRow.tsx`.
- **`role="alert"` on inline error messages** — all error states in `TaskRow` use this ARIA role.
- **Optimistic rollback pattern** is consistent: `cancelQueries` → snapshot → mutate cache → return snapshot; rollback on error; `invalidateQueries` only on error (not success).
- **Mutation response shape does NOT include labels** — only `getTasks` aggregates labels. Mutation responses are the raw task row. The `onSuccess` handler always does `serverTask.labels ?? t.labels` when merging into cache.
- **`req.user` is cast as `{ id: number }`** inside authenticated handlers.
- **`postgres` tagged template literals** — always `sql\`...\`` with `${variable}` interpolation.

### Architecture Compliance Checklist

- **Per-user isolation** — `updateTaskDeadline` filters by `user_id` with `WHERE id = ${taskId} AND user_id = ${userId}`. Returns `undefined` (not exception) if not found.
- **Error shape** — all error responses use `{ statusCode, error, message }`. Deadline-specific 400 must use `error: 'Bad Request'` (not `BAD_REQUEST` — match the existing title-error format in the route).
- **Test location** — `backend/test/` mirrors `backend/src/`; `frontend/test/` mirrors `frontend/src/`. No co-located test files.
- **TypeBox schemas in `backend/src/types/`** — `UpdateTaskBodySchema` is the only schema to modify.
- **No separate `PATCH /api/tasks/:id/deadline` route** — the epics spec mandates the existing `PATCH /api/tasks/:id` endpoint handles deadline. Do NOT create a new route for this.

### Project Structure Notes

```
backend/
  src/
    types/
      tasks.ts           ← MODIFY (extend UpdateTaskBodySchema with deadline field)
    db/
      queries/
        tasks.ts         ← MODIFY (add updateTaskDeadline function)
    routes/
      tasks.ts           ← MODIFY (extend PATCH /tasks/:id handler)
  test/
    db/
      queries/
        tasks.test.ts    ← MODIFY (add updateTaskDeadline describe block)
    routes/
      tasks.test.ts      ← MODIFY (add deadline tests + regression coverage)

frontend/
  src/
    hooks/
      useTasks.ts        ← MODIFY (add useSetDeadline mutation)
    components/
      TaskRow.tsx        ← MODIFY (add deadline display + inline picker)
  test/
    hooks/
      useTasks.test.ts   ← MODIFY (add useSetDeadline describe block)
    components/
      TaskRow.test.tsx   ← MODIFY (add Story 3.2 describe block)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.2-Deadline-Set-and-Remove]
- [Source: _bmad-output/planning-artifacts/epics.md#FR14-FR15] — Functional requirements for deadline set/remove
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003-Database] — `tasks.deadline DATE` column and `idx_tasks_deadline` partial index in `002_tasks.sql`
- [Source: _bmad-output/planning-artifacts/architecture.md#Route-Surface] — `PATCH /api/tasks/:id` is the correct endpoint (line ~382)
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002-Backend-Framework] — `Type.Partial(TaskSchema)` for partial body schema (line ~879)
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-001-Frontend-Framework] — TanStack Query optimistic mutation pattern
- [Source: _bmad-output/implementation-artifacts/3-1-labels-attach-and-remove.md#Dev-Notes] — Established patterns: mutation response without labels, retry affordance requirement, `onSuccess` without invalidateQueries, `'in' operator` for null-vs-absent discrimination

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

_No debug sessions required._

### Completion Notes List

- All 6 tasks implemented across 9 existing files — no new files created.
- `UpdateTaskBodySchema` extended with `Type.Partial` + `additionalProperties: false`; deadline field uses `Type.Union([Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), Type.Null()])` for stricter validation than story spec.
- Route handler uses `'deadline' in req.body` guard (not `!== undefined`) to correctly handle explicit `null` clearing.
- `useSetDeadline` follows established optimistic pattern: no `invalidateQueries` on success, labels merged from cache on `onSuccess`.
- Code review (AI) fixed two bugs post-implementation: `onBlur` picker closure (was conditional on `!e.relatedTarget`; now unconditional) and missing `disabled` pending state on × and 📅 buttons.
- E2E coverage is not included in this story — tracked as follow-up (M2).

### File List

- `backend/src/types/tasks.ts` — extended `UpdateTaskBodySchema` with `deadline` field via `Type.Partial`
- `backend/src/db/queries/tasks.ts` — added `updateTaskDeadline` query function
- `backend/src/routes/tasks.ts` — extended `PATCH /api/tasks/:id` to branch on title/deadline presence
- `frontend/src/hooks/useTasks.ts` — added `useSetDeadline` mutation hook
- `frontend/src/components/TaskRow.tsx` — extended with deadline display, clear button, inline date picker, error/retry state; fixed `onBlur` and pending `disabled` (code review)
- `backend/test/db/queries/tasks.test.ts` — added `updateTaskDeadline` describe block (4 tests)
- `backend/test/routes/tasks.test.ts` — added deadline extension + regression tests (7 tests)
- `frontend/test/hooks/useTasks.test.ts` — added `useSetDeadline` describe block (4 tests)
- `frontend/test/components/TaskRow.test.tsx` — added Story 3.2 describe block (7 tests)

### Change Log

| Date | Change | Author |
|---|---|---|
| 2026-02-26 | Implemented all 6 tasks; all ACs covered | Claude Sonnet 4.6 (dev) |
| 2026-02-26 | Code review: fixed `onBlur` picker bug (H3/L1), added pending `disabled` state (M3) | Claude Sonnet 4.6 (review) |
