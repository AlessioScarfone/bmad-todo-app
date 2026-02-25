# Story 2.4: Edit Task Title

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to edit a task's title after creation,
so that I can correct mistakes or reword work items.

## Acceptance Criteria

**AC1 — Activate inline edit mode:**
- **Given** I have a task in my list
- **When** I activate the edit action on a task row (click edit icon or press Enter on a focused task row)
- **Then** the task row enters an inline edit mode with the title field editable (an `<input>` pre-populated with the current title)
- **And** I can submit the edit with Enter or cancel with Escape

**AC2 — Submit edited title (optimistic):**
- **Given** I am in inline edit mode and type a new title
- **When** I press Enter (or click a confirm button)
- **Then** the task row immediately shows the new title (optimistic update — no spinner)
- **And** `PATCH /api/tasks/:id` is called with `{ title: "<new title>" }` in the request body
- **And** the server persists the change and returns the updated task object
- **And** the cache is updated with the server-confirmed task

**AC3 — Cancel with Escape:**
- **Given** I am in inline edit mode
- **When** I press Escape
- **Then** edit mode is dismissed
- **And** the original title is restored in the task row
- **And** no API call is made

**AC4 — Failure recovery:**
- **Given** the `PATCH /api/tasks/:id` call fails
- **When** the server returns an error
- **Then** the optimistic title update is rolled back to the original title
- **And** an inline error message with a Retry button is shown on the affected task row
- **And** pressing Retry re-opens edit mode pre-populated with the attempted new title

**AC5 — Empty title validation:**
- **Given** I am in inline edit mode
- **When** I clear the title field entirely and attempt to submit
- **Then** no API call is made
- **And** an inline validation hint is shown on the input ("Title must not be empty")

## Tasks / Subtasks

- [x] **Task 1: Backend — `UpdateTaskBodySchema` type** (AC: AC2, AC5)
  - [x] Add `UpdateTaskBodySchema` to `backend/src/types/tasks.ts`:
    ```typescript
    export const UpdateTaskBodySchema = Type.Object({
      title: Type.String({ minLength: 1 }),
    })
    export type UpdateTaskBody = Static<typeof UpdateTaskBodySchema>
    ```

- [x] **Task 2: Backend — `updateTaskTitle` query function** (AC: AC2)
  - [x] Add `updateTaskTitle(sql, taskId, userId, title)` to `backend/src/db/queries/tasks.ts`
  - [x] SQL: `UPDATE tasks SET title = ${title}, updated_at = NOW() WHERE id = ${taskId} AND user_id = ${userId} RETURNING ...`
  - [x] Use the exact same `RETURNING` column aliases as `getTasks` and `createTask` (see "Database Rules" below)
  - [x] Return type: `Task | undefined` — if zero rows returned, the task doesn't exist or belongs to another user
  - [x] No default export — named export only (consistent with file pattern)

- [x] **Task 3: Backend — `PATCH /api/tasks/:id` route** (AC: AC2, AC4, AC5)
  - [x] Add route to `backend/src/routes/tasks.ts` inside the existing `taskRoutes` plugin body
  - [x] `preHandler: [fastify.authenticate]`
  - [x] Params schema: `Type.Object({ id: Type.Number() })` — TypeBox coerces `:id` string to number automatically
  - [x] Body schema: `UpdateTaskBodySchema` (import from `../types/tasks.js`)
  - [x] Handler: trim title, reject with 400 if empty (belt-and-suspenders — TypeBox `minLength:1` catches it at schema level too)
  - [x] Call `updateTaskTitle(fastify.sql, params.id, userId, title)` — if `undefined` → 404 with standard error shape
  - [x] Success: `reply.status(200).send(updatedTask)`
  - [x] Error shape: `{ statusCode, error, message }` — consistent with all other task routes

