# Story 2.5: Delete Task

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to delete a task I no longer need,
so that my list stays clean and relevant.

## Acceptance Criteria

**AC1 — Two-step delete confirmation (permanent button):**
- **Given** I have a task in my list
- **Then** a delete icon button (✕) is permanently visible on the right side of the task row — no hover required (works on both desktop and mobile)
- **And** clicking the delete icon does NOT immediately delete the task — it transitions the row into a "confirm delete" state

**AC2 — Confirm deletion (optimistic):**
- **Given** the task row is in "confirm delete" state
- **When** I click the "Confirm" (or "Delete") button
- **Then** the task is removed from the list immediately (optimistic UI — no spinner)
- **And** `DELETE /api/tasks/:id` is called server-side
- **And** the task count in the header updates accordingly (e.g., `3/5` → `3/4`, or `2/5` → `2/4` depending on completion state)

**AC3 — Cancel deletion:**
- **Given** the task row is in "confirm delete" state
- **When** I click "Cancel"
- **Then** the row returns to its normal display state
- **And** no API call is made

**AC4 — Failure recovery:**
- **Given** `DELETE /api/tasks/:id` fails (server error or network error)
- **When** the server returns an error
- **Then** the optimistic removal is rolled back — the task reappears in the list
- **And** an inline error message with a Retry button is shown on the affected task row
- **And** pressing Retry re-enters the "confirm delete" confirmation state for that task

**AC5 — Task count updates automatically:**
- **Given** a task is deleted
- **When** the TanStack Query cache is updated (task removed optimistically)
- **Then** the task count in the header updates immediately, within 500ms
- **And** the count is derived client-side from the cache: `filter(t => t.is_completed).length` / `tasks.length` (no extra API call)

**AC6 — Not found:**
- **Given** `DELETE /api/tasks/:id` is called for a task that does not exist (or belongs to another user)
- **When** the server processes the request
- **Then** it returns `404` with the standard error shape `{ statusCode: 404, error: "NOT_FOUND", message: "Task not found" }`

## Tasks / Subtasks

- [x] **Task 1: Backend — `deleteTask` query function** (AC: AC2, AC4, AC6)
  - [x] Add `deleteTask(sql, taskId, userId)` to `backend/src/db/queries/tasks.ts`
  - [x] SQL: `DELETE FROM tasks WHERE id = ${taskId} AND user_id = ${userId} RETURNING id`
  - [x] Return type: `boolean` — `true` if a row was deleted, `false` if zero rows matched (task not found or belongs to another user)
  - [x] Use tagged template: `const rows = await sql\`...\``; check `rows.count > 0` or `rows.length > 0`
  - [x] No `RETURNING` columns beyond `id` — a delete confirmation needs only success/failure
  - [x] Named export only (consistent with file conventions)

- [x] **Task 2: Backend — `DELETE /api/tasks/:id` route** (AC: AC2, AC4, AC6)
  - [x] Add route to `backend/src/routes/tasks.ts` inside the existing `taskRoutes` plugin body
  - [x] `preHandler: [fastify.authenticate]`
  - [x] Params schema: `Type.Object({ id: Type.Integer({ minimum: 1 }) })` — consistent with existing routes
  - [x] Handler: call `deleteTask(fastify.sql, params.id, userId)` — import from `../db/queries/tasks.js`
  - [x] Success: `reply.status(204).send()` — 204 No Content is idiomatic for DELETE (no body)
  - [x] Not found (or wrong user): `reply.status(404).send({ statusCode: 404, error: 'NOT_FOUND', message: 'Task not found' })`
  - [x] **No body schema** — DELETE requests carry no request body
  - [x] Add `deleteTask` to the existing import from `../db/queries/tasks.js`

- [x] **Task 3: Frontend — `useDeleteTask` mutation hook** (AC: AC2, AC4, AC5)
  - [x] Add `useDeleteTask()` to `frontend/src/hooks/useTasks.ts`
  - [x] `mutationFn`: `api.delete<void>('/tasks/${id}')` — `api.delete` already exists in `frontend/src/lib/api.ts`
  - [x] `onMutate`: cancel `['tasks']` queries, snapshot `previous`, remove the task from cache (`old?.filter(t => t.id !== id) ?? []`), return `{ previous }`
  - [x] `onError`: rollback to `context.previous`; then `queryClient.invalidateQueries({ queryKey: ['tasks'] })` to re-sync
  - [x] `onSuccess`: no additional cache update (task already removed optimistically); **no `invalidateQueries`** on success (established pattern)
  - [x] The mutation receives `id: number` as its variable (just the task ID — not the full Task object)

