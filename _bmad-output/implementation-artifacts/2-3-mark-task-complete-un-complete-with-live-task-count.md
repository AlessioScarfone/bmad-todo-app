# Story 2.3: Mark Task Complete & Un-complete with Live Task Count

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to mark a task as complete (or un-complete it) with a single click,
so that my task count reflects my progress in real time.

## Acceptance Criteria

**AC1 — Optimistic complete toggle:**
- **Given** I have a task in my list
- **When** I click the completion checkbox
- **Then** the task is visually marked as complete immediately (optimistic UI — no spinner)
- **And** `PATCH /api/tasks/:id/complete` is called server-side

**AC2 — Live task count update:**
- **Given** a task is marked complete
- **When** the completion is confirmed by the server
- **Then** the task count in the header updates within 500ms (e.g., `2/5` → `3/5`)
- **And** the count is derived client-side: `completed = tasks.filter(t => t.is_completed).length; total = tasks.length` — no extra API call

**AC3 — Un-complete toggle:**
- **Given** I click the completion checkbox on an already-completed task
- **When** `PATCH /api/tasks/:id/uncomplete` is called
- **Then** the task reverts to incomplete state (optimistic UI)
- **And** the task count decreases accordingly (e.g., `3/5` → `2/5`)

**AC4 — Failure recovery:**
- **Given** the complete/uncomplete API call fails
- **When** the server returns an error
- **Then** the optimistic state is rolled back
- **And** an inline error with retry is shown on the affected task row

## Tasks / Subtasks

- [ ] **Task 1: Backend — complete/uncomplete query functions** (AC: AC1, AC3)
  - [ ] Add `completeTask(sql, taskId, userId)` in `backend/src/db/queries/tasks.ts`
  - [ ] `UPDATE tasks SET is_completed = true, completed_at = NOW(), updated_at = NOW() WHERE id = $id AND user_id = $userId RETURNING ...`
  - [ ] Add `uncompleteTask(sql, taskId, userId)` in same file
  - [ ] `UPDATE tasks SET is_completed = false, completed_at = NULL, updated_at = NOW() WHERE id = $id AND user_id = $userId RETURNING ...`
  - [ ] Both functions must return `Task | undefined` — check if row was found (null = 404 or 403)
  - [ ] Use the same column aliases as `getTasks` (`user_id AS "userId"`, `is_completed AS "isCompleted"`, `completed_at AS "completedAt"` etc.)

- [ ] **Task 2: Backend — PATCH route endpoints** (AC: AC1, AC3)
  - [ ] Add `PATCH /api/tasks/:id/complete` in `backend/src/routes/tasks.ts` with `preHandler: [fastify.authenticate]`
  - [ ] Add `PATCH /api/tasks/:id/uncomplete` in `backend/src/routes/tasks.ts` with `preHandler: [fastify.authenticate]`
  - [ ] Both routes: parse `:id` as integer from params (TypeBox `Type.Number()` on params schema)
  - [ ] Ownership enforced: call query with `userId` from JWT — if result is undefined → return 404 `{ statusCode: 404, error: "NOT_FOUND", message: "Task not found" }`
  - [ ] On success: return the updated task object directly (no wrapper) with HTTP `200`

- [ ] **Task 3: Frontend — `useToggleTask` mutation hook** (AC: AC1, AC2, AC3, AC4)
  - [ ] Add `useToggleTask()` in `frontend/src/hooks/useTasks.ts`
  - [ ] `mutationFn`: if `task.isCompleted` → call `api.patch('/tasks/:id/uncomplete')`, else `api.patch('/tasks/:id/complete')`
  - [ ] `onMutate`: cancel `['tasks']` queries, snapshot previous, set optimistic `isCompleted = !current` for affected task id
  - [ ] `onError`: rollback to previous snapshot (do NOT invalidate unnecessarily — avoids extra GET)
  - [ ] `onSuccess`: replace task in cache with server-confirmed task to reconcile (same pattern as `useCreateTask`)
  - [ ] `onError` (also): `queryClient.invalidateQueries({ queryKey: ['tasks'] })` to re-sync after failure

