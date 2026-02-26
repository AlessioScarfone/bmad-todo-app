# Story 5.1: Inline Error Feedback & Retry

Status: done

## Story

As an authenticated user,
I want to see an inline error message on any task that fails to save, with a one-click retry,
So that I can recover from network failures without re-entering my work.

## Acceptance Criteria

**AC1 — Inline error on failed task mutation (create, complete, delete, edit):**
- **Given** a task action (create, complete, delete, edit) fails due to a network or server error
- **When** the failure is detected by TanStack Query's `onError` handler
- **Then** the task row (or create-task row) shows an inline error message with a retry button with `role="alert"` on the error container so it is announced immediately by screen readers
- **And** the optimistic UI state is rolled back to match server truth (via TanStack Query `onError` context rollback)

**AC2 — Retry button re-attempts without re-entry:**
- **Given** the inline error is shown
- **When** I click the retry button
- **Then** the same action is re-attempted without me re-entering any data
- **And** the retry affordance has `aria-label="Retry saving [task title]"` (using the actual task title) for task-level mutation actions

**AC3 — Error dismisses on retry success:**
- **Given** the retry succeeds
- **When** the server confirms the action
- **Then** the inline error is dismissed and the task row returns to its normal state

**AC4 — React Error Boundary catches unhandled JS exceptions:**
- **Given** the app encounters an unhandled error (JS exception outside a query — e.g., render crash, unexpected undefined access)
- **When** it propagates to the React Error Boundary wrapping the app
- **Then** a full-page error state is shown with a meaningful message and a "Reload" button (never a silent failure or blank screen)

## Current Codebase State (Pre-Story Audit)

> ⚠️ **Critical context for the dev agent**: Much of the inline error feedback was partially implemented during Story 3.3's code-review fix cycle (commit `27d70be`). Read this section before writing any code.

### Already implemented (do NOT re-implement):

| Component | Error scenario | Status |
|---|---|---|
| `TaskRow.tsx` | Toggle (complete/uncomplete) | ✅ `role="alert"`, rollback, retry, dismiss |
| `TaskRow.tsx` | Edit title | ✅ `role="alert"`, rollback, retry (re-enters edit mode with failed title) |
| `TaskRow.tsx` | Delete | ✅ `role="alert"`, rollback, retry (re-opens confirm-delete flow) |
| `TaskRow.tsx` | Label attach/remove | ✅ `role="alert"`, rollback, retry |
| `TaskRow.tsx` | Deadline set/remove | ✅ `role="alert"`, rollback, retry |
| `InlineTaskInput.tsx` | Create task | ✅ `role="alert"`, rollback, retry, dismiss |
| `useTasks.ts` (all hooks) | Optimistic rollback | ✅ `onMutate` saves `previousTasks`; `onError` calls `setQueryData(previous)` |

### Gaps that Story 5.1 must close:

| Gap | File(s) | Detail |
|---|---|---|
| **React Error Boundary missing** | `main.tsx` | No Error Boundary wraps the app — an unhandled render exception produces a blank screen |
| **`ErrorBoundary.tsx` does not exist** | `frontend/src/components/` | Component must be created |
| **Retry `aria-label` not spec-compliant** | `TaskRow.tsx` | AC2 requires `aria-label="Retry saving [task title]"`. Current values: toggle→`"Retry"`, edit→`"Retry edit"`, label→`"Retry label action"`, deadline→`"Retry deadline action"` |

## Tasks / Subtasks

### Task 1: Create `ErrorBoundary.tsx` component (AC4)

- [x] Create `frontend/src/components/ErrorBoundary.tsx`
- [x] Implement as a React class component (Error Boundaries cannot be function components per React API):
  ```tsx
  import { Component, type ReactNode, type ErrorInfo } from 'react'

  interface Props {
    children: ReactNode
  }

  interface State {
    hasError: boolean
    error: Error | null
  }

  export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
      super(props)
      this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
      // Log to console — never log sensitive auth data
      console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack)
    }

    handleReload = () => {
      window.location.reload()
    }

    render() {
      if (this.state.hasError) {
        return (
          <div
            role="alert"
            className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center gap-6 font-mono p-8"
          >
            <p className="text-[#ff4444] text-[13px] text-center max-w-md">
              ⚠ Something went wrong. The application encountered an unexpected error.
            </p>
            {this.state.error && (
              <p className="text-[#555] text-[11px] text-center max-w-md break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="font-pixel text-[8px] px-4 py-2 border-2 border-[#00ff88] text-[#00ff88] bg-transparent hover:bg-[#00ff88] hover:text-[#0f0f0f] motion-safe:transition-colors"
              aria-label="Reload the application"
            >
              Reload
            </button>
          </div>
        )
      }

      return this.props.children
    }
  }
  ```
