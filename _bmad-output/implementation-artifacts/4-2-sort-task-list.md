# Story 4.2: Sort Task List

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authenticated user,
I want to sort my task list by label, deadline, or completion status,
so that I can view my tasks in the order most useful for my current focus.

## Acceptance Criteria

**AC1 — Sort dropdown always accessible:**
- **Given** I am on the task list page
- **When** the page loads
- **Then** a "Sort" control is visible in the filter/sort bar; the default sort option is displayed (e.g., "Default" or "None")

**AC2 — Sort by label (A→Z):**
- **Given** I open the sort dropdown and select "Label (A→Z)"
- **When** the sort is applied
- **Then** the task list re-orders so tasks with labels appear first, sorted alphabetically by their first label (A→Z)
- **And** tasks with no labels are sorted to the bottom
- **And** no API call is made — sort is applied client-side on the TanStack Query cache

**AC3 — Sort by deadline (earliest first):**
- **Given** I open the sort dropdown and select "Deadline (earliest)"
- **When** the sort is applied
- **Then** the task list re-orders by deadline date, earliest first
- **And** tasks without a deadline are sorted to the bottom

**AC4 — Sort by completion status (incomplete first):**
- **Given** I open the sort dropdown and select "Status (incomplete first)"
- **When** the sort is applied
- **Then** incomplete tasks appear before completed tasks

**AC5 — Active sort shown in dropdown:**
- **Given** a sort is active
- **When** I view the sort dropdown trigger
- **Then** it displays the currently active sort option label (not just "Sort")

**AC6 — Sort + filter combined:**
- **Given** a sort is active alongside an active filter
- **When** both are applied
- **Then** the list shows only the filtered tasks in the selected sort order
- **And** no API call is made — both are applied client-side

**AC7 — Keyboard navigable dropdown:**
- **Given** I focus the sort dropdown trigger
- **When** I press Enter or Space to open
- **Then** I can navigate options with arrow keys and confirm with Enter
- **And** the dropdown trigger has `aria-haspopup="listbox"` and `aria-expanded`
- **And** each option has `role="option"` and `aria-selected` reflecting the current selection

**AC8 — Sort is session-only:**
- **Given** a sort is active
- **When** I refresh the page or navigate away and return
- **Then** the sort resets to the default (no sort applied)
- **And** sort state is never written to `localStorage` or any other persistent store

## Tasks / Subtasks

- [x] **Task 1: Create `SortDropdown.tsx` component** (AC: AC1, AC2, AC3, AC4, AC5, AC7)
  - [ ] Create `frontend/src/components/SortDropdown.tsx`
  - [ ] Define a sort option type:
    ```typescript
    export type SortOption = 'none' | 'label-asc' | 'deadline-asc' | 'status-incomplete-first'
    ```
  - [ ] Props interface:
    ```typescript
    interface SortDropdownProps {
      activeSortOption: SortOption
      onSortChange: (option: SortOption) => void
    }
    ```
  - [ ] Implement using a native `<select>` element for maximum keyboard accessibility and ARIA compliance in MVP — no custom dropdown needed:
    ```tsx
    <select
      value={activeSortOption}
      onChange={e => onSortChange(e.target.value as SortOption)}
      aria-label="Sort tasks"
      className="..."
    >
      <option value="none">Sort: Default</option>
      <option value="label-asc">Label (A→Z)</option>
      <option value="deadline-asc">Deadline (earliest)</option>
      <option value="status-incomplete-first">Status (incomplete first)</option>
    </select>
    ```
  - [ ] Style to match the pixel-art aesthetic: `font-mono text-[10px] border border-[#333] bg-[#111] text-[#aaa]` + `focus:outline focus:outline-1 focus:outline-[#00ff88]`
  - [ ] The component is purely presentational — all state managed externally
  - [ ] Export: `export function SortDropdown(...)` (named export)
  - [ ] Import `SortOption` type re-exported from this file — `TaskListPage` will import it from here