- [x] **Task 4: Frontend — `useUpdateTask` mutation hook** (AC: AC2, AC3, AC4)
  - [x] Add `useUpdateTask()` to `frontend/src/hooks/useTasks.ts`
  - [x] `mutationFn`: `api.patch<Task>('/tasks/:id', { title })` — use the actual task ID
  - [x] `onMutate`: cancel `['tasks']` queries, snapshot previous, apply optimistic update (replace task title in cache by ID), return `{ previous, taskId, optimisticTitle }`
  - [x] `onError`: rollback to `context.previous`; then `queryClient.invalidateQueries({ queryKey: ['tasks'] })` to re-sync (same pattern as `useCreateTask` and `useToggleTask`)
  - [x] `onSuccess`: replace the task in cache with the server-confirmed task using `.map()` — do **NOT** call `invalidateQueries` on success
  - [x] The mutation receives `{ id: number; title: string }` as its variable

- [x] **Task 5: Frontend — Extend `TaskRow.tsx` with inline edit mode** (AC: AC1, AC2, AC3, AC4, AC5)
  - [x] `TaskRow.tsx` is created in Story 2.3 — extend it (do NOT re-create from scratch)
  - [x] Add a local `isEditing: boolean` state (default `false`) and `editValue: string` state (mirrors current title)
  - [x] **Enter edit mode** when: (a) user clicks the edit icon button on the row, OR (b) user presses Enter on a focused task row (when NOT already in edit mode)
  - [x] **In edit mode**: render an `<input type="text">` with the current `editValue`; auto-focus on mount
  - [x] **Press Enter in input**: call `updateTask({ id: task.id, title: editValue.trim() })` if title is non-empty — exit edit mode immediately (optimistic)
  - [x] **Press Escape in input**: reset `editValue` to `task.title`, exit edit mode — no API call
  - [x] **Empty title attempt**: show inline validation text "Title must not be empty" — do not call API
  - [x] **Mutation failure**: `useUpdateTask`'s `onError` rolls back the cache; `TaskRow` should also show an inline error message and a Retry button that re-enters edit mode with the failed title pre-populated
  - [x] **Do NOT break Story 2.3 features**: checkbox toggle, Space-key completion, ARIA checkbox label, inline error on completion failure — all must remain intact
  - [x] Edit icon button: small accessible icon (can use `✎` character or an SVG) with `aria-label="Edit task title"`, visible on hover of the row
  - [x] `aria-label` on the edit input: `"Edit task title: [current title]"`

- [x] **Task 6: Tests** (AC: AC1–AC5)
  - [x] **Backend route**: Extend `backend/test/routes/tasks.test.ts` with a new `describe('PATCH /api/tasks/:id (update title)')` block:
    - [x] 401 when unauthenticated
    - [x] 400 when body `title` is missing or empty string
    - [x] 404 when task not found or belongs to another user
    - [x] 200 + updated task object returned with new title and updated `updatedAt`
    - [x] Assert `updatedAt` is strictly greater than `createdAt` (ensures the field was actually updated)
  - [x] **Backend DB query**: Extend `backend/test/db/queries/tasks.test.ts` with `updateTaskTitle` tests (Testcontainers, real DB):
    - [x] Returns updated task with new title and updated `updatedAt`
    - [x] Returns `undefined` when `taskId` doesn't exist
    - [x] Returns `undefined` when task belongs to a different `userId` (ownership isolation)
  - [x] **Frontend hook**: Extend or create `frontend/test/hooks/useTasks.test.ts` (or add to existing) for `useUpdateTask`:
    - [x] `onMutate` optimistically updates title in cache
    - [x] `onError` rolls back to original
    - [x] `onSuccess` replaces task with server response
  - [x] **Frontend component**: Extend `frontend/test/components/TaskRow.test.tsx` (created in Story 2.3):
    - [x] Edit icon button is present in the DOM
    - [x] Clicking edit icon enters edit mode (input appears with current title)
    - [x] Pressing Enter in input fires `useUpdateTask` mutation with new title
    - [x] Pressing Escape exits edit mode without firing mutation
    - [x] Empty title shows validation hint, does not fire mutation
    - [x] Mutation failure shows inline error and Retry button
    - [x] Retry re-opens edit mode with the failed title
    - [x] Existing Story 2.3 tests still pass (checkbox, Space key, etc.)