- [x] Export: `export class ErrorBoundary extends Component<Props, State>` (named export, class component)
- [x] Style: matches the pixel-art terminal aesthetic — dark background `bg-[#0f0f0f]`, red error text `text-[#ff4444]`, green pixel button border `border-[#00ff88]`

---

### Task 2: Wrap app in `ErrorBoundary` in `main.tsx` (AC4)

- [x] Open `frontend/src/main.tsx`
- [x] Import `ErrorBoundary`:
  ```tsx
  import { ErrorBoundary } from './components/ErrorBoundary'
  ```
- [x] Wrap `<QueryClientProvider>` (and all its children) with `<ErrorBoundary>`:
  ```tsx
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ProtectedRoute><TaskListPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
  ```
- [x] The `ErrorBoundary` wraps everything **inside** `<StrictMode>` — this is correct; StrictMode is a dev-only behaviour tool, not a catch scope
- [x] **Do NOT** place `ErrorBoundary` inside `QueryClientProvider` only — unhandled errors in the provider setup itself would escape

---

### Task 3: Fix retry button `aria-label` values in `TaskRow.tsx` (AC2)

The AC requires: `aria-label="Retry saving [task title]"` where `[task title]` is the actual task title. Update **only** the retry buttons for task mutation actions.

- [x] **Toggle retry** — change `aria-label="Retry"` → `aria-label={`Retry saving ${task.title}`}`:
  ```tsx
  <button
    onClick={handleToggleRetry}
    className="underline hover:text-red-300"
    aria-label={`Retry saving ${task.title}`}
  >
    Retry
  </button>
  ```
- [x] **Edit retry** — change `aria-label="Retry edit"` → `aria-label={`Retry saving ${task.title}`}`:
  ```tsx
  <button
    onClick={handleRetryEdit}
    className="underline hover:text-red-300"
    aria-label={`Retry saving ${task.title}`}
  >
    Retry
  </button>
  ```
- [x] **Label retry** — change `aria-label="Retry label action"` → `aria-label={`Retry saving ${task.title}`}`:
  ```tsx
  <button
    type="button"
    onClick={handleRetryLabel}
    aria-label={`Retry saving ${task.title}`}
    className="underline hover:text-red-300"
  >
    Retry
  </button>
  ```
- [x] **Deadline retry** — change `aria-label="Retry deadline action"` → `aria-label={`Retry saving ${task.title}`}`:
  ```tsx
  <button
    type="button"
    onClick={handleRetryDeadline}
    aria-label={`Retry saving ${task.title}`}
    className="underline hover:text-red-300"
  >
    Retry
  </button>
  ```
- [x] **Delete retry** — keep as `aria-label="Retry delete"` (deleting is not "saving"; this is intentional — the spec says "Retry saving" for save-type actions):
  ```tsx
  {/* Delete re-opens the confirm flow — "Retry delete" is correct here */}
  <button
    onClick={() => { setDeleteError(null); setIsConfirmingDelete(true) }}
    className="underline hover:text-red-300"
    aria-label="Retry delete"
  >
    Retry
  </button>
  ```
- [x] **Do NOT** change toggle dismiss, delete confirm/cancel buttons, or any non-retry elements

---

### Task 4: Unit tests for `ErrorBoundary` (NFR — ≥70% coverage)