- [x] **Task 2: Add sort state and logic to `TaskListPage.tsx`** (AC: AC1, AC2, AC3, AC4, AC5, AC6, AC8)
  - [ ] Import `SortDropdown` and `SortOption` from `../components/SortDropdown`
  - [ ] Add sort state:
    ```typescript
    const [sortOption, setSortOption] = useState<SortOption>('none')
    ```
  - [ ] Apply sort AFTER filters — create `sortedFilteredTasks` derived from `filteredTasks`:
    ```typescript
    const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
      switch (sortOption) {
        case 'label-asc': {
          const aLabel = a.labels.map(l => l.name).sort()[0] ?? '\uffff'
          const bLabel = b.labels.map(l => l.name).sort()[0] ?? '\uffff'
          return aLabel.localeCompare(bLabel)
        }
        case 'deadline-asc': {
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        }
        case 'status-incomplete-first':
          return Number(a.isCompleted) - Number(b.isCompleted)
        default:
          return 0
      }
    })
    ```
  - [ ] Render `sortedFilteredTasks` instead of `filteredTasks` in the task list `<ul>`
  - [ ] Render `<SortDropdown>` inside/alongside the existing `<FilterBar>` — place it to the right of the filter groups:
    ```tsx
    <div className="flex items-center justify-between flex-wrap gap-2">
      <FilterBar ... />
      <SortDropdown activeSortOption={sortOption} onSortChange={setSortOption} />
    </div>
    ```
  - [ ] The empty state and header task count logic are unchanged — they derive from `tasks` (full) and `filteredTasks` (filter empty state check) respectively
  - [ ] **Do NOT modify `useTasks()`** — query key, queryFn, staleTime unchanged

- [x] **Task 3: Frontend unit tests for `SortDropdown`** (NFR16 — ≥70% coverage)
  - [ ] Create `frontend/test/components/SortDropdown.test.tsx`
  - [ ] Use `@testing-library/react` + `vitest`
  - [ ] Test cases:
    - Renders select element with `aria-label="Sort tasks"`
    - Default value is `"none"` (shows "Sort: Default")
    - Changing to "Label (A→Z)" calls `onSortChange('label-asc')`
    - Changing to "Deadline (earliest)" calls `onSortChange('deadline-asc')`
    - Changing to "Status (incomplete first)" calls `onSortChange('status-incomplete-first')`
    - Displays the currently active sort option as selected value
  - [ ] File location: `frontend/test/components/SortDropdown.test.tsx`
  - [ ] Run tests: `cd frontend && npx vitest run`

- [x] **Task 4: Implement the 3 skipped E2E sorting tests in `filters.spec.ts`** (NFR17)
  - [ ] Replace the 3 `test.skip` stubs in `test.describe('Sorting', ...)` with real tests:
    1. **Sort by label (A→Z)**: Create user → create 2 tasks → attach different labels → select "Label (A→Z)" → verify alphabetical order in DOM (`nth(0)` contains first-alpha label task)
    2. **Sort by deadline (earliest first)**: Create user → create 2 tasks → set different deadline dates → select "Deadline (earliest)" → verify earlier-deadline task appears first
    3. **Sort by completion status (incomplete first)**: Create user → create 2 tasks → complete 1 → select "Status (incomplete first)" → verify incomplete task appears before complete task
  - [ ] Select sort option: `page.getByLabel('Sort tasks').selectOption('label-asc')` (native select)
  - [ ] Use `createUserAndLogin` helper (already imported as `registerAndLogin` in filters.spec.ts — keep existing import)
  - [ ] Target task positions by DOM order: `page.getByRole('listitem').nth(0)` to check order
  - [ ] Keep `test.describe('Filters', ...)` block unchanged (already passing)

## Dev Notes

### Architecture Context — Critical

- **Sort is 100% client-side in MVP**, identical to filters. Rule from `project-context.md`: "Filter/sort state is `useState` in `TaskListPage` — applied client-side on the cache result." **Do NOT add query params to `useTasks()`.**
- **No backend changes.** This story touches only `frontend/` and `e2e/`. No backend routes, migrations, or DB queries.
- **Sort is applied AFTER filters.** The pipeline is: `tasks` (full TanStack cache) → `filteredTasks` (filter applied) → `sortedFilteredTasks` (sort applied). The task list renders `sortedFilteredTasks`.
- **Header count uses `tasks`** (full). Filter empty-state check uses `filteredTasks.length === 0`. Render uses `sortedFilteredTasks`.
- **Use a native `<select>`** for the sort control — simpler than a custom listbox, fully keyboard accessible without extra ARIA wiring, consistent with the pixel-art aesthetic.

### Component Architecture (updated)

```
TaskListPage
  ├── AppHeader (completedTasks/totalTasks from full tasks[])
  ├── InlineTaskInput
  ├── [wrapper div]
  │   ├── FilterBar (receives full tasks[], filter state, callbacks)  ← unchanged
  │   └── SortDropdown (activeSortOption, onSortChange)              ← NEW
  └── <ul aria-label="Task list"> renders sortedFilteredTasks[]
        └── TaskRow (unchanged)
```

### Existing Code to Extend (NOT re-create)

| File | What to add |
|---|---|
| `frontend/src/pages/TaskListPage.tsx` | `sortOption` state, `sortedFilteredTasks` derivation, `<SortDropdown>` render, wrapper layout div |
| `e2e/tests/filters.spec.ts` | Replace 3 skipped sort stubs with real tests |

### Project Structure Notes

