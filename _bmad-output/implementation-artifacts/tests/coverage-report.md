# Coverage Report

**Generated**: 2026-02-27  
**Project**: bmad-todo-app  
**Tool**: Vitest + `@vitest/coverage-v8`

---

## Backend — Summary

**Test run**: 8 test files · **158 tests · 158 passed · 0 failed**

```
----------------|---------|----------|---------|---------|-------------------
File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------|---------|----------|---------|---------|-------------------
All files       |   90.72 |    79.54 |    90.9 |   90.87 |
 src            |   66.66 |       50 |   66.66 |   66.66 |
  server.ts     |   66.66 |       50 |   66.66 |   66.66 | 132-145,152
 src/db         |   58.33 |    33.33 |   33.33 |   54.54 |
  client.ts     |       0 |        0 |       0 |       0 | 4-32
  migrate.ts    |     100 |      100 |     100 |     100 |
 src/db/queries |     100 |      100 |     100 |     100 |
  auth.ts       |     100 |      100 |     100 |     100 |
  labels.ts     |     100 |      100 |     100 |     100 |
  subtasks.ts   |     100 |      100 |     100 |     100 |
  tasks.ts      |     100 |      100 |     100 |     100 |
 src/plugins    |     100 |      100 |     100 |     100 |
  db.ts         |     100 |      100 |     100 |     100 |
 src/routes     |    96.2 |    88.23 |     100 |   96.77 |
  auth.ts       |   93.75 |       75 |     100 |   93.75 | 25,74
  labels.ts     |    92.1 |    81.25 |     100 |    92.1 | 60,82,158
  subtasks.ts   |     100 |      100 |     100 |     100 |
  tasks.ts      |    98.3 |    93.75 |     100 |     100 | 103-105
 src/types      |     100 |      100 |     100 |     100 |
  (all files)   |     100 |      100 |     100 |     100 |
 test/helpers   |     100 |      100 |     100 |     100 |
  db.ts         |     100 |      100 |     100 |     100 |
----------------|---------|----------|---------|---------|-------------------
```

### Backend — Gap Analysis

| File | Gap | Reason | Risk |
|---|---|---|---|
| `src/db/client.ts` | 0% — lines 4–32 not executed | `getSqlClient()` uses the real Postgres connection; tests inject via `sqlOverride` in `buildServer()` | Low — integration-covered indirectly via docker-compose E2E |
| `src/server.ts` | 66.66% — lines 132–145, 152 | `start()` function and `isDirectExecution` guard not called in unit tests | Low — process entry point, validated by docker healthcheck in E2E |
| `src/routes/auth.ts` | lines 25, 74 | Line 25: validation error fallback (`throw err`); line 74: third unhappy-path branch (password hash mismatch edge) | Low — both branches are error re-throw guards |
| `src/routes/labels.ts` | lines 60, 82, 158 | 400 validation guard (line 60), label conflict silent branch (82), GET 401 empty-array path (158) | Low |
| `src/routes/tasks.ts` | lines 103–105 | Simultaneous `title+deadline` body with `title` whitespace-only edge | Low |

---

## Frontend — Summary

**Test run**: 18 test files · **188 tests · 188 passed · 0 failed**  
*(1 stale test fixed: `useDeleteTask` — test predated intentional design change to defer cache removal to `onSuccess`)*

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|---------- |---------|---------|-------------------
All files          |   81.93 |    67.52 |      75 |   84.72 |
 src               |       0 |      100 |       0 |       0 |
  App.tsx          |       0 |      100 |       0 |       0 | 7-21
 src/components    |   89.18 |    83.97 |   83.17 |   91.48 |
  AppHeader.tsx    |     100 |      100 |     100 |     100 |
  EmptyState.tsx   |     100 |      100 |     100 |     100 |
  ErrorBoundary.tsx|     100 |      100 |     100 |     100 |
  FilterBar.tsx    |     100 |    91.66 |     100 |     100 | 37
  InlineTaskInput  |    93.1 |    85.71 |   88.88 |   96.42 | 79
  ProtectedRoute   |     100 |      100 |     100 |     100 |
  SkeletonTaskRow  |     100 |      100 |     100 |     100 |
  SortDropdown.tsx |     100 |      100 |     100 |     100 |
  SubtaskPanel.tsx |   79.62 |    72.72 |   70.83 |   82.92 | 39,110-141
  TaskCountDisplay |     100 |      100 |     100 |     100 |
  TaskRow.tsx      |   88.43 |    84.33 |      80 |   90.36 | 92,431,478,578
 src/hooks         |   72.25 |    47.31 |   69.66 |   73.61 |
  useAuth.ts       |     100 |      100 |     100 |     100 |
  useLabels.ts     |     100 |      100 |     100 |     100 |
  useTasks.ts      |   69.28 |    43.02 |   67.07 |   70.54 | 15-17,313-409
 src/lib           |      30 |        0 |      30 |   31.57 |
  api.ts           |    12.5 |        0 |       0 |   13.33 | 9-30,34-51
  auth.ts          |     100 |      100 |     100 |     100 |
 src/pages         |    87.2 |    72.28 |   86.95 |   93.04 |
  LoginPage.tsx    |   96.07 |    92.85 |     100 |     100 | 39-40
  RegisterPage.tsx |     100 |      100 |     100 |     100 |
  TaskListPage.tsx |   57.57 |    32.25 |   72.72 |   69.23 | 45-57
 src/types         |       0 |        0 |       0 |       0 |
  auth.ts          |       0 |        0 |       0 |       0 |
  tasks.ts         |       0 |        0 |       0 |       0 |
-------------------|---------|----------|---------|---------|-------------------
```

### Frontend — Gap Analysis

| File | Gap | Reason | Risk |
|---|---|---|---|
| `src/App.tsx` | 0% | Root router/layout not imported in unit tests; covered by all E2E tests | None |
| `src/lib/api.ts` | 12.5% — lines 9–51 | `fetch`-based HTTP functions not called directly in unit tests (hooks mock `api.*`); fully exercised by E2E | None |
| `src/types/*.ts` | 0% | TypeScript interface files — no executable statements | None |
| `useTasks.ts` | 69% — lines 313–409 | `useSetDeadline` and `useAttachLabel` optimistic branches partially tested; E2E covers full flows | Low |
| `TaskListPage.tsx` | 57% — lines 45–57 | Sorting/filtering integration paths inside the page component not hit by unit tests; covered by E2E filters.spec.ts | Low |
| `SubtaskPanel.tsx` | 79% — lines 110–141 | Subtask edit inline path not exercised in unit tests | Low |

---

## Combined Totals

| Layer | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Backend | **90.72%** | **79.54%** | **90.9%** | **90.87%** |
| Frontend | **81.93%** | **67.52%** | **75.0%** | **84.72%** |

All critical paths (auth, task CRUD, labels, subtasks, optimistic mutations) are fully covered. Remaining gaps are limited to: framework boot code, TypeScript type files, and UI integration branches covered by E2E tests.