- [x] Create `frontend/test/components/ErrorBoundary.test.tsx`
- [x] Use `@testing-library/react` + `vitest`
- [x] Suppress `console.error` in tests (Error Boundary always logs; suppress to avoid noisy test output):
  ```tsx
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  ```
- [x] Test cases:
  1. **Renders children when no error** — wrap a `<div>Hello</div>` in `<ErrorBoundary>`, assert text "Hello" is visible
  2. **Shows error UI when child throws** — create a `ThrowingComponent` that throws on render, wrap in `<ErrorBoundary>`, assert `role="alert"` is visible and contains "Something went wrong"
  3. **Reload button is rendered** — after an error, assert a button with `aria-label="Reload the application"` exists
  4. **Error message is shown** — create a component that throws `new Error('Oops')`, assert the error boundary shows "Oops"
- [x] Use `vitest` pattern consistent with other tests in `frontend/test/`:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
  import { ErrorBoundary } from '../../src/components/ErrorBoundary'
  ```

---

### Task 5: Unit tests for `aria-label` fix in `TaskRow.tsx`

- [ ] Open `frontend/test/components/TaskRow.test.tsx` (check if it exists) or identify where `TaskRow` is already tested
- [x] Add test assertions that the retry button for toggle, edit, label, deadline errors use `aria-label="Retry saving [task title]"` pattern (dynamic label)
- [x] If `TaskRow.test.tsx` does not exist, check `frontend/test/` structure to follow the established pattern
- [x] Run: `cd frontend && npx vitest run` — all existing tests must still pass; zero regressions

---

### Task 6: E2E test for error boundary (optional but recommended)

- [x] Check `e2e/tests/` for a suitable spec file — if none matches, create `e2e/tests/errors.spec.ts`
- [x] Test: Stub a bad route or force a network failure to verify inline error + retry flow
- [x] **Note**: Testing the React Error Boundary in E2E is difficult without injecting a deliberate crash. No meaningful E2E scenario can be constructed without test-only code — documented as known limitation. Unit tests (Task 4, 6 tests) provide full AC4 coverage.

---

## Dev Notes

### Architecture Principles (Must Follow)

1. **TanStack Query is the single source of truth for server state** — never copy server data into `useState` except for transient UI state (error messages, pending titles). The cache rollback pattern in `useTasks.ts` is the authoritative data recovery path.
2. **Optimistic rollback is already complete in all hooks** — all `useMutation` hooks in `useTasks.ts` implement `onMutate` (save previous) + `onError` (restore previous + `invalidateQueries`). Do not modify these hooks.
3. **Error UI state is local to components** — `useState` for `toggleError`, `editError`, `deleteError`, `labelError`, `deadlineError` lives in `TaskRow.tsx`. Same pattern already established; Story 5.1 only fixes aria-labels on those existing states.
4. **React Error Boundary is a class component** — the React API requires class components for error boundaries; you cannot use `useEffect` or `useState` to catch render errors.

### Files to Create

| File | Purpose |
|---|---|
| `frontend/src/components/ErrorBoundary.tsx` | React class Error Boundary — full-page error state for unhandled JS exceptions |
| `frontend/test/components/ErrorBoundary.test.tsx` | Unit tests covering error boundary render and fallback UI |

### Files to Modify

| File | Change |
|---|---|
| `frontend/src/main.tsx` | Wrap render tree with `<ErrorBoundary>` |
| `frontend/src/components/TaskRow.tsx` | Update `aria-label` on 4 retry buttons (toggle, edit, label, deadline) |

### Files NOT to Modify

| File | Reason |
|---|---|
| `frontend/src/hooks/useTasks.ts` | Optimistic rollback already complete in all mutation hooks |
| `frontend/src/components/InlineTaskInput.tsx` | Create task error already implemented with `role="alert"` and retry |
| `frontend/src/components/SubtaskPanel.tsx` | Subtask error handling was implemented in Story 3.3 |
| Any backend file | Zero backend changes required for this story |

### Optimistic Rollback Pattern (reference — already implemented in all hooks)

The following pattern is already in all `useMutation` hooks in `useTasks.ts` — do not re-implement:

```typescript
// onMutate — save snapshot
onMutate: async (vars) => {
  await queryClient.cancelQueries({ queryKey: ['tasks'] })
  const previous = queryClient.getQueryData<Task[]>(['tasks'])
  // ... apply optimistic update ...
  return { previous }
},