## Dev Notes

### Dependency on Story 2.3

Story 2.4 **extends** `TaskRow.tsx` which is **created** in Story 2.3. Story 2.3 must be fully implemented before this story can be considered in-progress. Ensure `TaskRow.tsx` exists at `frontend/src/components/TaskRow.tsx` before starting.

If Story 2.3 is still in-progress when you start 2.4, coordinate the `TaskRow.tsx` changes to avoid merge conflicts on that file.

### Architecture Compliance

- **Only `db/queries/tasks.ts` may issue SQL** — route handlers call query functions, never `fastify.sql` directly.
- **`fp()` wrapping** — Do NOT create a new route file. Add the new `PATCH /api/tasks/:id` route inside the existing `taskRoutes` plugin in `backend/src/routes/tasks.ts`.
- **Route params coercion** — Use `Type.Object({ id: Type.Number() })` for the TypeBox params schema. `@fastify/type-provider-typebox` automatically coerces the URL string to a number.
- **Auth guard** — `preHandler: [fastify.authenticate]` is mandatory. `req.user` is cast as `{ id: number }`.
- **No `PATCH /api/tasks/:id` exists yet** — Story 2.3 only adds `/complete` and `/uncomplete` suffixed routes. This is the first generic `PATCH /api/tasks/:id` (title update) route.
- **Error response shape** — Always `{ statusCode, error, message }` for errors. For not-found: `{ statusCode: 404, error: "NOT_FOUND", message: "Task not found" }`. For 400: `{ statusCode: 400, error: "Bad Request", message: "Title must not be empty or blank" }` (match the exact casing from `POST /api/tasks`).

### Database Rules (Critical)

- **`updated_at` has NO DB trigger** — every `UPDATE tasks` MUST explicitly include `SET updated_at = NOW()`. Omitting this is a silent bug.
- **Ownership isolation** — `WHERE id = ${taskId} AND user_id = ${userId}`. If `RETURNING` produces zero rows, the task either doesn't exist or belongs to a different user — return `undefined` (don't distinguish between 404 and 403 — use 404 for both, as established in the codebase).
- **Column aliases** — Stay consistent with `getTasks` and `createTask`:
  ```sql
  RETURNING
    id,
    user_id      AS "userId",
    title,
    is_completed AS "isCompleted",
    completed_at AS "completedAt",
    deadline,
    created_at   AS "createdAt",
    updated_at   AS "updatedAt"
  ```

### API Endpoint Contract

```
PATCH /api/tasks/:id
  Request body: { "title": "New task title" }
  Response 200: { id, userId, title, isCompleted, completedAt, deadline, createdAt, updatedAt }
  Response 400: { statusCode: 400, error: "Bad Request", message: "Title must not be empty or blank" }
  Response 401: (delegated to auth plugin — no cookie / invalid JWT)
  Response 404: { statusCode: 404, error: "NOT_FOUND", message: "Task not found" }
```

This is distinct from the Story 2.3 routes (`/complete`, `/uncomplete`) which take no body. This route requires a body and uses the base `:id` path.

### Frontend — Optimistic Mutation Pattern (Canonical)

Follow the exact established pattern from `useCreateTask` (Story 2.2, in `frontend/src/hooks/useTasks.ts`):

```typescript
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation<Task, Error, { id: number; title: string }, { previous: Task[] | undefined }>({
    mutationFn: ({ id, title }) => api.patch<Task>(`/tasks/${id}`, { title }),

    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === id ? { ...t, title } : t) ?? []
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
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => t.id === serverTask.id ? serverTask : t) ?? [serverTask]
      )
      // ⛔ Do NOT call invalidateQueries here — would fire extra GET and violate AC2 optimistic requirement
    },
  })
}
```

**Critical**: No `onSettled` / `invalidateQueries` on success — this was a High severity bug caught in Story 2.2 code review and has been the rule ever since.

### Frontend — `api.patch` helper

