# Test Automation Summary

**Last Updated**: 2026-02-26 (Story 5.2 — Performance & Sub-second State Reflection)
**Project**: bmad-todo-app  
**Workflow**: QA — Generate E2E / Automated Tests  
**Frameworks**: Playwright (E2E), Vitest + React Testing Library (frontend), Vitest + Testcontainers (backend)

---

## Generated Tests

### E2E Tests — Story 5.2 (performance & skeleton loading)

- [x] [e2e/tests/performance.spec.ts](../../../e2e/tests/performance.spec.ts) — Skeleton rows during load (AC4), optimistic create no-spinner (AC1), optimistic toggle + count (AC1+AC2), count decrement on uncomplete (AC2), page load < 3s (AC3), skeleton replaced after load (AC4) — 6 tests

### Frontend Component Tests — Story 5.2 (skeleton + TaskListPage states)

- [x] [frontend/test/components/SkeletonTaskRow.test.tsx](../../../frontend/test/components/SkeletonTaskRow.test.tsx) — renders without crash, li element, two placeholder blocks, aria-hidden, animate-pulse, bg-[#333] styling — 6 tests, ✅ all pass
- [x] [frontend/test/pages/TaskListPage.test.tsx](../../../frontend/test/pages/TaskListPage.test.tsx) — skeleton rows when loading (AC4), EmptyState when empty, task list when loaded, no skeleton after load, task count from cache (AC2) — 5 tests, ✅ all pass

- [x] [e2e/tests/errors.spec.ts](../../../e2e/tests/errors.spec.ts) — Toggle error (AC1+AC2), edit error (AC1+AC2), successful retry dismisses error (AC3), delete aria-label edge case (AC2) — 4 tests

### Frontend Component Tests — Story 5.1 (ErrorBoundary + aria-label regression)

- [x] [frontend/test/components/ErrorBoundary.test.tsx](../../../frontend/test/components/ErrorBoundary.test.tsx) — renders children, shows error UI on crash, reload button aria-label, error message display, console.error call, reload click handler — 6 tests, ✅ all pass
- [x] [frontend/test/components/TaskRow.test.tsx](../../../frontend/test/components/TaskRow.test.tsx) — 7 existing retry button assertions updated for AC2-compliant `aria-label="Retry saving [task title]"` — 46 tests total, ✅ all pass

### E2E Tests — Story 4.1 (filters)

- [x] [e2e/tests/filters.spec.ts](../../../e2e/tests/filters.spec.ts) — Filter by label, status, deadline, reset on reload (Story 4.1) + Sort by label, deadline, status + combined filter+sort (Story 4.2) — 8 tests

### Frontend Component Tests — Story 4.2 (sort)

- [x] [frontend/test/components/SortDropdown.test.tsx](../../../frontend/test/components/SortDropdown.test.tsx) — SortDropdown renders, reflects active option, calls onSortChange with correct value for all options — 8 tests, ✅ all pass

### Frontend Component Tests — Story 4.1 (filters)

- [x] [frontend/test/components/FilterBar.test.tsx](../../../frontend/test/components/FilterBar.test.tsx) — FilterBar renders all groups, button clicks, aria-pressed states, deselect, label sort — 15 tests, ✅ all pass

### E2E Tests — 2026-02-26 (prior)

- [x] [e2e/tests/labels.spec.ts](../../../e2e/tests/labels.spec.ts) — Label attach and remove user workflows (Story 3.1) — 3 tests, ✅ all pass
- [x] [e2e/tests/deadlines.spec.ts](../../../e2e/tests/deadlines.spec.ts) — Deadline set, remove, and persistence (Story 3.2) — 3 tests, ✅ all pass

### Frontend Hook Tests — 2026-02-26 (new)

- [x] [test/hooks/useAuth.test.ts](../../../frontend/test/hooks/useAuth.test.ts) — `useAuth` hook: loading state, authenticated, 401 silent, non-401 propagation, endpoint — 5 tests, ✅ all pass

### Frontend Component Tests — 2026-02-25

- [x] [test/components/TaskCountDisplay.test.tsx](../../../frontend/test/components/TaskCountDisplay.test.tsx) — renders completed/total counts, aria-label, aria-live (4 tests)
- [x] [test/components/EmptyState.test.tsx](../../../frontend/test/components/EmptyState.test.tsx) — no-tasks message, instruction text, aria-live (3 tests)
- [x] [test/components/ProtectedRoute.test.tsx](../../../frontend/test/components/ProtectedRoute.test.tsx) — loading state, error state, unauthenticated redirect, authenticated render (4 tests)
- [x] [test/components/AppHeader.test.tsx](../../../frontend/test/components/AppHeader.test.tsx) — email display, task count display, logout API call, localStorage clear, in-flight disabled state, missing email (7 tests)

### Frontend Page Tests — 2026-02-25

- [x] [test/pages/LoginPage.test.tsx](../../../frontend/test/pages/LoginPage.test.tsx) — field rendering, email pre-fill from localStorage, email/password validation, API call, saveEmail, 401 error, generic error (10 tests)
- [x] [test/pages/RegisterPage.test.tsx](../../../frontend/test/pages/RegisterPage.test.tsx) — field rendering, email format validation, password min-length, API call with trimmed email, 409 duplicate error, generic error (10 tests)

### Previously Existing Tests

- [x] [e2e/tests/auth.spec.ts](../../../e2e/tests/auth.spec.ts) — registration, login, session, email pre-fill (E2E)
- [x] [e2e/tests/tasks.spec.ts](../../../e2e/tests/tasks.spec.ts) — task CRUD (E2E)
- [x] [e2e/tests/count.spec.ts](../../../e2e/tests/count.spec.ts) — live task count (E2E)
- [x] [e2e/tests/subtasks.spec.ts](../../../e2e/tests/subtasks.spec.ts) — subtask add, complete, delete (E2E)
- [x] [test/components/InlineTaskInput.test.tsx](../../../frontend/test/components/InlineTaskInput.test.tsx) — inline creation, validation, optimistic update, retry/dismiss, task count (10 tests)
- [x] [test/hooks/useLabels.test.ts](../../../frontend/test/hooks/useLabels.test.ts) — useLabels, useDeleteLabel (2 tests)
- [x] [test/hooks/useTasks.test.ts](../../../frontend/test/hooks/useTasks.test.ts) — useToggleTask, useCreateTask, useUpdateTask, useDeleteTask, useAttachLabel, useRemoveLabel, useSetDeadline
- [x] [test/components/SubtaskPanel.test.tsx](../../../frontend/test/components/SubtaskPanel.test.tsx) — subtask list, add, complete, delete
- [x] [test/components/TaskRow.test.tsx](../../../frontend/test/components/TaskRow.test.tsx) — task row interactions
- [x] [test/routes/auth.test.ts](../../../backend/test/routes/auth.test.ts) — register, login, me, logout (backend)
- [x] [test/routes/tasks.test.ts](../../../backend/test/routes/tasks.test.ts) — task CRUD + deadline extension (backend)
- [x] [test/routes/labels.test.ts](../../../backend/test/routes/labels.test.ts) — label attach/remove/delete (backend)
- [x] [test/routes/subtasks.test.ts](../../../backend/test/routes/subtasks.test.ts) — subtask CRUD (backend)
- [x] [test/db/migrate.test.ts](../../../backend/test/db/migrate.test.ts) — database migration (backend)

---

## E2E Feature Coverage (Epics 1–5)

| Feature | E2E |
|---|---|
| Registration | ✅ auth.spec.ts |
| Login / session | ✅ auth.spec.ts |
| Email pre-fill on logout | ✅ auth.spec.ts |
| Task CRUD (create, edit, delete) | ✅ tasks.spec.ts |
| Mark complete / uncomplete | ✅ tasks.spec.ts |
| Live task count | ✅ count.spec.ts |
| Labels attach / remove | ✅ **labels.spec.ts** *(new 2026-02-26)* |
| Deadline set / remove / persist | ✅ **deadlines.spec.ts** *(new 2026-02-26)* |
| Subtasks add / complete / delete | ✅ subtasks.spec.ts |
| Filters (label, status, deadline) | ✅ **filters.spec.ts** *(new 2026-02-26 Story 4.1)* |
| Sorting | ✅ **filters.spec.ts** *(Story 4.2 — 4 sort tests: label, deadline, status via API, combined filter+sort)* |
| Inline error feedback & retry | ✅ **errors.spec.ts** *(Story 5.1)* |
| Skeleton loading state (4 rows) | ✅ **performance.spec.ts** *(new Story 5.2)* |
| Optimistic UI (create/toggle, no spinner) | ✅ **performance.spec.ts** *(new Story 5.2)* |
| Task count < 500ms (cache-derived) | ✅ **performance.spec.ts** *(new Story 5.2)* |
| Initial page load < 3s | ✅ **performance.spec.ts** *(new Story 5.2)* |

## Frontend Unit Coverage

| Unit | Status |
|---|---|
| `useAuth` | ✅ **useAuth.test.ts** *(new 2026-02-26)* |
| `useLabels`, `useDeleteLabel` | ✅ useLabels.test.ts |
| `useToggleTask`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useAttachLabel`, `useRemoveLabel`, `useSetDeadline` | ✅ useTasks.test.ts |
| `AppHeader` | ✅ AppHeader.test.tsx |
| `EmptyState` | ✅ EmptyState.test.tsx |
| `InlineTaskInput` | ✅ InlineTaskInput.test.tsx |
| `ProtectedRoute` | ✅ ProtectedRoute.test.tsx |
| `SubtaskPanel` | ✅ SubtaskPanel.test.tsx |
| `TaskCountDisplay` | ✅ TaskCountDisplay.test.tsx |
| `SortDropdown` | ✅ **SortDropdown.test.tsx** *(new 2026-02-26 Story 4.2)* |
| `FilterBar` | ✅ **FilterBar.test.tsx** *(new 2026-02-26 Story 4.1)* |
| `TaskRow` | ✅ TaskRow.test.tsx (7 retry aria-label tests updated for AC2) |
| `ErrorBoundary` | ✅ **ErrorBoundary.test.tsx** *(new 2026-02-26 Story 5.1)* |
| `SkeletonTaskRow` | ✅ **SkeletonTaskRow.test.tsx** *(new Story 5.2)* |
| `TaskListPage` | ✅ **TaskListPage.test.tsx** *(new Story 5.2 — loading/empty/data states)* |
| `LoginPage` | ✅ LoginPage.test.tsx |
| `RegisterPage` | ✅ RegisterPage.test.tsx |

## Backend API Coverage

| Endpoint | Status |
|---|---|
| `POST /api/auth/register` | ✅ |
| `POST /api/auth/login` | ✅ |
| `GET /api/auth/me` | ✅ |
| `POST /api/auth/logout` | ✅ |
| `GET /api/tasks` | ✅ |
| `POST /api/tasks` | ✅ |
| `PATCH /api/tasks/:id/complete` | ✅ |
| `PATCH /api/tasks/:id/uncomplete` | ✅ |
| `PATCH /api/tasks/:id` (title + deadline) | ✅ |
| `DELETE /api/tasks/:id` | ✅ |
| `GET /api/labels` | ✅ |
| `POST /api/tasks/:id/labels` | ✅ |
| `DELETE /api/tasks/:id/labels/:labelId` | ✅ |
| Subtask routes | ✅ |

---

## Test Commands

```bash
# E2E tests (requires docker-compose up)
cd e2e && npx playwright test

# Frontend unit tests
cd frontend && npm test

# Backend unit tests (requires Docker for Testcontainers)
cd backend && npm test
```

**2026-02-26 Story 5.2 result**: 11 new tests — all pass ✅ (6 E2E in performance.spec.ts [requires docker-compose stack] + 6 SkeletonTaskRow unit + 5 TaskListPage unit) | Frontend: 177 tests across 17 test files, zero regressions
**2026-02-26 Story 5.1 result**: 10 new/updated tests — all pass ✅ (6 ErrorBoundary unit + 7 TaskRow retry updated + 4 E2E in errors.spec.ts [E2E requires docker-compose stack])
**2026-02-26 Story 4.2 result (post code-review)**: 12 new tests — all pass ✅ (4 E2E sort/combined + 8 SortDropdown unit) | E2E: 50 passing, 4 pre-existing skipped
**2026-02-26 result**: 11 new tests — all pass ✅ (6 E2E + 5 unit)

---

## Next Steps

- Add E2E tests for keyboard navigation (Story 5.3)
- Add WCAG axe-core automated audit coverage (Story 5.4)