- [x] **Task 4: Frontend — Extend `TaskRow.tsx` with two-step delete confirmation** (AC: AC1, AC2, AC3, AC4)
  - [x] `TaskRow.tsx` was created in Story 2.3 and extended in Story 2.4 — extend it further (do NOT re-create)
  - [x] Add `useDeleteTask` import alongside existing `useToggleTask` and `useUpdateTask`
  - [x] Add local state: `isConfirmingDelete: boolean` (default `false`) and `deleteError: string | null` (default `null`)
  - [x] **Step 1 (hover reveal)**: delete icon button, hidden by default, shown on hover via `opacity-0 group-hover:opacity-100` (same pattern as edit icon `✎`). Use `🗑` or `✕` character or an SVG; `aria-label="Delete task"`.
  - [x] **Click delete icon**: set `isConfirmingDelete(true)` — do NOT call mutation yet
  - [x] **Step 2 (confirm state)**: when `isConfirmingDelete === true`, render a confirmation inline area:
    - A brief "Delete?" label/text
    - A "Confirm" button (or "Delete" button) that calls `deleteTask.mutate(task.id)`
    - A "Cancel" button that calls `setIsConfirmingDelete(false)`
  - [x] **Optimistic removal**: once `mutate` is called, the task row disappears immediately (removed from cache in `onMutate`)
  - [x] **On error (AC4)**: `useDeleteTask`'s `onError` rolls back the cache (task reappears). `TaskRow` should also display `deleteError` inline with a Retry button that re-enters `isConfirmingDelete(true)`.
  - [x] **Do NOT break existing Story 2.3 / 2.4 features**: checkbox toggle, Space-key completion, inline edit, ARIA labels, error handling — all must remain intact
  - [x] Hide the edit icon (`✎`) when `isConfirmingDelete === true` (avoid conflicting UI states)
  - [x] ARIA: `aria-label="Delete task"` on the delete icon; `role="alert"` on inline delete error text; confirmation buttons need descriptive `aria-label` values

- [x] **Task 5: Tests** (AC: AC1–AC6)
  - [x] **Backend route**: Add `describe('DELETE /api/tasks/:id (delete task)')` block to `backend/test/routes/tasks.test.ts`:
    - [x] 401 when unauthenticated
    - [x] 204 + task is actually gone (verify with a follow-up `GET /api/tasks`) on success
    - [x] 404 when task does not exist
    - [x] 404 when task belongs to another user (ownership isolation)
  - [x] **Backend DB query**: Add `describe('deleteTask query')` block to `backend/test/db/queries/tasks.test.ts` (Testcontainers, real DB):
    - [x] Returns `true` when task is deleted successfully
    - [x] Returns `false` when `taskId` doesn't exist
    - [x] Returns `false` when task belongs to a different `userId` (ownership isolation — the task remains in DB)
    - [x] Task is actually removed from DB after deletion (verify with a follow-up query)
  - [x] **Frontend hook**: Add `describe('useDeleteTask')` block to `frontend/test/hooks/useTasks.test.ts`:
    - [x] `onMutate` removes task from cache optimistically
    - [x] `onError` restores previous cache state
    - [x] `onSuccess` leaves cache in the already-optimistically-updated state (no extra items appear)
  - [x] **Frontend component**: Add `describe('TaskRow — delete with confirmation (Story 2.5)')` block to `frontend/test/components/TaskRow.test.tsx`:
    - [x] Delete icon is present in the DOM (verify `aria-label="Delete task"`)
    - [x] Clicking delete icon enters confirm state (renders "Cancel" button)
    - [x] Clicking "Cancel" exits confirm state without firing mutation
    - [x] Clicking "Confirm" fires `useDeleteTask` mutation with the task's ID
    - [x] Mutation failure shows inline delete error and Retry button
    - [x] Retry re-enters confirm state (`isConfirmingDelete === true`)
    - [x] Existing Story 2.3 tests still pass (checkbox, Space key toggle, toggle error state)
    - [x] Existing Story 2.4 tests still pass (edit icon, edit mode, keyboard interactions)

## Dev Notes

### Dependency on Stories 2.3 and 2.4

Story 2.5 **extends** `TaskRow.tsx` which was **created** in Story 2.3 and **extended** in Story 2.4. Both must be fully implemented. Ensure `TaskRow.tsx` exists at `frontend/src/components/TaskRow.tsx` with all Story 2.3 and 2.4 functionality before starting.