The existing `api` helper in `frontend/src/lib/api.ts` has a `patch` method (same signature as `post`). Confirm it exists before using it — if it doesn't exist yet, add:
```typescript
patch: <T>(url: string, body?: unknown) => fetch(`${BASE_URL}${url}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: body ? JSON.stringify(body) : undefined,
  credentials: 'include',
}).then(handleResponse<T>),
```
If `api.patch` was already added in Story 2.3 (`useToggleTask` uses it), use it directly — do NOT create a duplicate.

### Frontend — Inline Edit UX Detail

The `TaskRow` component (created in Story 2.3) will have this structure after Story 2.4 extends it:

```
[ checkbox ]  [ task title (display) OR <input> (edit mode) ]  [ edit icon (hover) ]  [ error area ]
```

State management inside `TaskRow`:
```typescript
const [isEditing, setIsEditing] = useState(false)
const [editValue, setEditValue] = useState(task.title)
const [editError, setEditError] = useState<string | null>(null)
const [failedTitle, setFailedTitle] = useState<string | null>(null) // for Retry
```

Key keyboard interactions:
- Non-edit mode: `Enter` on focused row → `setIsEditing(true)` (do NOT interfere with checkbox `Space` key from Story 2.3)
- Edit mode: `Enter` → submit if non-empty; `Escape` → cancel
- Auto-focus the `<input>` when entering edit mode (use `autoFocus` or `inputRef.current?.focus()` in `useEffect`)

The edit icon should only be visible on hover of the task row. Use Tailwind `group` and `group-hover:` variants:
```tsx
<li className="group ...">
  ...
  <button
    aria-label="Edit task title"
    className="opacity-0 group-hover:opacity-100 ..."
    onClick={() => setIsEditing(true)}
  >✎</button>
