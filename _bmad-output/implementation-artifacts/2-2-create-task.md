# Story 2.2: Create Task

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to create a task by typing a title and pressing Enter,
so that I can capture work items in one fluid action.

## Acceptance Criteria

**AC1 — Inline Enter-to-create flow:**
- **Given** I am on the task list with the inline creation row focused
- **When** I type a task title and press Enter
- **Then** the task appears at the top of my task list immediately (optimistic UI — no spinner)
- **And** `POST /api/tasks` is called with the title

**AC2 — Empty title validation:**
- **Given** I submit a task with no title
- **When** validation runs
- **Then** no API call is made
- **And** the input shows an inline validation hint

**AC3 — API create behavior:**
- **Given** `POST /api/tasks` is called with a valid body
- **When** the task is created
- **Then** the response is the created task object (direct, no wrapper) with status `201`
- **And** the task is created with completion state false (`is_completed = false` in DB, `isCompleted = false` in API/FE model)

**AC4 — Failure recovery:**
- **Given** the API request fails (network/server error)
- **When** the optimistic task is shown
- **Then** the task shows an inline error state with retry affordance
- **And** the optimistic task is rolled back if retry is abandoned

**AC5 — Live task count update:**
- **Given** a task is created
- **When** TanStack Query cache updates
- **Then** the header task count updates immediately (e.g., `0/1`) with no extra API call

## Tasks / Subtasks

- [x] **Task 1: Backend API create endpoint** (AC: AC3)
  - [x] Add `POST /api/tasks` in `backend/src/routes/tasks.ts` with `preHandler: [fastify.authenticate]`
  - [x] Validate payload via TypeBox schema (`title` required, trimmed non-empty)
  - [x] Return created task object directly with HTTP `201`
  - [x] Ensure inserted row defaults `is_completed = false`, `completed_at = null`
  - [x] Reuse existing response shape conventions from `GET /api/tasks` (camelCase fields: `isCompleted`, `createdAt`, etc.)

- [x] **Task 2: Query layer implementation** (AC: AC3)
  - [x] Add create query in `backend/src/db/queries/tasks.ts`
  - [x] Use explicit columns and safe parameterized SQL (`postgres` tagged templates)
  - [x] Guarantee ownership isolation by using authenticated `userId` from JWT claims
  - [x] Keep SQL aliases consistent with existing `getTasks` mapping (`user_id AS "userId"`, `is_completed AS "isCompleted"`, etc.)

- [x] **Task 3: Frontend inline create flow** (AC: AC1, AC2)
  - [x] Implement/complete inline create row behavior on task list page
  - [x] Enter submits; blank/whitespace title shows inline validation (no API call)
  - [x] Keep focus ergonomics for fast repeated entry
  - [x] Wire `frontend/src/components/InlineTaskInput.tsx` into mutation flow without replacing the existing component

- [x] **Task 4: Optimistic mutation + rollback** (AC: AC1, AC4, AC5)
  - [x] Use TanStack Query mutation for optimistic insert at list top
  - [x] On success, reconcile with server response
  - [x] On error, show inline retry UI and support rollback path
  - [x] Ensure task count derives from cached tasks list (`completed/total`)
  - [x] Update cache through query key `['tasks']` to stay consistent with `useTasks`

- [x] **Task 5: UX compliance alignment checks** (Regression guardrail)
  - [x] Preserve the design-system palette and token usage from UX specification
  - [x] Confirm task list colors do not diverge from approved dark/green retro palette
  - [x] Ensure no changes regress existing logout flow from Story 1.4

- [x] **Task 6: Tests** (AC: AC1-AC5)
  - [x] Backend integration tests for `POST /api/tasks` success + validation + auth
  - [x] Frontend tests for Enter submit, blank title validation, optimistic add, rollback
  - [x] Verify task count updates from cache with no additional endpoint call
  - [x] Extend existing route test file `backend/test/routes/tasks.test.ts` (avoid creating duplicate route test suites)

## Dev Notes

- Build on existing patterns from Story 2.1 artifacts and current `tasks` route/query structure.
- Keep responses aligned with existing API error shape: `{ statusCode, error, message }`.
- Keep task entity naming consistent with current API model (`isCompleted` in JSON/UI, DB snake_case internally).
- Do not introduce new endpoints for count; derive count client-side from task list cache.
- Keep inline error feedback (no modal/toast-only behavior).
- Maintain keyboard-native interaction: Enter submits; focus flow remains efficient.

### Architecture Compliance

- Stack and conventions must remain: Fastify + TypeBox + `postgres` SQL, React + TanStack Query.
- Keep route surface aligned with architecture (`POST /api/tasks` under `/api` prefix).
- Respect per-user data isolation (`WHERE user_id = $userId` ownership on all task operations).
- Keep tests in `test/` tree (not co-located with source).

### Library / Framework Requirements

- Backend: `@sinclair/typebox`, `@fastify/type-provider-typebox`, `postgres`.
- Frontend: TanStack Query optimistic mutation patterns already used in app.
- No new component library; keep custom Tailwind + Radix approach.

### File Structure Requirements

- Backend expected touchpoints:
  - `backend/src/routes/tasks.ts`
  - `backend/src/db/queries/tasks.ts`
  - `backend/src/types/tasks.ts` (if schema extension needed)
  - `backend/test/routes/tasks.test.ts`
  - `backend/test/db/queries/tasks.test.ts`
