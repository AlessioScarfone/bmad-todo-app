# Story 2.2: Create Task

Status: ready-for-dev

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

- [ ] **Task 1: Backend API create endpoint** (AC: AC3)
  - [ ] Add `POST /api/tasks` in `backend/src/routes/tasks.ts` with `preHandler: [fastify.authenticate]`
  - [ ] Validate payload via TypeBox schema (`title` required, trimmed non-empty)
  - [ ] Return created task object directly with HTTP `201`
  - [ ] Ensure inserted row defaults `is_completed = false`, `completed_at = null`
  - [ ] Reuse existing response shape conventions from `GET /api/tasks` (camelCase fields: `isCompleted`, `createdAt`, etc.)

- [ ] **Task 2: Query layer implementation** (AC: AC3)
  - [ ] Add create query in `backend/src/db/queries/tasks.ts`
  - [ ] Use explicit columns and safe parameterized SQL (`postgres` tagged templates)
  - [ ] Guarantee ownership isolation by using authenticated `userId` from JWT claims
  - [ ] Keep SQL aliases consistent with existing `getTasks` mapping (`user_id AS "userId"`, `is_completed AS "isCompleted"`, etc.)

- [ ] **Task 3: Frontend inline create flow** (AC: AC1, AC2)
  - [ ] Implement/complete inline create row behavior on task list page
  - [ ] Enter submits; blank/whitespace title shows inline validation (no API call)
  - [ ] Keep focus ergonomics for fast repeated entry
  - [ ] Wire `frontend/src/components/InlineTaskInput.tsx` into mutation flow without replacing the existing component

- [ ] **Task 4: Optimistic mutation + rollback** (AC: AC1, AC4, AC5)
  - [ ] Use TanStack Query mutation for optimistic insert at list top
  - [ ] On success, reconcile with server response
  - [ ] On error, show inline retry UI and support rollback path
  - [ ] Ensure task count derives from cached tasks list (`completed/total`)
  - [ ] Update cache through query key `['tasks']` to stay consistent with `useTasks`

- [ ] **Task 5: UX compliance alignment checks** (Regression guardrail)
  - [ ] Preserve the design-system palette and token usage from UX specification
  - [ ] Confirm task list colors do not diverge from approved dark/green retro palette
  - [ ] Ensure no changes regress existing logout flow from Story 1.4

- [ ] **Task 6: Tests** (AC: AC1-AC5)
  - [ ] Backend integration tests for `POST /api/tasks` success + validation + auth
  - [ ] Frontend tests for Enter submit, blank title validation, optimistic add, rollback
  - [ ] Verify task count updates from cache with no additional endpoint call
  - [ ] Extend existing route test file `backend/test/routes/tasks.test.ts` (avoid creating duplicate route test suites)

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

### File List

- _bmad-output/implementation-artifacts/2-2-create-task.md