</li>
```

### UX / Visual Requirements

From UX design specification:
- **Inline-always** — edit mode opens inline in the task row, never in a modal or separate page
- **Keyboard-native**: Enter to submit, Escape to cancel. This is the primary path.
- **Pixel-art aesthetic** — use `border-2 border-black bg-[#1c1c1c]` style for the inline input; keep `font-mono text-[13px] text-[#f0f0f0]` consistent with the display title
- **Inline error** — if edit fails, show error text inline within the task row (same positioning as completion error from Story 2.3). Include a Retry button that re-enters edit mode with the failed title.
- **No auto-dismissing toasts** — errors must persist until explicitly dismissed or retried.
- **`prefers-reduced-motion`** — wrap any CSS transition on edit mode toggle in `motion-safe:` Tailwind variant.
- **ARIA**: `aria-label="Edit task title"` on the edit icon button; `aria-label="Edit task title: [current title]"` on the input; `role="alert"` on inline error text.

### Testing Requirements

- **Backend integration tests** use Testcontainers with a real `postgres:16-alpine` container. One container per `describe` block (via `beforeAll` / `afterAll`). Never mock the database.
- **Backend test helper**: `createTestDb()` is in `backend/test/helpers/db.ts` — import and reuse, do NOT redefine.
- **Frontend unit tests**: Mock `lib/api.ts` at module level (already established pattern from Story 2.2/2.3). Test edit input rendering, keyboard interactions, optimistic update, rollback, error state.
- **`TESTCONTAINERS_RYUK_DISABLED=true`** and Docker socket env vars are pre-configured in `backend/package.json` — do not modify or strip them.
- **Vitest `include`**: Backend `['test/**/*.test.ts']`, Frontend `['test/**/*.test.tsx?']`.
- The `frontend/test/components/TaskRow.test.tsx` file is created in Story 2.3. **Extend** it — do not create a new file.

### Previous Story Intelligence (from Story 2.3)

Key learnings to carry forward:
1. **`onSettled: invalidateQueries` on success = High bug** — confirmed pattern: `invalidateQueries` only in `onError`. Do not deviate.
2. **`useToggleTask` pattern** established optimistic toggle by ID (`old?.map(t => t.id === id ? {...t, isCompleted: !t.isCompleted} : t)`) — `useUpdateTask` follows identical structure replacing `title`.
3. **`PATCH /api/tasks/:id/complete` and `/uncomplete`** are separate endpoints from `PATCH /api/tasks/:id` (title update). They co-exist in the same route file — add the title-update route alongside them.
4. **`api.patch`** method was added to `frontend/src/lib/api.ts` in Story 2.3 (used by `useToggleTask`). Reuse it — do not add a duplicate.
5. **`TaskRow.tsx`** is the file to extend. Understand its full current structure before adding edit mode to avoid conflicts with the checkbox and error state logic from Story 2.3.
6. **`backend/test/helpers/db.ts`** `createTestDb()` helper is established — reuse it in all new `describe` blocks.
7. **Column aliases** are critical — ensure `user_id AS "userId"` etc. are used consistently in every `RETURNING` clause. Missing or wrong aliases will cause runtime type errors.

### Git Intelligence Summary

Recent commits (HEAD → main):
- `62ee2ae` — fix: resolve logout functionality and update UI theme across components
- `9c5f0fe` — feat: update status of Story 2.3 to 'ready-for-dev' in sprint status file
- `74c02e8` — fix: 2-2-create-task completed (code review fixes: onSettled removal, test strengthening)
- `fd5c249` — feat: 2-2-create-task completed (POST /api/tasks, optimistic create, TaskCountDisplay wired)
- `caf7047` — feat: 2-1-task-list-view-database-foundation completed (GET /api/tasks, TaskListPage, migrations)

**Current codebase state** (what exists on main as of story creation):
- `TaskListPage.tsx` renders bare `<li>` elements — Story 2.3 creates `TaskRow.tsx` and upgrades this
- `useTasks.ts` has `useTasks()` and `useCreateTask()` — Story 2.3 adds `useToggleTask()`, Story 2.4 adds `useUpdateTask()`
- `backend/src/routes/tasks.ts` has `GET /tasks` and `POST /tasks` — Story 2.3 adds `PATCH /:id/complete` and `PATCH /:id/uncomplete`, Story 2.4 adds `PATCH /:id`
- `backend/src/db/queries/tasks.ts` has `getTasks` and `createTask` — Story 2.3 adds `completeTask`/`uncompleteTask`, Story 2.4 adds `updateTaskTitle`

**Regression risk areas** (do NOT modify unnecessarily):
- `InlineTaskInput.tsx` (task creation from Story 2.2) — untouched
- `AppHeader.tsx` / `TaskCountDisplay.tsx` — already aria-live compliant, no changes needed
- `useCreateTask` and `useToggleTask` mutation patterns — do not alter
- `TaskListPage.tsx` — only change is already done in Story 2.3 (swap `<li>` for `<TaskRow />`)

### File Structure

**Backend — extend existing files:**
- `backend/src/types/tasks.ts` — add `UpdateTaskBodySchema` and `UpdateTaskBody`
- `backend/src/db/queries/tasks.ts` — add `updateTaskTitle` (extend existing file)
- `backend/src/routes/tasks.ts` — add `PATCH /api/tasks/:id` (extend existing plugin body)
- `backend/test/routes/tasks.test.ts` — add `describe('PATCH /api/tasks/:id (update title)')` block
- `backend/test/db/queries/tasks.test.ts` — add `updateTaskTitle` unit tests

**Frontend — extend existing files:**
- `frontend/src/hooks/useTasks.ts` — add `useUpdateTask` (extend existing file)
- `frontend/src/components/TaskRow.tsx` — add inline edit state and UI (extend file from Story 2.3)
- `frontend/test/components/TaskRow.test.tsx` — add edit mode tests (extend file from Story 2.3)
- `frontend/src/lib/api.ts` — verify `api.patch` exists (added in Story 2.3); add only if missing

**Do NOT touch:**
- `AppHeader.tsx` — no changes needed
- `TaskCountDisplay.tsx` — no changes needed
- `InlineTaskInput.tsx` — must not regress task creation
- `TaskListPage.tsx` — already updated in Story 2.3 (bare `<li>` → `<TaskRow />`)

### Project Context Reference

Sources used:
- [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md) — Story 2.4 acceptance criteria and epic objectives (Epic 2, Story 4)
- [_bmad-output/implementation-artifacts/2-3-mark-task-complete-un-complete-with-live-task-count.md](_bmad-output/implementation-artifacts/2-3-mark-task-complete-un-complete-with-live-task-count.md) — previous story patterns, established conventions, library rules
- [backend/src/routes/tasks.ts](backend/src/routes/tasks.ts) — current route structure (GET /tasks, POST /tasks)
- [backend/src/db/queries/tasks.ts](backend/src/db/queries/tasks.ts) — current query patterns and column aliases
- [backend/src/types/tasks.ts](backend/src/types/tasks.ts) — TaskSchema, CreateTaskBodySchema (UpdateTaskBodySchema to be added)
- [frontend/src/hooks/useTasks.ts](frontend/src/hooks/useTasks.ts) — canonical optimistic mutation blueprint (useCreateTask)
- [frontend/src/pages/TaskListPage.tsx](frontend/src/pages/TaskListPage.tsx) — current task list rendering context
- [frontend/src/types/tasks.ts](frontend/src/types/tasks.ts) — Task interface (frontend)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.
- Story 2.4 introduces `PATCH /api/tasks/:id` (title update) — the first generic PATCH route on the base task resource (distinct from Story 2.3's `/complete` and `/uncomplete` suffixed routes).
- Critical: `updated_at` has no DB trigger — `SET updated_at = NOW()` must be explicit in `updateTaskTitle`.
- Critical dependency: `TaskRow.tsx` is created in Story 2.3 — this story extends it. Confirm Story 2.3 is implemented before starting.
- `api.patch` helper was added in Story 2.3 — reused it, no duplicate created.
- Optimistic pattern follows `useCreateTask` exactly: `onMutate` → snapshot + optimistic, `onError` → rollback + invalidate, `onSuccess` → replace in cache (no invalidate).
- Edit mode UX: Enter to submit, Escape to cancel, auto-focus input, hover-revealed edit icon with group-hover Tailwind pattern.
- ✅ All 6 tasks/subtasks implemented and verified.
- ✅ Backend: 73 tests passing (0 regressions), including 8 new PATCH title route tests and 4 new DB query tests.
- ✅ Frontend: 82 tests passing (0 regressions), including 4 new useUpdateTask hook tests and 7 new TaskRow edit mode tests.
- ✅ TypeScript: frontend compiles clean; backend pre-existing TS errors in createTask test not introduced by this story.
- ✅ All ACs satisfied: AC1 (edit icon + Enter on row), AC2 (optimistic submit), AC3 (Escape cancels), AC4 (failure rollback + retry), AC5 (empty title validation).

### File List

- `backend/src/types/tasks.ts` — added `UpdateTaskBodySchema` and `UpdateTaskBody`
- `backend/src/db/queries/tasks.ts` — added `updateTaskTitle` query function
- `backend/src/routes/tasks.ts` — added `PATCH /api/tasks/:id` route for title update
- `backend/test/routes/tasks.test.ts` — added `describe('PATCH /api/tasks/:id (update title)')` block (8 tests)
- `backend/test/db/queries/tasks.test.ts` — added `describe('updateTaskTitle query')` block (4 tests)
- `frontend/src/hooks/useTasks.ts` — added `useUpdateTask` mutation hook
- `frontend/src/components/TaskRow.tsx` — extended with inline edit mode (isEditing state, edit icon, input, keyboard handlers, error/retry)
- `frontend/test/hooks/useTasks.test.ts` — added `describe('useUpdateTask')` block (4 tests)
- `frontend/test/components/TaskRow.test.tsx` — added `describe('TaskRow — inline edit mode (Story 2.4)')` block (7 tests)

### Change Log

- feat(2-4): implement edit task title — PATCH /api/tasks/:id endpoint, updateTaskTitle DB query, useUpdateTask mutation hook, inline edit mode in TaskRow (Date: 2026-02-25)
