# Story 3.1: Labels — Attach and Remove

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to attach free-form labels to a task and remove them at any time,
so that I can visually categorise my work (e.g., "Client", "Backend", "Admin").

## Acceptance Criteria

**AC1 — Attach label (optimistic, create-or-reuse):**
- **Given** I have a task in my list
- **When** I type a label name and confirm (press Enter or click add) via the inline task row
- **Then** the label appears visually on the task card immediately (optimistic UI — no spinner)
- **And** `POST /api/tasks/:id/labels` is called with `{ "name": "Backend" }`
- **And** the server creates the label in the `labels` table if it doesn't already exist for this user (`ON CONFLICT (user_id, name) DO NOTHING`), then inserts a row in `task_labels`

**AC2 — Label autocomplete (no duplicates per task):**
- **Given** I focus the label input on a task row
- **When** I start typing a label name
- **Then** existing label names for this user are suggested for quick selection (fetched from `GET /api/labels`)
- **And** labels already attached to this task are not offered as suggestions (no duplicates per task)

**AC3 — Remove label from a task:**
- **Given** a task has a label attached
- **When** I click the remove icon on the label pill
- **Then** `DELETE /api/tasks/:id/labels/:labelId` is called
- **And** the label pill disappears from the task card immediately (optimistic)
- **And** the `task_labels` join row is deleted on the server
- **And** the label itself remains in the `labels` table (reusable on future tasks)

**AC4 — Delete label globally (label registry cleanup):**
- **Given** I have labels available
- **When** `DELETE /api/labels/:id` is called (e.g., from a future label management UI or directly)
- **Then** the label is removed from the `labels` table
- **And** it is automatically removed from all tasks it was attached to (CASCADE via `task_labels.label_id → labels.id ON DELETE CASCADE`)
- **And** only labels belonging to the authenticated user can be deleted (403 otherwise)

**AC5 — Task list includes labels:**
- **Given** I am authenticated and the task list loads
- **When** `GET /api/tasks` returns
- **Then** each task object includes a `labels` array: `[{ "id": 1, "name": "Backend" }]` (empty array `[]` for tasks with no labels)
- **And** no extra API calls are needed to display labels — they are part of the task response

**AC6 — Failure recovery (optimistic rollback):**
- **Given** the label attach or remove API call fails
- **When** the server returns an error or times out
- **Then** the optimistic UI state is rolled back (label pip removed or restored respectively)
- **And** an inline error with a retry affordance is shown on the affected task row

**AC7 — 003_enrichment.sql migration runs on startup:**
- **Given** the API starts with a clean database
- **When** `migrate.ts` runs
- **Then** `003_enrichment.sql` is applied, creating the `labels`, `task_labels`, and `subtasks` tables
- **And** these tables are recorded in the `_migrations` table
- **And** the migration is idempotent (`CREATE TABLE IF NOT EXISTS`) and does not break a restart

## Tasks / Subtasks