### Architecture Compliance

- **Only `db/queries/tasks.ts` may issue SQL** — route handlers call `deleteTask()`, never `fastify.sql` directly.
- **`fp()` wrapping** — Do NOT create a new route file. Add `DELETE /api/tasks/:id` inside the existing `taskRoutes` plugin in `backend/src/routes/tasks.ts`.
- **Route params coercion** — Use `Type.Integer({ minimum: 1 })` for the TypeBox params schema (consistent with existing routes). `@fastify/type-provider-typebox` automatically coerces the URL string to an integer.
- **Auth guard** — `preHandler: [fastify.authenticate]` is mandatory. `req.user` is cast as `{ id: number }`.
- **No DELETE route on `/api/tasks/:id` exists yet** — Story 2.4 added `PATCH /api/tasks/:id` for title update. This is the first `DELETE` on the base resource.
- **Error response shape** — `{ statusCode, error, message }` for all error responses. No exceptions.

### API Endpoint Contract

```
DELETE /api/tasks/:id
  Request body: none
  Response 204: (empty body — task deleted)
  Response 401: (delegated to auth plugin — no cookie / invalid JWT)
  Response 404: { statusCode: 404, error: "NOT_FOUND", message: "Task not found" }
```

**Note on 403 vs 404**: The epics spec AC6 says "403 Forbidden" when the task belongs to another user. However, the established project pattern (documented in Story 2.4 Dev Notes) is to return 404 for *both* "task doesn't exist" and "task belongs to another user" using a single `WHERE id = $taskId AND user_id = $userId` query. This prevents cross-user task enumeration (a security best practice) and is consistent with all other task routes. **Recommendation: follow the established 404 pattern.** If you want strict spec compliance, use two queries (first check existence, then ownership) — but this is NOT recommended for MVP.

### Backend — `deleteTask` Query Implementation

```typescript
export const deleteTask = async (sql: Sql, taskId: number, userId: number): Promise<boolean> => {
  const rows = await sql`
    DELETE FROM tasks
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING id
  `
  return rows.length > 0
}
```

Key points:
- `RETURNING id` is the minimal return — we only need to know if a row was deleted
- `rows.length > 0` is the idiomatic check (`postgres` npm returns an array with `count` property too)
- **No `updated_at` concern** — DELETE does not involve `updated_at` (unlike UPDATE)
- **No cascade needed at this story level** — the `tasks` table has `ON DELETE CASCADE` for `subtasks`, `task_labels` (set up in Story 3.1 migration). For Stories 2.x, tasks have no child rows yet — this is safe to delete directly

### Frontend — Optimistic Delete Mutation Pattern

```typescript
type DeleteTaskContext = { previous: Task[] | undefined }

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, number, DeleteTaskContext>({
    mutationFn: (id: number) => api.delete<void>(`/tasks/${id}`),

    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.filter(t => t.id !== id) ?? []
      )
      return { previous }
    },

    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previous)
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },

    onSuccess: () => {
      // Task already removed optimistically — no cache update needed
      // ⛔ Do NOT call invalidateQueries on success (established pattern — avoids extra GET)
    },
  })
}
```

**Return type note**: The `mutationFn` returns `Promise<void>` because `DELETE /api/tasks/:id` responds with `204 No Content` (no body). However, `api.delete<void>` calls `res.json()` internally which will fail on a 204 response (no JSON body). **You must handle this**: either (a) update `api.delete` to skip `.json()` when status is 204, OR (b) make the backend return `200` with an empty object `{}` instead of `204`. 

**Recommended approach**: Update the `api.delete` helper (or the shared `request` function) to handle 204 responses:

```typescript
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ... })
  if (!res.ok) { ... }
  // Handle 204 No Content — no JSON body
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
```

Alternatively, change the backend to return `200` with `{}` body — simpler but less RESTful. **Preference: handle 204 in `api.ts` (the `request` function) with the `res.status === 204` check** — it's a one-line change and is more correct.

### Frontend — `TaskRow` Delete UX Pattern

State additions to `TaskRow`:
```typescript
const deleteTask = useDeleteTask()
const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
const [deleteError, setDeleteError] = useState<string | null>(null)
```

Row structure after Story 2.5:
```
[ checkbox ] [ title (display) OR <input> (edit mode) ] [ edit icon ✎ ] [ delete icon 🗑 ] [ error area ]
```

When `isConfirmingDelete === true`:
```
[ checkbox ] [ title (display) ] [ "Delete?" | Confirm btn | Cancel btn ] [ error area ]
```