- **New files:**
  - `frontend/src/components/SortDropdown.tsx`
  - `frontend/test/components/SortDropdown.test.tsx`
- **Modified files:**
  - `frontend/src/pages/TaskListPage.tsx` (sort state + SortDropdown render + sortedFilteredTasks)
  - `e2e/tests/filters.spec.ts` (implement 3 sorting tests — keep Filters block untouched)

### Sorting Logic (reference implementation)

```typescript
// In TaskListPage.tsx — applied on filteredTasks, not tasks (sort after filter)
const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
  switch (sortOption) {
    case 'label-asc': {
      // Tasks with no labels sort to the bottom (\uffff is the highest Unicode char)
      const aLabel = a.labels.map(l => l.name).sort()[0] ?? '\uffff'
      const bLabel = b.labels.map(l => l.name).sort()[0] ?? '\uffff'
      return aLabel.localeCompare(bLabel)
    }
    case 'deadline-asc': {
      // Tasks with no deadline sort to the bottom
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    }
    case 'status-incomplete-first':
      // false (0) sorts before true (1)
      return Number(a.isCompleted) - Number(b.isCompleted)
    default:
      return 0 // 'none' — preserve server order (created_at DESC)
  }
})
```

### Pattern References from Previous Stories

| Concern | Where to look | What to replicate |
|---|---|---|
| Filter state pattern | `TaskListPage.tsx` (Story 4.1) | `useState<SortOption>('none')` — same shape as `statusFilter` |
| Client-side derived array | `TaskListPage.tsx` `filteredTasks` | `[...filteredTasks].sort(...)` — always spread to avoid mutating cache |
| Focus ring styling | `FilterBar.tsx` `FilterButton` | `focus:outline focus:outline-1 focus:outline-[#00ff88]` |
| Component prop typing | `FilterBar.tsx`, `TaskRow.tsx` | Explicit interface above component, no inline types |
| E2E auth helper | `e2e/helpers/auth.ts` | `registerAndLogin(page, email)` already imported in filters.spec.ts |
| E2E task creation | `filters.spec.ts` existing tests | `page.getByLabel('New task title').fill(...).press('Enter')` |
| `prefers-reduced-motion` | Architecture doc + project-context.md | `motion-safe:transition-colors` on any animated styles |

### Critical Constraints

1. **Never mutate the TanStack Query cache array** — always spread before sort: `[...filteredTasks].sort(...)`
2. **`sortedFilteredTasks` → task list render; `filteredTasks` → empty-state gate; `tasks` → header count** — three separate computations.
3. **No changes to `useTasks()` hook** — query key `['tasks']`, queryFn, and staleTime stay unchanged.
4. **Sort state resets on navigation/refresh** — by design (AC8). Never persist to `localStorage`.
5. **ESM imports** — no `.js` extension needed in `frontend/src/` (Vite handles resolution).
6. **Strict TypeScript** — `sortOption` must be typed as `SortOption`, not `string`.
7. **`FilterBar` is unchanged** — do not add sort state, sort callbacks, or sort UI to `FilterBar.tsx`.

### Task Type Reference

The `Task` type (from `frontend/src/types/tasks.ts`) includes:
- `id: string`
- `title: string`
- `isCompleted: boolean`
- `deadline: string | null` (ISO 8601 date string or null)
- `labels: { id: string; name: string }[]`
- `subtasks: { id: string; title: string; isCompleted: boolean }[]`

### SortDropdown Visual Layout (pixel-art theme)

```tsx
// Pixel-art native select — styled to match the app's terminal aesthetic
<div className="flex items-center gap-1">
  <span className="font-mono text-[9px] text-[#444] uppercase tracking-widest">Sort:</span>
  <select
    value={activeSortOption}
    onChange={e => onSortChange(e.target.value as SortOption)}
    aria-label="Sort tasks"
    className="font-mono text-[10px] border border-[#333] bg-[#111] text-[#aaa] px-1 py-0.5 focus:outline focus:outline-1 focus:outline-[#00ff88] motion-safe:transition-colors"
  >
    <option value="none">Default</option>
    <option value="label-asc">Label (A→Z)</option>
    <option value="deadline-asc">Deadline (earliest)</option>
    <option value="status-incomplete-first">Status (incomplete first)</option>
  </select>
</div>
```

### E2E DOM Order Verification Pattern

Tasks are returned from `GET /api/tasks` ordered `created_at DESC` (newest first). E2E tests that check sorted order should verify via `getByRole('listitem').nth(0)`:

```typescript
// After sort-by-label is applied, verify the alphabetically-first task is at index 0
const taskItems = page.getByRole('list', { name: 'Task list' }).getByRole('listitem')
await expect(taskItems.nth(0)).toContainText('Apple task') // 'A' before 'B'
await expect(taskItems.nth(1)).toContainText('Banana task')
```