- [x] **Task 1: Database migration — `003_enrichment.sql`** (AC: AC7)
  - [x] Create `backend/src/db/migrations/003_enrichment.sql`
  - [x] Include `CREATE TABLE IF NOT EXISTS labels (...)` with columns: `id SERIAL PRIMARY KEY`, `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `name TEXT NOT NULL`, `UNIQUE(user_id, name)`
  - [x] Include `CREATE TABLE IF NOT EXISTS task_labels (task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE, PRIMARY KEY (task_id, label_id))`
  - [x] Include `CREATE TABLE IF NOT EXISTS subtasks (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, title TEXT NOT NULL, is_completed BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`
  - [x] Note: All three tables are created in one migration because Epic 3 is a single enrichment step; subtasks are scaffolded here even though full UI is in Story 3.3
  - [x] Verify migration runs cleanly on restart (idempotent via `IF NOT EXISTS`)

- [x] **Task 2: Backend — update `getTasks` to include labels** (AC: AC5)
  - [x] Update `getTasks` in `backend/src/db/queries/tasks.ts` to JOIN with `labels` via `task_labels`
  - [x] Use a LEFT JOIN + `json_agg` / `COALESCE` approach to aggregate labels into an array per task:
    ```sql
    SELECT
      t.id,
      t.user_id AS "userId",
      t.title,
      t.is_completed AS "isCompleted",
      t.completed_at AS "completedAt",
      t.deadline,
      t.created_at AS "createdAt",
      t.updated_at AS "updatedAt",
      COALESCE(
        json_agg(json_build_object('id', l.id, 'name', l.name))
          FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
      ) AS labels
    FROM tasks t
    LEFT JOIN task_labels tl ON tl.task_id = t.id
    LEFT JOIN labels l ON l.id = tl.label_id
    WHERE t.user_id = ${userId}
    GROUP BY t.id
    ORDER BY t.created_at DESC
    ```
  - [x] Update `Task` TypeBox schema in `backend/src/types/tasks.ts` to add `labels: Type.Array(Type.Object({ id: Type.Integer(), name: Type.String() }))` with default `[]`
  - [x] Update `Task` interface in `frontend/src/types/tasks.ts` to add `labels: { id: number; name: string }[]`
  - [x] **Note:** `createTask`, `completeTask`, `uncompleteTask`, `updateTaskTitle`, `deleteTask` return values do NOT need labels included — they return the task row only; the frontend cache handles merging

- [x] **Task 3: Backend — `labels.ts` query functions** (AC: AC1, AC3, AC4)
  - [x] Create `backend/src/db/queries/labels.ts`
  - [x] Export `getLabelsByUser(sql, userId)` → `Promise<Label[]>` — `SELECT id, user_id AS "userId", name FROM labels WHERE user_id = ${userId} ORDER BY name ASC`
  - [x] Export `attachLabelToTask(sql, taskId, userId, labelName)` → `Promise<{ label: Label; created: boolean }>`:
    - First: `INSERT INTO labels (user_id, name) VALUES (${userId}, ${labelName}) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, user_id AS "userId", name`
    - Then: `INSERT INTO task_labels (task_id, label_id) VALUES (${taskId}, ${labelId}) ON CONFLICT DO NOTHING`
    - Returns the label object. Throws if task does not belong to userId (verify ownership before insert).
  - [x] Export `removeLabelFromTask(sql, taskId, labelId, userId)` → `Promise<boolean>` — delete from `task_labels` WHERE task_id matches taskId AND the task belongs to userId (JOIN check). Returns `true` if deleted, `false` if not found.
  - [x] Export `deleteLabelByUser(sql, labelId, userId)` → `Promise<boolean>` — `DELETE FROM labels WHERE id = ${labelId} AND user_id = ${userId}`. Returns `true` if deleted.
  - [x] Export `Label` type: `{ id: number; userId: number; name: string }`

- [x] **Task 4: Backend — `labels.ts` route plugin** (AC: AC1, AC3, AC4)
  - [x] Create `backend/src/routes/labels.ts` following the same `fp()` wrapping pattern as `tasks.ts`
  - [x] Register four routes, all with `preHandler: [fastify.authenticate]`:
    - `GET /api/labels` → call `getLabelsByUser(fastify.sql, userId)` → `200` with label array
    - `POST /api/tasks/:id/labels` body: `{ name: Type.String({ minLength: 1, maxLength: 64 }) }` → call `attachLabelToTask` → `201` with `{ id, name }` (or `200` if already existed — use `RETURNING` to distinguish)
    - `DELETE /api/tasks/:id/labels/:labelId` → call `removeLabelFromTask` → `204` on success, `404` if not found
    - `DELETE /api/labels/:id` → call `deleteLabelByUser` → `204` on success, `403` if label belongs to another user (check ownership explicitly — return 404 if not found at all, 403 if found but owned differently)
  - [x] Register `labelRoutes` plugin in `backend/src/server.ts` (same pattern as `taskRoutes`): `fastify.register(labelRoutes, { prefix: '/api' })`
  - [x] **No label route should log request bodies** (consistent with auth routes security rule)

- [x] **Task 5: Frontend — `useLabels` hook** (AC: AC2, AC4)
  - [x] Create `frontend/src/hooks/useLabels.ts`
  - [x] Export `useLabels()` — TanStack Query `useQuery({ queryKey: ['labels'], queryFn: () => api.get<Label[]>('/labels') })` — provides user's full label list for autocomplete
  - [x] Export `useDeleteLabel()` — TanStack Query `useMutation` for `api.delete<void>('/labels/${id}')`:
    - `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['labels'] })` and `queryClient.invalidateQueries({ queryKey: ['tasks'] })` (tasks may have displayed this label)

- [x] **Task 6: Frontend — label mutation hooks in `useTasks.ts`** (AC: AC1, AC3, AC6)
  - [x] Add `useAttachLabel()` to `frontend/src/hooks/useTasks.ts`:
    - `mutationFn`: `({ taskId, name }: { taskId: number; name: string }) => api.post<Label>('/tasks/${taskId}/labels', { name })`
    - `onMutate`: cancel `['tasks']` queries, snapshot previous, optimistically add `{ id: -Date.now(), name }` to the target task's `labels` array, return `{ previous, taskId }`
    - `onError`: rollback to `context.previous`; invalidate `['tasks']`
    - `onSuccess`: `queryClient.invalidateQueries({ queryKey: ['tasks'] })` and `queryClient.invalidateQueries({ queryKey: ['labels'] })` to refresh label list with real IDs
  - [x] Add `useRemoveLabel()` to `frontend/src/hooks/useTasks.ts`:
    - `mutationFn`: `({ taskId, labelId }: { taskId: number; labelId: number }) => api.delete<void>('/tasks/${taskId}/labels/${labelId}')`
    - `onMutate`: cancel `['tasks']` queries, snapshot previous, optimistically remove label from task's `labels` array, return `{ previous }`
    - `onError`: rollback to `context.previous`; invalidate `['tasks']`
    - `onSuccess`: no extra invalidation (optimistic state is already correct)

- [x] **Task 7: Frontend — Extend `TaskRow.tsx` with label display and inline label editing** (AC: AC1, AC2, AC3, AC6)
  - [x] `TaskRow.tsx` was created in Story 2.3 and extended in Stories 2.4 and 2.5 — **extend it, do NOT re-create**
  - [x] Import `useAttachLabel`, `useRemoveLabel` from `useTasks.ts` and `useLabels` from `useLabels.ts`
  - [x] **Label pills display**: Below the task title row, render existing labels as pill chips (e.g., `<span className="...">{label.name} <button aria-label="Remove label {label.name}">✕</button></span>`)
    - Remove button calls `removeLabel.mutate({ taskId: task.id, labelId: label.id })`
    - Each pill should have `aria-label="Label: {label.name}"`
  - [x] **Inline label input**: Add a compact `+` button or input affordance to the task row to attach a new label:
    - Toggling it opens a small input (local `useState<string>` for the label name value)
    - As the user types, filter `allLabels` (from `useLabels()`) minus already-attached labels → show a datalist or dropdown list of suggestions
    - On Enter or confirm: call `attachLabel.mutate({ taskId: task.id, name: inputValue.trim() })`; clear input; close affordance
    - On Escape: close the input without action
  - [x] **Do NOT break Story 2.3/2.4/2.5 features**: checkbox toggle, Space-key completion, inline title edit, two-step delete — all must remain intact
  - [x] **ARIA**: `role="alert"` on label attach/remove error inline messages; `aria-label="Add label"` on the add-label trigger; datalist suggestions should be accessible

- [x] **Task 8: Tests** (AC: AC1–AC7)
  - [x] **Backend migration test**: Add `describe('003_enrichment.sql migration')` to `backend/test/db/migrate.test.ts`:
    - `labels`, `task_labels`, and `subtasks` tables exist after migration
    - `UNIQUE(user_id, name)` constraint on `labels` is enforced (insert duplicate → error)
    - `ON DELETE CASCADE` from `labels → task_labels` works (delete label → task_labels row gone)
  - [x] **Backend query tests — create `backend/test/db/queries/labels.test.ts`** (Testcontainers):
    - `getLabelsByUser`: returns empty array for new user; returns labels sorted A→Z; only returns labels for requesting user
    - `attachLabelToTask`: creates new label and task_labels row; returns existing label if name already exists (no duplicate); idempotent on second attach of same label to same task (ON CONFLICT DO NOTHING)
    - `removeLabelFromTask`: removes task_labels row, label remains in labels table; returns `false` for non-existent link; respects ownership (cannot remove label from another user's task)
    - `deleteLabelByUser`: removes label and cascades to task_labels; returns `false` for wrong userId
  - [x] **Backend route tests — create `backend/test/routes/labels.test.ts`**:
    - `GET /api/labels`: 401 unauthenticated; 200 returns label array (empty for new user; populated after attach)
    - `POST /api/tasks/:id/labels`: 401 unauthenticated; 201 creates and attaches label; 200/201 on re-attaching same name (idempotent); 404 on non-existent task
    - `DELETE /api/tasks/:id/labels/:labelId`: 401 unauthenticated; 204 on success; 404 if link doesn't exist
    - `DELETE /api/labels/:id`: 401 unauthenticated; 204 on success; 403 if label belongs to another user; verify CASCADE removes task_labels row
  - [x] **Backend — update `backend/test/routes/tasks.test.ts`**:
    - `GET /api/tasks` response now includes `labels: []` per task (no regression)
    - Add one test verifying `labels` array includes attached labels after attach
  - [x] **Frontend hook tests — add to `frontend/test/hooks/useTasks.test.ts`**:
    - `useAttachLabel`: `onMutate` adds optimistic label with negative id to task's labels; `onError` restores previous cache; `onSuccess` invalidates `['tasks']` and `['labels']`
    - `useRemoveLabel`: `onMutate` removes label from task's labels array; `onError` restores previous cache
  - [x] **Frontend hook tests — create `frontend/test/hooks/useLabels.test.ts`**:
    - `useLabels`: fetches from `/api/labels`, returns label array
    - `useDeleteLabel`: invalidates `['labels']` and `['tasks']` on success
  - [x] **Frontend component tests — add to `frontend/test/components/TaskRow.test.tsx`**:
    - `describe('Story 3.1 — label management')`:
      - Label pills are rendered for tasks that have labels
      - Clicking a label pill's remove button calls `useRemoveLabel` with correct taskId and labelId
      - The +label affordance is present; clicking it opens label input
      - Typing in label input and pressing Enter calls `useAttachLabel` with correct taskId and label name
      - Pressing Escape closes label input without mutation
      - Existing Stories 2.3, 2.4, 2.5 tests still pass (no regression)

    ### Review Follow-ups (AI)

    - [x] [AI-Review][HIGH] Add explicit retry affordance for label attach/remove failures in `TaskRow` (AC6 requires inline error + retry affordance, currently label errors render text only). [frontend/src/components/TaskRow.tsx]
    - [x] [AI-Review][HIGH] Add missing route test for `DELETE /api/labels/:id` not-found path (`404`) while task item is marked complete. [backend/test/routes/labels.test.ts]
    - [x] [AI-Review][MEDIUM] Align label upsert strategy with story requirement (`ON CONFLICT ... DO NOTHING`) or update story/task text to match implemented `DO UPDATE` behavior. [backend/src/db/queries/labels.ts]
    - [x] [AI-Review][MEDIUM] Add migration assertion that `003_enrichment.sql` is recorded in `_migrations` to fully cover AC7 claims. [backend/test/db/migrate.test.ts]
    - [x] [AI-Review][MEDIUM] Reconcile Dev Agent File List vs git working tree evidence by executing a concrete fix pass that produced verifiable source/test changes in this run.

## Dev Notes

### This is the FIRST story in Epic 3 — Database Migration Required

`003_enrichment.sql` **must be created and applied before any Epic 3 feature can run**. The migration creates:
- `labels` table (used by this story)
- `task_labels` table (used by this story)
- `subtasks` table (scaffolded here, used fully in Story 3.3)

This mirrors the phased migration pattern from Epic 1/2 (documented in Story 1.1 AC, `QA-2` note):

| Migration | Content |
|---|---|
| `001_init.sql` | `users` table |
| `002_tasks.sql` | `tasks` table |
| `003_enrichment.sql` | `labels`, `task_labels`, `subtasks` tables |

### Existing Files to Touch

| File | Action |
|---|---|
| `backend/src/db/queries/tasks.ts` | Update `getTasks` — add labels JOIN + json_agg |
| `backend/src/types/tasks.ts` | Add `labels` field to `TaskSchema` TypeBox schema |
| `frontend/src/types/tasks.ts` | Add `labels: { id: number; name: string }[]` to `Task` interface |
| `backend/src/server.ts` | Register `labelRoutes` plugin |
| `frontend/src/components/TaskRow.tsx` | Extend with label pills + inline label input |
| `frontend/src/hooks/useTasks.ts` | Add `useAttachLabel`, `useRemoveLabel` mutations |

### New Files to Create

| File | Purpose |
|---|---|
| `backend/src/db/migrations/003_enrichment.sql` | Creates labels, task_labels, subtasks tables |
| `backend/src/db/queries/labels.ts` | Query functions for label operations |
| `backend/src/routes/labels.ts` | Fastify plugin for label API endpoints |
| `frontend/src/hooks/useLabels.ts` | useLabels + useDeleteLabel hooks |
| `backend/test/db/queries/labels.test.ts` | Vitest + Testcontainers label query tests |
| `backend/test/routes/labels.test.ts` | Fastify route integration tests for labels |
| `frontend/test/hooks/useLabels.test.ts` | React Query hook unit tests |

### API Endpoint Contracts

```
# Labels registry
GET    /api/labels
  Response 200: [{ "id": 1, "name": "Backend", "userId": 42 }, ...]
  Response 401: (no cookie / invalid JWT)