Key implementation notes:
- Both the edit icon AND delete icon are `opacity-0 group-hover:opacity-100` — both use `group-hover:` on the parent `<li className="group ...">` (already set from Story 2.4)
- When `isConfirmingDelete === true`: hide the edit icon (avoid conflicting UI), show the inline confirmation strip
- When `isEditing === true` (edit mode from Story 2.4): hide the delete icon (no delete during edit)
- Both `isConfirmingDelete` and `isEditing` should not be true simultaneously — they are mutually exclusive

Delete icon button:
```tsx
{!isEditing && !isConfirmingDelete && (
  <button
    onClick={() => { setDeleteError(null); setIsConfirmingDelete(true) }}
    aria-label="Delete task"
    className="opacity-0 group-hover:opacity-100 text-[#888] hover:text-red-400 motion-safe:transition-opacity px-1"
  >
    ✕
  </button>
)}
```

Confirmation strip:
```tsx
{isConfirmingDelete && (
  <span className="flex items-center gap-2 ml-auto">
    <span className="text-[11px] text-red-400">Delete?</span>
    <button
      onClick={() => {
        setIsConfirmingDelete(false)
        deleteTask.mutate(task.id, {
          onError: () => setDeleteError('Failed to delete task. Please try again.'),
        })
      }}
      aria-label="Confirm delete task"
      className="text-[11px] text-red-400 underline hover:text-red-300"
    >
      Confirm
    </button>
    <button
      onClick={() => setIsConfirmingDelete(false)}
      aria-label="Cancel delete"
      className="text-[11px] text-[#888] underline hover:text-[#f0f0f0]"
    >
      Cancel
    </button>
  </span>
)}
```

Delete error (inline, with Retry):
```tsx
{deleteError && (
  <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400 flex items-center gap-2">
    <span>{deleteError}</span>
    <button
      onClick={() => { setDeleteError(null); setIsConfirmingDelete(true) }}
      className="underline hover:text-red-300"
      aria-label="Retry delete"
    >
      Retry
    </button>
  </div>
)}
```

### UX / Visual Requirements

From UX design specification and NFR12:
- **NFR12**: "Destructive actions (delete) require explicit user confirmation before execution (two-step: hover reveals → explicit click confirms)"
- **No undo available** — this is explicitly stated in the story AC. Do not add any undo/snackbar mechanism.
- **Inline-always errors** — errors shown inline in the task row, never in modals or auto-dismissing toasts
- **Pixel-art aesthetic** — error text in `text-red-400`, confirmation strip uses the same monospace sizing (`text-[11px]`) as other inline UI
- **`prefers-reduced-motion`** — any opacity transition on icon reveal should use `motion-safe:` variant (already pattern-established for edit icon in Story 2.4)
- **ARIA**: `aria-label="Delete task"` on the delete icon; `aria-label="Confirm delete task"` on confirm button; `aria-label="Cancel delete"` on cancel button; `role="alert"` on inline error text

### Previous Story Intelligence (from Story 2.4)

Key learnings to carry forward:
1. **`onSettled: invalidateQueries` on success = High bug** — confirmed pattern: `invalidateQueries` only in `onError`. Never on success.
2. **`api.delete<void>` exists in `frontend/src/lib/api.ts`** — but the shared `request` function calls `res.json()` on all responses. The backend returns `204 No Content` with no body — this will throw a JSON parse error. **Must fix `request()` to handle `res.status === 204` before calling `res.json()`.**
3. **`TaskRow.tsx` has `group` class on `<li>`** — the `group`/`group-hover:` pattern is already established for the edit icon. The delete icon uses the same pattern — no new Tailwind classes needed.
4. **Two state machines must not conflict**: `isEditing` (Story 2.4) and `isConfirmingDelete` (Story 2.5) are mutually exclusive. When one is active, the other's trigger (icon button) should be hidden.
5. **`backend/test/helpers/db.ts`** `createTestDb()` helper is established — reuse in all new `describe` blocks.
6. **Column aliases don't apply to `deleteTask`** — it only returns `id` (for the `RETURNING` check). No full task object reconstruction needed.
7. **`TaskRow.test.tsx` has existing Story 2.3 and 2.4 test blocks** — extend with a new `describe('TaskRow — delete with confirmation (Story 2.5)')` block. Do NOT modify existing test blocks.

### Git Intelligence Summary