- [ ] **Task 4: Frontend — `TaskRow` component** (AC: AC1, AC2, AC3, AC4)
  - [ ] Create `frontend/src/components/TaskRow.tsx`
  - [ ] Renders a row with: checkbox, task title (strikethrough if complete), inline error area
  - [ ] Checkbox: native `<input type="checkbox">` (or Radix UI Checkbox primitive) with `aria-label="Mark [task title] as done"` / `aria-label="Mark [task title] as not done"` toggled by current state
  - [ ] Space key on focused row toggles completion (keyboard-native UX requirement)
  - [ ] Completed task title shows visual distinction: line-through + muted text color (use Tailwind `line-through text-gray-400`)
  - [ ] Show inline error on the affected row when mutation fails (not a modal/toast)
  - [ ] Retry button re-fires the toggle for the same task
  - [ ] Dismiss clears the error and rolls back (optimistic rollback already applied by `onError`)

- [ ] **Task 5: Wire `TaskRow` into `TaskListPage`** (AC: AC1, AC2)
  - [ ] Replace the bare `<li>` in `TaskListPage.tsx` with `<TaskRow task={task} />` per item
  - [ ] Confirm `completedTasks` and `totalTasks` still derive from cache (`tasks.filter(t => t.isCompleted).length`) — no changes needed to `AppHeader` or `TaskCountDisplay`
  - [ ] Task count display already has `aria-live="polite"` — no changes needed there
  - [ ] Confirm `TaskCountDisplay` updates automatically because it reads from the same TanStack Query cache that `useToggleTask` mutates

- [ ] **Task 6: Tests** (AC: AC1, AC2, AC3, AC4)
  - [ ] **Backend**: Extend `backend/test/routes/tasks.test.ts` with a new `describe('PATCH /api/tasks/:id/complete')` block and `describe('PATCH /api/tasks/:id/uncomplete')` block
    - [ ] 401 when unauthenticated
    - [ ] 404 when task not found or owned by another user
    - [ ] 200 + correct `isCompleted: true` / `isCompleted: false` and `completedAt` set/null
    - [ ] `updated_at` is updated (assert it changed from creation time)
  - [ ] **Backend DB queries**: Extend `backend/test/db/queries/tasks.test.ts` with `completeTask` / `uncompleteTask` unit tests (Testcontainers, real DB)
  - [ ] **Frontend**: Create `frontend/test/components/TaskRow.test.tsx`
    - [ ] Renders task title; checkbox unchecked when `isCompleted = false`
    - [ ] Checkbox checked and title has `line-through` class when `isCompleted = true`
    - [ ] Clicking checkbox fires the toggle mutation (mock `useTasks.useToggleTask`)
    - [ ] Space key on the row triggers toggle
    - [ ] Shows inline error state and retry button when mutation fails
    - [ ] Dismiss clears error

## Dev Notes

### Architecture Compliance

- **Only `db/queries/tasks.ts` may issue SQL** — route handlers call query functions, never `fastify.sql` directly.
- **`fp()` wrapping and TypeBox type provider** — The route file already calls `fastify.withTypeProvider<TypeBoxTypeProvider>()` and wraps with `fp()`. Add new routes to the existing `taskRoutes` plugin body, do not create a new file.
- **Route params schema** — Use `Type.Object({ id: Type.Number() })` for the params. With `@fastify/type-provider-typebox`, Fastify will coerce the string `:id` to a number automatically when the schema type is `Number`.
- **Auth guard** — All task mutation routes must include `preHandler: [fastify.authenticate]`. `req.user` is typed by the JWT plugin; cast as `{ id: number }`.
- **Error response shape** — Always `{ statusCode, error, message }`. For not-found: `{ statusCode: 404, error: "NOT_FOUND", message: "Task not found" }`. For auth error: delegated to the auth plugin (returns 401 automatically).

### Database Rules (Critical)

- **`updated_at` has no DB trigger** — Every `UPDATE tasks` must include `SET updated_at = NOW()` explicitly. Missing this is a bug.
- **`completed_at` semantics**: On complete → `completed_at = NOW()`; on uncomplete → `completed_at = NULL`.
- **Ownership isolation** — Both queries must use `WHERE id = ${taskId} AND user_id = ${userId}`. If zero rows returned by `RETURNING`, the task either doesn't exist or belongs to another user — return `undefined` and let the route respond with 404.
- **Column aliases** — Stay consistent with `getTasks`:
  ```sql
  RETURNING
    id,
    user_id AS "userId",
    title,
    is_completed AS "isCompleted",
    completed_at AS "completedAt",
    deadline,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  ```