### References

- FR25 (sort by label, deadline, completion status): [Source: epics.md — Epic 4, Story 4.2]
- Client-side sort architecture rule: [Source: project-context.md — Framework Rules → React + TanStack Query]
- Sort dropdown keyboard requirements: [Source: epics.md — Story 4.2 AC keyboard]
- E2E sorting stubs to implement: [e2e/tests/filters.spec.ts — test.describe('Sorting')]
- Previous story dev notes (filter patterns): [_bmad-output/implementation-artifacts/4-1-filter-task-list-by-label-status-and-deadline.md]
- Task type definition: [frontend/src/types/tasks.ts]
- Test runner: `cd frontend && npx vitest run` (unit) · `cd e2e && npx playwright test tests/filters.spec.ts` (E2E)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

(none — implementation was clean)

### Completion Notes List

- Story created and implemented via BMAD AutoAgent full-pipeline (2026-02-26)
- All sorting is 100% client-side via `useState<SortOption>` in `TaskListPage` — zero backend changes
- `SortDropdown` is a pure presentational component using a native `<select>` for maximum keyboard accessibility
- Sort applied AFTER filters: `tasks → filteredTasks → sortedFilteredTasks` pipeline; `[...filteredTasks].sort(...)` spread prevents TanStack Query cache mutation
- 8/8 new `SortDropdown.test.tsx` unit tests pass; 160/160 total frontend tests pass (zero regressions)
- 3 new E2E sort tests implemented in `e2e/tests/filters.spec.ts` (replaced 3 skipped stubs); all 7 filter+sort tests pass
- Also fixed pre-existing `getByLabel` strict-mode violations in `filters.spec.ts` and `labels.spec.ts` (FilterBar filter buttons now match label substrings — fixed with `{ exact: true }` and `getByRole('combobox')` selectors)
- 49/49 E2E tests pass (4 pre-existing skips for checkbox toggle — known project limitation)
- Zero TypeScript errors across all modified files
- No backend files touched

### File List

**New files:**
- frontend/src/components/SortDropdown.tsx
- frontend/test/components/SortDropdown.test.tsx

**Modified files:**
- frontend/src/pages/TaskListPage.tsx (added sortOption state, sortedFilteredTasks derivation, SortDropdown import + render, wrapper layout div)
- e2e/tests/filters.spec.ts (3 sort tests implemented + fixed label/status selector issues; code review added AC4 API-based status-sort test + AC6 combined filter+sort test → 8 tests total)
- e2e/tests/labels.spec.ts (fixed getByLabel strict-mode violations caused by FilterBar label buttons)

## Senior Developer Review (AI)

**Reviewer:** GitHub Copilot (Claude Sonnet 4.6) — Code Review, 2026-02-26  
**Outcome:** ✅ Approved with fixes applied

### Findings & Fixes Applied

| Severity | Finding | Resolution |
|---|---|---|
| MEDIUM | **AC4 E2E didn't verify real reordering** — status-sort test only checked select interaction with two incomplete tasks (stable sort → no visible change). AC4 behavior ("incomplete before complete") was never validated E2E. | Fixed: Replaced test with API-based approach. Uses `page.request.patch('/api/tasks/:id/complete')` to complete a task, reloads page, then verifies sort reorders DOM (complete task moves from top to bottom). |
| MEDIUM | **AC6 no combined filter+sort E2E test** — no test simultaneously applied a filter and a sort. | Fixed: Added new `sort and filter work together — combined sort+filter (Story 4.2 AC6)` test. Creates 3 tasks (2 with label "Combo" + varying deadlines, 1 with label "Other"), applies label filter, then deadline sort, verifies filtered+sorted order and excluded task remains hidden. |
| LOW | **`<span>Sort:</span>` not `aria-hidden="true"`** — screen readers would read "Sort:" redundantly before announcing the select's `aria-label="Sort tasks"`. | Fixed: Added `aria-hidden="true"` to decorative span in `SortDropdown.tsx`. |
| LOW | **AC7 ARIA attributes inapplicable to native `<select>`** — AC7 specifies `aria-haspopup="listbox"`, `aria-expanded`, `aria-selected`. These are custom dropdown pattern attributes invalid on a native `<select>`. Dev Notes explicitly authorised native `<select>`, creating a story contradiction. | Documented: No code fix (adding these attributes would violate ARIA spec). Native `<select>` provides equivalent keyboard accessibility natively. Accepted as MVP design decision. |

### Post-Review Metrics

- Frontend unit tests: 160/160 ✅
- E2E tests: 50 passing, 4 pre-existing skipped ✅ (up from 49 — new combined test added)
- TypeScript: 0 errors ✅