DELETE /api/labels/:id
  Response 204: (empty body — label deleted, CASCADE removes task_labels)
  Response 403: { "statusCode": 403, "error": "FORBIDDEN", "message": "Label not found or not owned by user" }
  Response 401: (no cookie / invalid JWT)

# Label-task attachment
POST   /api/tasks/:id/labels
  Body: { "name": "Backend" }
  Response 201: { "id": 5, "name": "Backend" }
  Response 400: name missing / empty
  Response 401: (no cookie / invalid JWT)
  Response 404: { "statusCode": 404, "error": "NOT_FOUND", "message": "Task not found" }

DELETE /api/tasks/:id/labels/:labelId
  Response 204: (empty body — link removed, label stays in labels table)
  Response 404: { "statusCode": 404, "error": "NOT_FOUND", "message": "Label not attached to task" }
  Response 401: (no cookie / invalid JWT)
```

### Task Response Shape Change

`GET /api/tasks` **now includes labels per task**. The `Task` object returned by all task endpoints that return a task (or task list) gains a `labels` field:

```json
{
  "id": 1,
  "userId": 42,
  "title": "Write tests",
  "isCompleted": false,
  "completedAt": null,
  "deadline": null,
  "createdAt": "2026-02-25T10:00:00Z",
  "updatedAt": "2026-02-25T10:00:00Z",
  "labels": [
    { "id": 3, "name": "Backend" },
    { "id": 7, "name": "Admin" }
  ]
}
```

**Important:** `createTask`, `completeTask`, `uncompleteTask`, `updateTaskTitle`, and `deleteTask` return values do **NOT** need to include `labels` — their responses are used only to update the single task in cache via optimistic UI, and the `['tasks']` query will be invalidated on settle to sync. Do NOT add the labels JOIN to those queries.

### getTasks SQL Pattern (postgres tagged template)

```typescript
export const getTasks = (sql: Sql, userId: number): Promise<Task[]> =>
  sql<Task[]>`
    SELECT
      t.id,
      t.user_id       AS "userId",
      t.title,
      t.is_completed  AS "isCompleted",
      t.completed_at  AS "completedAt",
      t.deadline,
      t.created_at    AS "createdAt",
      t.updated_at    AS "updatedAt",
      COALESCE(
        json_agg(
          json_build_object('id', l.id, 'name', l.name)
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
      ) AS labels
    FROM tasks t
    LEFT JOIN task_labels tl ON tl.task_id = t.id
    LEFT JOIN labels l      ON l.id = tl.label_id
    WHERE t.user_id = ${userId}
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `
```

> **Note:** The `postgres` package (`Porsager`) returns JSONB columns as already-parsed JS objects. The `json_agg(...)` result will be a JS array of objects — no `JSON.parse()` needed.

### attachLabelToTask Query Pattern

```typescript
export const attachLabelToTask = async (
  sql: Sql,
  taskId: number,
  userId: number,
  labelName: string,
): Promise<Label> => {
  // 1. Verify task ownership (403 if not owned)
  const [task] = await sql`SELECT id FROM tasks WHERE id = ${taskId} AND user_id = ${userId}`
  if (!task) throw new Error('TASK_NOT_FOUND')

  // 2. Upsert label (create or retrieve existing)
  const [label] = await sql<Label[]>`
    INSERT INTO labels (user_id, name)
    VALUES (${userId}, ${labelName})
    ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, user_id AS "userId", name
  `

  // 3. Attach to task (ignore if already attached)
  await sql`
    INSERT INTO task_labels (task_id, label_id)
    VALUES (${taskId}, ${label.id})
    ON CONFLICT DO NOTHING
  `

  return label
}
```

### Architecture Compliance Checklist

- **fp() wrapping** — `backend/src/routes/labels.ts` exports a Fastify plugin wrapped with `fp()`. Register in `server.ts` with `fastify.register(labelRoutes, { prefix: '/api' })`.
- **Only `db/queries/labels.ts` may issue SQL** — route handlers must call named query functions, never `fastify.sql` directly.
- **TypeBox schemas** — All route body/params/response schemas use TypeBox in `backend/src/types/` (or inline with `Type.*`).
- **`preHandler: [fastify.authenticate]`** — mandatory on all label routes.
- **Per-user isolation** — every query must filter by `user_id`. No cross-user data access.
- **Error shape** — `{ statusCode, error, message }` for all error responses. No exceptions.
- **Test location** — `backend/test/` mirroring `backend/src/`; `frontend/test/` mirroring `frontend/src/`.
- **No co-located tests** — source files in `src/`, tests in `test/`.

### Previous Story Learnings (from Story 2.5 — Delete Task)

From the established patterns across Epics 1–2:
- `req.user` is cast as `{ id: number }` inside all authenticated route handlers.
- The `postgres` package uses tagged template literals — always `sql\`...\`` with `${variable}` interpolation (safe parameterised queries).
- Route params are coerced from URL strings to integers using `Type.Integer({ minimum: 1 })` in the TypeBox schema — `@fastify/type-provider-typebox` handles the coercion automatically.
- Optimistic UI pattern is consistent across all task mutations: cancel → snapshot → mutate cache → return snapshot; rollback on error; invalidate on settle.
- 404 is returned for both "not found" and "belongs to another user" on task operations (prevents enumeration). For labels specifically, 403 is used for `DELETE /api/labels/:id` if the label exists but belongs to another user (per epics spec AC4).
- `onSuccess` in task mutations does NOT call `invalidateQueries` when the cache is already correct optimistically. Labels are an exception — use `invalidateQueries(['tasks'])` on `onSuccess` for attach/remove to refresh labels arrays with real IDs (the optimistic label id is a temporary `-Date.now()` placeholder).