### API Endpoint Contract

```
PATCH /api/tasks/:id/complete
  Request:  no body required
  Response: 200 { id, userId, title, isCompleted: true, completedAt: "<ISO string>", deadline, createdAt, updatedAt }
  Errors:   401 (no auth), 404 (not found / not owner)

PATCH /api/tasks/:id/uncomplete
  Request:  no body required
  Response: 200 { id, userId, title, isCompleted: false, completedAt: null, deadline, createdAt, updatedAt }
  Errors:   401 (no auth), 404 (not found / not owner)
```

No request body is needed — the action is encoded in the route suffix (`/complete` vs `/uncomplete`). Do not create a generic `PATCH /api/tasks/:id` with a body for this story (that's Story 2.4 for title editing).

### Frontend Optimistic Pattern (Established in Story 2.2)

Follow the exact same pattern used in `useCreateTask`:
- `onMutate` → cancel queries, snapshot, apply optimistic update, return `{ previous }`
- `onError` → rollback from snapshot, then `invalidateQueries` to re-sync
- `onSuccess` → replace task in cache with server-confirmed task using `map` — do **not** call `invalidateQueries` on success (avoids extra GET that would violate the <500ms count-update requirement)

The optimistic update for toggle: find the task by ID in the cache and flip `isCompleted`. The task count (`completedTasks` in `TaskListPage`) updates reactively because it is computed inline from the same `['tasks']` cache slice.

### Library / Framework Requirements

- **Backend**: No new dependencies. Use existing `@sinclair/typebox`, `@fastify/type-provider-typebox`, `postgres`.
- **Frontend**: No new dependencies. Use existing TanStack Query v5 mutation APIs, Tailwind CSS, Radix UI if needed for accessible checkbox. `clsx` + `tailwind-merge` via `cn()` helper for conditional classes.
- **Checkbox accessibility**: Prefer native `<input type="checkbox">` for full browser/keyboard compatibility. If Radix UI `Checkbox` primitive is used, ensure `aria-label` is correctly forwarded.

### File Structure

Backend files to create/extend:
- `backend/src/db/queries/tasks.ts` — add `completeTask`, `uncompleteTask` (extend existing file)
- `backend/src/routes/tasks.ts` — add two new PATCH routes (extend existing plugin)
- `backend/test/routes/tasks.test.ts` — add two new `describe` blocks (extend existing file)
- `backend/test/db/queries/tasks.test.ts` — add `completeTask`/`uncompleteTask` tests (extend existing file)

Frontend files to create/extend:
- `frontend/src/hooks/useTasks.ts` — add `useToggleTask` (extend existing file)
- `frontend/src/components/TaskRow.tsx` — **create new**
- `frontend/src/pages/TaskListPage.tsx` — swap bare `<li>` for `<TaskRow />`
- `frontend/test/components/TaskRow.test.tsx` — **create new**

**Do NOT touch:**
- `AppHeader.tsx` — already passes `completedTasks`/`totalTasks` correctly
- `TaskCountDisplay.tsx` — already has `aria-live="polite"` and correct display logic
- `InlineTaskInput.tsx` — must not regress task creation

### UX / Visual Requirements

From UX design specification:
- **Completion visual**: completed task title gets `line-through` + muted text (`text-gray-400`). Checkbox checked.
- **Keyboard**: Space key on a focused task row toggles its completion (keyboard-native path). Tab navigates between rows.
- **ARIA checkbox label**: `aria-label="Mark [task title] as done"` when incomplete; `aria-label="Mark [task title] as not done"` (or `"Unmark [task title] as done"`) when complete.
- **Inline error on row**: When mutation fails, show error text inline below/beside the task title on the affected row. No modal, no toast that auto-dismisses. Include a Retry button.
- **Pixel-art aesthetic**: Keep the existing `border-2 border-black bg-white font-pixel text-[8px]` panel style. Do not introduce new color tokens.
- **`prefers-reduced-motion`**: If any transition is added for the checkbox state change, wrap in `motion-safe:` Tailwind variant.

### Testing Requirements

- **Backend integration tests**: Use Testcontainers (real `postgres:16-alpine`). One container per `describe` block (per `beforeAll`/`afterAll`). Never mock the database.
- **Frontend unit tests**: Mock `lib/api.ts` at module level. Test checkbox interaction, optimistic toggle, error states, and retry flow.
- **`TESTCONTAINERS_RYUK_DISABLED=true`** and the Docker socket env var are pre-set in `backend/package.json` scripts — do not strip them.
- **Vitest `include`**: Backend `['test/**/*.test.ts']`, frontend `['test/**/*.test.tsx?']`.

### Previous Story Intelligence (from Story 2.2)

Key learnings to carry forward:
1. **Do NOT add `onSettled: invalidateQueries`** on success — this fires an extra GET that violates the sub-500ms count-update requirement (was a High severity bug caught in 2.2 code review).
2. Move `invalidateQueries` to `onError` only, to re-sync cache after a failure rollback.
3. **`useCreateTask` pattern** is the canonical template for optimistic mutations in this codebase — implement `useToggleTask` the same way.
4. The `['tasks']` query key is used throughout; `useToggleTask` must update this cache slice consistently.
5. Frontend vitest + `@testing-library` infrastructure is now set up (`frontend/test/setup.ts`, `frontend/vitest.config.ts`) — use it directly without re-configuring.
6. Backend test helper `createTestDb()` is in `backend/test/helpers/db.ts` — do not redefine or duplicate it.
7. Task `id` fields: the backend returns numeric IDs; temp/optimistic IDs use `-Date.now()` (negative) as a sentinel — the toggle mutation can safely match by `task.id` because only server-confirmed tasks will be toggled.

### Git Intelligence Summary

Recent commits (HEAD → main):
- `74c02e8` — fix: 2-2-create-task completed (code review fixes: onSettled removal, test strengthening)
- `fd5c249` — feat: 2-2-create-task completed (POST /api/tasks, optimistic create, TaskCountDisplay wired)
- `caf7047` — feat: 2-1-task-list-view-database-foundation completed (GET /api/tasks, TaskListPage, migrations)

Current state of the task list: `TaskListPage.tsx` renders tasks as bare `<li>` elements with only `task.title`. No checkbox, no completion toggle, no `TaskRow` component exists. Story 2.3 introduces the `TaskRow` component to upgrade this rendering.

Regression risk areas:
- `InlineTaskInput.tsx` (task creation) — do not modify
- Auth/logout wiring in `AppHeader.tsx` — do not modify
- `TaskListPage.tsx` import list — only add `TaskRow`, keep all existing imports

### Project Context Reference

Sources used:
- [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md) — Story 2.3 acceptance criteria and epic objectives
- [_bmad-output/project-context.md](_bmad-output/project-context.md) — full technology stack, rules, patterns, anti-patterns
- [_bmad-output/implementation-artifacts/2-2-create-task.md](_bmad-output/implementation-artifacts/2-2-create-task.md) — previous story intelligence and established mutation patterns
- [backend/src/routes/tasks.ts](backend/src/routes/tasks.ts) — current route structure
- [backend/src/db/queries/tasks.ts](backend/src/db/queries/tasks.ts) — current query patterns and column aliases
- [frontend/src/hooks/useTasks.ts](frontend/src/hooks/useTasks.ts) — optimistic mutation blueprint
- [frontend/src/pages/TaskListPage.tsx](frontend/src/pages/TaskListPage.tsx) — current task list rendering (bare `<li>`)
- [frontend/src/components/TaskCountDisplay.tsx](frontend/src/components/TaskCountDisplay.tsx) — already aria-live compliant

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.
- Story 2.3 targets two new PATCH endpoints: `/api/tasks/:id/complete` and `/api/tasks/:id/uncomplete`. No request body; ownership enforced server-side via `WHERE user_id = $userId`.
- Critical DB rule confirmed: `updated_at` has no trigger — must be set explicitly in every UPDATE query.
- Frontend needs a new `TaskRow.tsx` component (does not exist yet); `TaskListPage.tsx` currently renders bare `<li>` elements with no checkbox.
- Optimistic mutation pattern follows `useCreateTask` blueprint exactly. `onSettled` invalidation is NOT used on success (High bug from 2.2 code review).
- `TaskCountDisplay` is already `aria-live="polite"` and derives count from the same `['tasks']` cache — no changes needed to it or `AppHeader`.

### File List

### Change Log