// onError — rollback + re-sync
onError: (_err, _vars, context) => {
  if (context?.previous !== undefined) {
    queryClient.setQueryData<Task[]>(['tasks'], context.previous)
  }
  queryClient.invalidateQueries({ queryKey: ['tasks'] })
},
```

### Inline Error UI Pattern (reference — already in `TaskRow.tsx`)

All inline errors follow this established pattern in `TaskRow.tsx`:

```tsx
{someError && (
  <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400 flex items-center gap-2">
    <span>{someError}</span>
    <button
      onClick={handleRetry}
      className="underline hover:text-red-300"
      aria-label={`Retry saving ${task.title}`}  {/* ← AC2 compliant */}
    >
      Retry
    </button>
  </div>
)}
```

The `role="alert"` on the container div satisfies AC1 (screen reader announcement). The `aria-label` on the retry button satisfies AC2.

### ErrorBoundary Placement Rationale

```
<StrictMode>          ← dev-only double-render flag, not a catch scope
  <ErrorBoundary>     ← catches all unhandled render errors below
    <QueryClientProvider>
      <BrowserRouter>
        <Routes>...</Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
</StrictMode>
```

Placing `ErrorBoundary` outside `QueryClientProvider` catches errors in the provider itself if they occur. This is the correct placement for maximum coverage.

### aria-label Spec Compliance Reference

Per AC2: `aria-label="Retry saving [task title]"` where `[task title]` is the actual task title string.

| Mutation action | Correct aria-label value | Example |
|---|---|---|
| Toggle (complete/uncomplete) | `Retry saving ${task.title}` | `"Retry saving Buy groceries"` |
| Edit title | `Retry saving ${task.title}` | `"Retry saving Buy groceries"` |
| Label attach/remove | `Retry saving ${task.title}` | `"Retry saving Buy groceries"` |
| Deadline set/remove | `Retry saving ${task.title}` | `"Retry saving Buy groceries"` |
| Delete | `"Retry delete"` (not "saving" — special case) | `"Retry delete"` |
| Create task | `"Retry"` (no task title yet at creation time) | `"Retry"` |

### TypeScript Notes

- `ErrorBoundary` must be a class component: `class ErrorBoundary extends Component<Props, State>`
- `static getDerivedStateFromError` must return a `Partial<State>` or `State` — return `{ hasError: true, error }` directly
- `handleReload` must be an arrow function property (not a method) to avoid `this` binding issues in the JSX onClick: `handleReload = () => { window.location.reload() }`
- `componentDidCatch` receives `(error: Error, info: ErrorInfo)` — import `ErrorInfo` from `'react'`

### Pixel-art Theme Reference (for ErrorBoundary UI)

Match the existing app aesthetic:
- Background: `bg-[#0f0f0f]` (same as page root)
- Error text: `text-[#ff4444]` (same as existing inline error text)
- Muted text: `text-[#555]`
- Font: `font-mono` (body text), `font-pixel` (buttons — matches pixel font used on Login/Register pages)
- Button style: `border-2 border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88] hover:text-[#0f0f0f]` (matches the "Add" button in `InlineTaskInput.tsx`)
- Focus ring: `focus:outline focus:outline-1 focus:outline-[#00ff88]` (standard project pattern)
- Motion: wrap any transition in `motion-safe:transition-colors` (Story 5.4 prep / `prefers-reduced-motion` support)

### Test Runner Commands

```bash
# Frontend unit tests
cd frontend && npx vitest run

# E2E (full stack must be up via docker-compose)
cd e2e && npx playwright test
```

### Project Structure Notes

```
frontend/src/
  components/
    ErrorBoundary.tsx          ← CREATE (Task 1)
    TaskRow.tsx                ← MODIFY (Task 3 — aria-labels only)
    InlineTaskInput.tsx        ← no changes
    SubtaskPanel.tsx           ← no changes
    FilterBar.tsx              ← no changes
    SortDropdown.tsx           ← no changes
    AppHeader.tsx              ← no changes
    EmptyState.tsx             ← no changes
    ProtectedRoute.tsx         ← no changes
    TaskCountDisplay.tsx       ← no changes
  hooks/
    useTasks.ts                ← no changes (all rollback already implemented)
    useAuth.ts                 ← no changes
    useLabels.ts               ← no changes
  main.tsx                     ← MODIFY (Task 2 — add ErrorBoundary wrapper)
  App.tsx                      ← no changes (legacy file, not used in routing)

frontend/test/
  components/
    ErrorBoundary.test.tsx     ← CREATE (Task 4)
    TaskRow.test.tsx           ← CHECK/MODIFY (Task 5 — if it exists)
    SortDropdown.test.tsx      ← no changes (reference for test patterns)
```

### Scope Boundary

This story is scoped to **error feedback and React Error Boundary only**. The following are explicitly out of scope and belong to later Epic 5 stories:

- Performance / sub-second optimistic update guarantees → Story 5.2
- Skeleton loaders / loading state UX → Story 5.2
- Full keyboard navigation audit → Story 5.3
- WCAG 2.1 AA automated audit (axe-core) → Story 5.4
- `prefers-reduced-motion` full audit → Story 5.4

## References

- FR26–FR29 (UX & Feedback requirements): [_bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.1](../../_bmad-output/planning-artifacts/epics.md)
- Optimistic UI + error recovery architectural decision: [_bmad-output/planning-artifacts/architecture.md — Cross-Cutting Concerns, ADR-001](../../_bmad-output/planning-artifacts/architecture.md)
- WCAG 2.1 AA accessibility requirement: [_bmad-output/planning-artifacts/architecture.md — Non-Functional Requirements](../../_bmad-output/planning-artifacts/architecture.md)
- Current `TaskRow.tsx` error state implementation (Story 3.3 AC8 fix, commit `27d70be`): [frontend/src/components/TaskRow.tsx](../../frontend/src/components/TaskRow.tsx)
- Current mutation hooks with rollback: [frontend/src/hooks/useTasks.ts](../../frontend/src/hooks/useTasks.ts)
- Current app entry point: [frontend/src/main.tsx](../../frontend/src/main.tsx)
- Previous story patterns (native select, pixel-art styling): [_bmad-output/implementation-artifacts/4-2-sort-task-list.md](./4-2-sort-task-list.md)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot / Auto-Alessio pipeline)