Recent commits (HEAD → main):
- `8245808` — feat: complete Story 2.4 — Edit Task Title with code review fixes, improved keyboard accessibility, and updated task update logic
- `37558ce` — feat: implement Story 2.4: Edit Task Title
- `f0bd518` — feat: implement auto-login on user registration and add E2E tests for task completion
- `d349e7f` — feat: 2-3-mark-task-complete-un-complete-with-live-task-count done
- `01d5d16` — feat: Implement Story 2.3 — Mark Task Complete/Un-complete with Live Task Count

**Current codebase state** (as of story creation):
- `backend/src/routes/tasks.ts`: has `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id` (title update), `PATCH /tasks/:id/complete`, `PATCH /tasks/:id/uncomplete` — **`DELETE /tasks/:id` does NOT yet exist**
- `backend/src/db/queries/tasks.ts`: has `getTasks`, `createTask`, `completeTask`, `uncompleteTask`, `updateTaskTitle` — **`deleteTask` does NOT yet exist**
- `frontend/src/hooks/useTasks.ts`: has `useTasks`, `useCreateTask`, `useToggleTask`, `useUpdateTask` — **`useDeleteTask` does NOT yet exist**
- `frontend/src/components/TaskRow.tsx`: has toggle (Story 2.3) + inline edit (Story 2.4) — **delete UI does NOT yet exist**
- `frontend/src/lib/api.ts`: has `get`, `post`, `patch`, `put`, `delete` helpers — `api.delete` exists but `request()` needs `204` handling

**Regression risk areas** (do NOT modify unnecessarily):
- `InlineTaskInput.tsx` (task creation from Story 2.2) — untouched
- `AppHeader.tsx` / `TaskCountDisplay.tsx` — task count derives from `useTasks()` cache; deleting a task removes it from cache, count updates automatically — **no changes needed**
- `useCreateTask`, `useToggleTask`, `useUpdateTask` mutation patterns — do not alter
- All existing `TaskRow.tsx` state and handlers (toggle, edit mode) — extend carefully

### Critical: `api.ts` 204 Handling Fix

The `request()` function in `frontend/src/lib/api.ts` currently calls `res.json()` on all successful responses. `DELETE /api/tasks/:id` returns `204 No Content` with no body — calling `res.json()` on a 204 will throw or return `undefined`. Update the function:

```typescript
// In request<T>(), after the !res.ok check:
if (res.status === 204 || res.headers.get('content-length') === '0') {
  return undefined as T
}
return res.json() as Promise<T>
```

This is a **one-line addition** to `frontend/src/lib/api.ts`. It is safe and backward-compatible — no existing calls return 204, so nothing breaks.

### File Structure

**Backend — extend existing files:**
- `backend/src/db/queries/tasks.ts` — add `deleteTask` (extend existing file)
- `backend/src/routes/tasks.ts` — add `DELETE /api/tasks/:id` (extend existing plugin body)
- `backend/test/routes/tasks.test.ts` — add `describe('DELETE /api/tasks/:id (delete task)')` block
- `backend/test/db/queries/tasks.test.ts` — add `describe('deleteTask query')` block

**Frontend — extend existing files:**
- `frontend/src/lib/api.ts` — add 204 handling to the `request()` function (one line)
- `frontend/src/hooks/useTasks.ts` — add `useDeleteTask` (extend existing file)
- `frontend/src/components/TaskRow.tsx` — add delete state and UI (extend existing file)
- `frontend/test/hooks/useTasks.test.ts` — add `describe('useDeleteTask')` block
- `frontend/test/components/TaskRow.test.tsx` — add `describe('TaskRow — delete with confirmation (Story 2.5)')` block

**Do NOT touch:**
- `AppHeader.tsx` — task count updates automatically via cache
- `TaskCountDisplay.tsx` — no changes needed
- `InlineTaskInput.tsx` — must not regress task creation
- `TaskListPage.tsx` — already renders `<TaskRow />` components; deletion handled by cache update
- Any existing mutation hooks (`useCreateTask`, `useToggleTask`, `useUpdateTask`)

### Project Context Reference