- Frontend expected touchpoints:
  - `frontend/src/pages/TaskListPage.tsx`
  - `frontend/src/components/InlineTaskInput.tsx`
  - `frontend/src/hooks/useTasks.ts`
  - `frontend/src/lib/api.ts` (if endpoint helper updates are required)

### Out of Scope / Do Not Regress

- Do not modify auth route contracts unless strictly required.
- Logout behavior from Story 1.4 must continue to work end-to-end.
- Task list visual updates must align with UX palette/tokens; do not introduce ad-hoc colors.

### Testing Requirements

- Use Vitest for backend/frontend tests; use Testcontainers for DB-backed integration where applicable.
- Cover success + invalid input + unauthorized + optimistic rollback cases.
- Validate that created task appears at top and task count updates immediately.

### Previous Story Intelligence (from 2.1)

- Existing task list baseline and `GET /api/tasks` are already implemented.
- Follow established direct-array response conventions.
- Continue explicit SQL column selection and ownership-safe query patterns.

### Git Intelligence Summary

- Recent commits indicate auth + logout and task-list foundation are already merged.
- Regression risk areas: auth/logout wiring and UI theme consistency after task-list changes.
- Prefer incremental changes that preserve existing patterns and route registrations.

### Latest Tech Information

- No version upgrade required for this story; implement with currently pinned project dependencies.
- Focus on correctness and alignment with existing architecture/UX rather than dependency churn.

### Project Context Reference

- Source references:
  - `_bmad-output/planning-artifacts/epics.md` (Story 2.2 acceptance criteria)
  - `_bmad-output/planning-artifacts/architecture.md` (route, stack, query and testing standards)
  - `_bmad-output/planning-artifacts/ux-design-specification.md` (visual system + inline interaction constraints)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- N/A

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Implemented `POST /api/tasks` with TypeBox `CreateTaskBodySchema` validation, 201 direct response, `is_completed=false` default.
- Added `createTask` query with explicit column selection, parameterized SQL, and per-user ownership isolation (`user_id = ${userId}`).
- Implemented `useCreateTask` hook with TanStack Query optimistic mutation: `onMutate` prepends temp task at list top, `onError` rolls back and invalidates to re-sync, `onSuccess` reconciles with server task directly (no `onSettled` invalidation — avoids the extra GET that would violate AC5).
- Wired `InlineTaskInput`: Enter submits, whitespace-only title shows inline validation (no API call), network failures show inline retry/dismiss affordances.
- Task count (AC5) derives from `['tasks']` cache in `TaskListPage` — no new endpoint added, and no redundant refetch on success.
- Set up frontend vitest + @testing-library infrastructure (was absent); added 10 frontend component tests (9 original + 1 new for AC1 optimistic-at-top).
- Extended `backend/test/routes/tasks.test.ts` with 6 POST integration tests; extended `backend/test/db/queries/tasks.test.ts` with 2 `createTask` tests.
- All 40 backend tests pass; all 10 frontend tests pass. No regressions to auth/logout (Story 1.4) or task-list view (Story 2.1).
- **Code review fixes applied (2026-02-25):**
  - [H1] Removed `onSettled: invalidateQueries` — was firing an extra GET /api/tasks on every successful create, violating AC5. Moved invalidation to `onError` only for cache re-sync after failure.
  - [M1] Added `frontend/package-lock.json` to story File List (was in git, absent from story).
  - [M2] Fixed AC5 frontend test — now spies on `api.get` and asserts it is NOT called after a successful create.
  - [M3] Normalized whitespace-only 400 error field from `"BAD_REQUEST"` to `"Bad Request"` to match TypeBox/Fastify default error shape.
  - [M4] Added frontend test asserting optimistic task appears at list index 0 before server responds (AC1 coverage gap).

### File List

- _bmad-output/implementation-artifacts/2-2-create-task.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- backend/src/types/tasks.ts
- backend/src/db/queries/tasks.ts
- backend/src/routes/tasks.ts
- backend/test/routes/tasks.test.ts
- backend/test/db/queries/tasks.test.ts
- frontend/src/hooks/useTasks.ts
- frontend/src/components/InlineTaskInput.tsx
- frontend/package.json
- frontend/package-lock.json
- frontend/vitest.config.ts
- frontend/test/setup.ts
- frontend/test/components/InlineTaskInput.test.tsx

## Change Log

- Story 2.2 (Create Task) implemented — `POST /api/tasks` endpoint, optimistic UI mutation, inline validation, retry/rollback UX, task count derived from cache. Frontend vitest test infrastructure added. (Date: 2026-02-25)
- Code review performed — 5 issues fixed (1 High, 4 Medium): removed AC5-violating `onSettled` refetch, moved `invalidateQueries` to `onError` only; normalized whitespace-only 400 `error` field from `BAD_REQUEST` to `Bad Request`; AC5 test now spies on `api.get` and asserts no extra fetch; added AC1 test asserting optimistic task lands at index 0; `frontend/package-lock.json` documented in File List. Story marked done. (Date: 2026-02-25)
- Code review performed — 5 issues fixed (1 High, 4 Medium): removed AC5-violating onSettled refetch, normalized error field casing, strengthened AC5 and AC1 test coverage, documented package-lock.json. Story marked done. (Date: 2026-02-25)