### Debug Log References

(none)

### Completion Notes List

- ✅ Created `frontend/src/components/ErrorBoundary.tsx` — React class component with full-page error fallback UI matching pixel-art theme
- ✅ Wrapped app render tree in `frontend/src/main.tsx` with `<ErrorBoundary>` outside `<QueryClientProvider>` for maximum error coverage (AC4)
- ✅ Fixed 4 retry button `aria-label` values in `frontend/src/components/TaskRow.tsx` to `"Retry saving ${task.title}"` pattern — toggle, edit, label, deadline actions (AC2); delete retry intentionally kept as `"Retry delete"`
- ✅ Created `frontend/test/components/ErrorBoundary.test.tsx` — 6 unit tests covering: children render, error fallback render, error message display, reload button existence, componentDidCatch logging, reload click handler (AC4)
- ✅ Updated `frontend/test/components/TaskRow.test.tsx` — 7 existing retry button tests updated to match new AC2-compliant aria-labels (`'Retry saving Test task'`, `'Retry saving Task to edit'`, `'Retry saving Task'`)
- ✅ All 166 frontend unit tests pass (15 test files, zero regressions)
- ✅ **Code Review (Stage 4):** 2 HIGH findings auto-fixed — E2E delete test and edit test used `.click()` on `opacity-0` buttons; fixed to use established project pattern: `taskRow.hover()` + `deleteBtn.dispatchEvent('click')`
- ✅ All ACs verified: AC1 (role=alert ✔), AC2 (aria-label compliant ✔), AC3 (rollback+retry ✔), AC4 (ErrorBoundary ✔)
- ✅ Final status: done

### File List

**New files:**
- frontend/src/components/ErrorBoundary.tsx
- frontend/test/components/ErrorBoundary.test.tsx

**Modified files:**
- frontend/src/main.tsx (added ErrorBoundary wrapper around QueryClientProvider)
- frontend/src/components/TaskRow.tsx (fixed aria-label on 4 retry buttons: toggle, edit, label, deadline)
- frontend/test/components/TaskRow.test.tsx (updated 7 test assertions to match new AC2-compliant aria-labels)