### Frontend `api.ts` Patterns

`frontend/src/lib/api.ts` already exports typed `api.get<T>`, `api.post<T>`, `api.patch<T>`, `api.delete<T>`. Use:
- `api.get<Label[]>('/labels')` for `GET /api/labels`
- `api.post<Label>('/tasks/${taskId}/labels', { name })` for attach
- `api.delete<void>('/tasks/${taskId}/labels/${labelId}')` for remove
- `api.delete<void>('/labels/${id}')` for global delete

### Project Structure Notes

The codebase follows a strict convention established across Epics 1–2:

```
backend/
  src/
    db/
      migrations/    ← versioned SQL: 001_init.sql, 002_tasks.sql, 003_enrichment.sql (NEW)
      queries/
        tasks.ts     ← MODIFY (add labels JOIN to getTasks)
        auth.ts
        labels.ts    ← CREATE NEW
    routes/
      tasks.ts
      auth.ts
      labels.ts      ← CREATE NEW
    types/
      tasks.ts       ← MODIFY (add labels field to TaskSchema)
  test/
    db/
      queries/
        labels.test.ts   ← CREATE NEW
    routes/
      labels.test.ts     ← CREATE NEW

frontend/
  src/
    hooks/
      useTasks.ts    ← MODIFY (add useAttachLabel, useRemoveLabel)
      useLabels.ts   ← CREATE NEW
    components/
      TaskRow.tsx    ← MODIFY (add label pills + inline label input)
    types/
      tasks.ts       ← MODIFY (add labels field to Task interface)
  test/
    hooks/
      useLabels.test.ts  ← CREATE NEW
    components/
      TaskRow.test.tsx   ← MODIFY (add Story 3.1 describe block)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.1-Labels-Attach-and-Remove]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture] — Schema: `labels`, `task_labels` tables; recommended indexes
- [Source: _bmad-output/planning-artifacts/architecture.md#Route-Surface] — `GET /api/labels`, `DELETE /api/labels/:id`
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-004-Query-Layer] — `postgres` tagged template literal pattern, `labels.ts` query file convention
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002-Backend-Framework] — TypeBox `@sinclair/typebox` + `@fastify/type-provider-typebox`; fp() plugin wrapping
- [Source: _bmad-output/planning-artifacts/architecture.md#Optimistic-UI-Pattern] — onMutate/onError/onSettled pattern for TanStack Query
- [Source: _bmad-output/implementation-artifacts/2-5-delete-task.md#Dev-Notes] — Established patterns for query functions, route handlers, optimistic mutations
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-003-Database] — Migration strategy; `003_enrichment.sql` scope per Story 1.1

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Backend tests (focused): `npm test -- test/db/queries/labels.test.ts test/routes/labels.test.ts`
- Backend tests (tasks regression): `npm test -- test/routes/tasks.test.ts`
- Frontend tests (focused): `npm test -- test/hooks/useTasks.test.ts test/hooks/useLabels.test.ts test/components/TaskRow.test.tsx`

### Completion Notes List

- Implemented and wired backend labels route plugin with auth, ownership checks, idempotent attach semantics (`201` new / `200` existing), task-label unlink, and global delete (`403` cross-user, `404` not found).
- Extended `labels` query module with `created` tracking on upsert response and label ownership lookup utility.
- Integrated label management in frontend: `useLabels`, `useDeleteLabel`, `useAttachLabel`, `useRemoveLabel`, and TaskRow label pills + inline add flow with optimistic updates/rollback.
- Preserved Story 2.3/2.4/2.5 behavior while adding Story 3.1 UI and error handling (`role="alert"`, add/remove accessibility labels).
- Added/updated backend and frontend tests covering labels query, route, task list regression with `labels`, hooks, and TaskRow label interactions.
- Verified targeted backend and frontend suites pass.

### File List

- backend/src/db/queries/labels.ts
- backend/src/routes/labels.ts
- backend/src/server.ts
- frontend/src/hooks/useLabels.ts
- frontend/src/hooks/useTasks.ts
- frontend/src/components/TaskRow.tsx
- backend/test/db/queries/labels.test.ts
- backend/test/routes/labels.test.ts
- backend/test/routes/tasks.test.ts
- frontend/test/hooks/useTasks.test.ts
- frontend/test/hooks/useLabels.test.ts
- frontend/test/components/TaskRow.test.tsx
- _bmad-output/implementation-artifacts/3-1-labels-attach-and-remove.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-02-26: Completed Story 3.1 labels attach/remove implementation across backend and frontend, added comprehensive tests, and advanced story status to `review`.
- 2026-02-26: Applied AI code-review fixes (all HIGH/MEDIUM findings): added label retry affordance + tests, aligned SQL conflict strategy with story (`DO NOTHING` path while preserving `created` behavior), added missing migration and route assertions, re-validated focused backend/frontend suites.

### Senior Developer Review (AI)

**Reviewer:** Alessio  
**Date:** 2026-02-26  
**Outcome:** Changes Requested

#### Summary

- AC coverage is mostly implemented across backend and frontend (attach/remove flows, label aggregation in `GET /api/tasks`, migration tables present).
- During this review run, git working tree had no modified/staged files, so story File List claims could not be corroborated via local diff evidence.
- Identified 5 issues total: 2 High, 3 Medium.

#### Findings

1. **[HIGH] AC6 retry affordance gap for label errors**  
  `TaskRow` shows inline label error text, but unlike toggle/edit/delete errors it does not provide an explicit retry control for label attach/remove failures. AC6 asks for inline error + retry affordance on the affected row.

2. **[HIGH] Incomplete test coverage claim in completed Task 8 route checklist**  
  `backend/test/routes/labels.test.ts` covers 401/204/403 for `DELETE /api/labels/:id`, but does not assert explicit `404` behavior for non-existent labels while Task 8 is marked complete.

3. **[MEDIUM] SQL strategy mismatch with story text**  
  Story AC/task text calls out `ON CONFLICT (user_id, name) DO NOTHING`, while implementation currently uses `DO UPDATE SET name = EXCLUDED.name`. This works functionally but diverges from the stated contract and should be aligned or documented.

4. **[MEDIUM] AC7 verification gap in migration tests**  
  Migration tests validate table existence/constraints for `003_enrichment.sql`, but do not assert the migration filename entry is present in `_migrations` for 003 specifically.

5. **[MEDIUM] Git-vs-story traceability discrepancy**  
  Story File List references many changed files, but this review run observed a clean git tree (`git status --porcelain`, `git diff --name-only`, `git diff --cached --name-only` all empty). Evidence traceability is incomplete in current workspace state.

#### Re-Review (Post-Fix)

- All HIGH and MEDIUM findings from this review round were fixed and verified by focused tests.
- Focused test evidence:
  - `backend`: `test/db/migrate.test.ts`, `test/routes/labels.test.ts`, `test/db/queries/labels.test.ts` → passing
  - `frontend`: `test/components/TaskRow.test.tsx` → passing

#### Decision

- Story status moved to `done`.