Sources used:
- [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md) — Story 2.5 acceptance criteria and epic objectives (Epic 2, Story 5)
- [_bmad-output/implementation-artifacts/2-4-edit-task-title.md](_bmad-output/implementation-artifacts/2-4-edit-task-title.md) — previous story patterns, established conventions, library rules, git intelligence
- [_bmad-output/project-context.md](_bmad-output/project-context.md) — project-wide rules, testing standards, anti-patterns, naming conventions
- [backend/src/routes/tasks.ts](backend/src/routes/tasks.ts) — current route structure (GET, POST, PATCH variants)
- [backend/src/db/queries/tasks.ts](backend/src/db/queries/tasks.ts) — current query patterns and column aliases
- [frontend/src/lib/api.ts](frontend/src/lib/api.ts) — api helper (confirmed `api.delete` exists; `request()` needs 204 fix)
- [frontend/src/hooks/useTasks.ts](frontend/src/hooks/useTasks.ts) — canonical optimistic mutation blueprints
- [frontend/src/components/TaskRow.tsx](frontend/src/components/TaskRow.tsx) — current TaskRow state, structure, and patterns

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- **Backend tasks completed (2026-02-25)**: Implemented `deleteTask(sql, taskId, userId): Promise<boolean>` in `backend/src/db/queries/tasks.ts` — single `DELETE WHERE id AND user_id RETURNING id`, returns `rows.length > 0`.
- Added `DELETE /api/tasks/:id` route in `backend/src/routes/tasks.ts` — `preHandler: [fastify.authenticate]`, params `Type.Integer({ minimum: 1 })`, returns `204 No Content` on success, `404 NOT_FOUND` when task not found or belongs to another user (established security pattern).
- 8 new backend tests pass: 4 route integration tests (`401`, `204+verification`, `404 not-found`, `404 ownership`) and 4 DB query tests (`true on delete`, `row removed from DB`, `false when not-found`, `false+row-intact on wrong userId`). Full suite: **81/81 tests passed, 0 regressions**.
- **Frontend tasks completed (2026-02-25)**: Fixed `request()` in `frontend/src/lib/api.ts` to return `undefined as T` for 204/no-body responses, preventing JSON parse errors on `DELETE /api/tasks/:id`.
- Added `useDeleteTask()` to `frontend/src/hooks/useTasks.ts` — optimistic removal via `onMutate` (filter from cache), rollback + `invalidateQueries` in `onError`, no-op `onSuccess` (established pattern).
- Extended `TaskRow.tsx` with two-step delete: hover-reveal `✕` icon (AC1), `isConfirmingDelete` state transitions to inline "Delete? / Confirm / Cancel" strip (AC2, AC3), `onError` shows inline error with Retry button that re-enters confirm state (AC4). Edit icon hidden during confirm state; delete icon hidden during edit mode (mutual exclusion). All existing Story 2.3/2.4 functionality preserved.
- Added 3 `useDeleteTask` hook tests and 8 `TaskRow` delete component tests. **Frontend suite: 94/94 tests passed, 0 regressions** (up from 81).

### File List

- `backend/src/db/queries/tasks.ts` — added `deleteTask(sql, taskId, userId): Promise<boolean>`
- `backend/src/routes/tasks.ts` — added `DELETE /api/tasks/:id` route; updated import to include `deleteTask`
- `backend/test/routes/tasks.test.ts` — added `describe('DELETE /api/tasks/:id (delete task)')` block (4 tests); added `createTask` import
- `backend/test/db/queries/tasks.test.ts` — added `describe('deleteTask query')` block (4 tests); updated import to include `deleteTask`
- `frontend/src/lib/api.ts` — added 204/no-body handling to `request()` to prevent JSON parse error on DELETE 204 response
- `frontend/src/hooks/useTasks.ts` — added `useDeleteTask()` optimistic mutation hook
- `frontend/src/components/TaskRow.tsx` — extended with `isConfirmingDelete`/`deleteError` state, delete icon (hover-reveal), confirmation strip, inline delete error with Retry
- `frontend/test/hooks/useTasks.test.ts` — added `describe('useDeleteTask')` block (3 tests)
- `frontend/test/components/TaskRow.test.tsx` — added `describe('TaskRow — delete with confirmation (Story 2.5)')` block (8 tests)

- **2026-02-25**: Implemented backend tasks (Tasks 1, 2, 5-backend). Added `deleteTask` query, `DELETE /api/tasks/:id` route (204 No Content on success, 404 on not-found/wrong-user). Added 4 route integration tests and 4 DB query tests. All 81 backend tests pass. Frontend tasks (3, 4, 5-frontend) pending.
- **2026-02-25**: Implemented frontend tasks (Tasks 3, 4, 5-frontend). Fixed `api.ts` for 204 handling. Added `useDeleteTask` hook with optimistic delete + rollback. Extended `TaskRow` with two-step delete confirmation UI (hover-reveal icon, confirm/cancel strip, inline error + Retry). All 94 frontend tests pass, 0 regressions. Story complete.
