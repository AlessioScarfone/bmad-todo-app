# Story 5.3: Full Keyboard Navigation

Status: done

## Story

As an authenticated user who relies on keyboard navigation,
I want to operate every core flow without a mouse,
So that the app is fully accessible and efficient for keyboard-first users.

## Acceptance Criteria

**AC1 — Logical tab order through the page:**
- **Given** I land on the task list page
- **When** I press Tab repeatedly from the browser address bar
- **Then** focus moves through interactive elements in this logical order: Logout button (header) → task creation input → filter bar buttons → sort dropdown → task rows

**AC2 — Space toggles completion on focused task row:**
- **Given** I have a task row focused (the `<li>` has focus, not an inner element)
- **When** I press Space
- **Then** the task completion checkbox is toggled (same as clicking the checkbox)
- **And** `e.preventDefault()` is called to suppress the browser's native scroll-on-space behaviour

**AC3 — Escape cancels inline edit and returns focus to the task row:**
- **Given** a task row is in inline edit mode (the title input is active)
- **When** I press Escape
- **Then** edit mode is cancelled and the title reverts to its previous value
- **And** focus is explicitly returned to the parent `<li>` task row (not lost to document body)

**AC4 — Filter buttons respond to Enter and Space (already native behaviour):**
- **Given** I Tab to a filter button in the FilterBar
- **When** I press Enter or Space
- **Then** the filter is toggled and `aria-pressed` updates accordingly
- **And** a visible focus ring (`outline-[#00ff88]`) is shown while the button is focused

**AC5 — Visible focus ring on ALL interactive elements:**
- **Given** I am navigating with Tab
- **When** any interactive element receives focus
- **Then** a clearly visible focus ring is rendered meeting WCAG 2.1 AA contrast (3:1 minimum against adjacent colours)
- **And** the following previously missing/insufficient focus styles are corrected:
  - AppHeader Logout button: adds `focus:outline focus:outline-2 focus:outline-[#00ff88]`
  - InlineTaskInput text input: adds `focus:bg-[#252525]` (container border already always present) — or any visually distinct change
  - Edit (✎) and Delete (✕) buttons inside `TaskRow`: add `focus:opacity-100` so they surface when reached via keyboard (currently hidden via `opacity-0 group-hover:opacity-100`)

## Current Codebase State (Pre-Story Audit)

> ⚠️ **Critical context for the dev agent**: Several ACs are already substantially satisfied. Read this section before writing any code to avoid re-implementing what works.

### Already Implemented — Do NOT re-implement:

| Requirement | Where | Status |
|---|---|---|
| Tab order follows visual DOM layout | `TaskListPage.tsx` — DOM order: `<InlineTaskInput>` → `<FilterBar>` → `<SortDropdown>` → task `<ul>` | ✅ Already follows visual order |
| Task rows are focusable | `TaskRow.tsx` `<li tabIndex={0}>` | ✅ |
| Enter on task row → edit mode | `TaskRow.tsx` `handleRowKeyDown` — Enter triggers `enterEditMode()` | ✅ |
| Escape in inline edit input → cancel | `TaskRow.tsx` `handleInputKeyDown` — Escape calls `cancelEdit()` | ✅ (focus return MISSING — see gap) |
| Escape in deadline picker closes picker | `TaskRow.tsx` deadline input `onKeyDown` | ✅ |
| Escape in label input closes label entry | `TaskRow.tsx` `handleLabelInputKeyDown` | ✅ |
| Filter buttons: `aria-pressed`, focus ring | `FilterBar.tsx` — `focus:outline focus:outline-1 focus:outline-[#00ff88]` | ✅ |
| Sort dropdown: focus ring | `SortDropdown.tsx` — `focus:outline-1 focus:outline-[#00ff88]` | ✅ |
| Subtask toggle: `aria-expanded`, focusable | `TaskRow.tsx` — `<button aria-expanded={subtasksOpen}>` | ✅ |
| Checkbox: `aria-label="Mark [title] as done/not done"` | `TaskRow.tsx` | ✅ |
| Task row visible focus via left border | `TaskRow.tsx` `<li className="... focus:border-l-[#00ff88]">` | ✅ (high-contrast green on dark bg) |
| Filter bar Enter/Space on buttons | Native `<button>` elements — browser handles this natively | ✅ |

### Gaps that Story 5.3 Must Close:

| Gap | File | Detail |
|---|---|---|
| **Space key on `<li>` does NOT toggle checkbox** | `TaskRow.tsx` `handleRowKeyDown` | Only Enter is handled; Space scrolls the page and ignores the checkbox |
| **Escape in edit mode does NOT return focus to `<li>`** | `TaskRow.tsx` `cancelEdit()` | Focus is lost to `document.body` after closing the edit input |
| **Edit (✎) + Delete (✕) buttons invisible to keyboard** | `TaskRow.tsx` | `opacity-0 group-hover:opacity-100` — keyboard users can reach them via Tab but cannot see them; `focus:opacity-100` is missing |
| **AppHeader logout button: no explicit focus ring** | `AppHeader.tsx` | className has no `focus:` visual indicator; browser default may be overridden by global CSS reset |
| **InlineTaskInput: `outline-none` with no replacement** | `InlineTaskInput.tsx` | Input has `outline-none` but no replacement focus style (e.g., `focus:bg-[#252525]`) |

## Tasks / Subtasks

### Task 1: Add Space-key toggle to `TaskRow` (AC2)

- [x] Open `frontend/src/components/TaskRow.tsx`
- [x] Locate `handleRowKeyDown(e: React.KeyboardEvent<HTMLLIElement>)` (currently handles Enter only)
- [x] Add Space handler before the Enter check:
  ```tsx
  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    // Space on the row (not editing, not in confirm-delete) toggles the checkbox
    if (e.key === ' ' && !isEditing && !isConfirmingDelete && e.target === e.currentTarget) {
      e.preventDefault() // prevent browser scroll-on-space
      handleToggle()
      return
    }
    // Enter on the row (not in edit mode, not in confirm-delete mode) enters edit mode
    if (e.key === 'Enter' && !isEditing && !isConfirmingDelete && e.target === e.currentTarget) {
      e.preventDefault()
      enterEditMode()
    }
  }
  ```
- [x] Verify `e.target === e.currentTarget` guard is preserved — prevents Space from triggering toggle when focus is on an inner button/input

### Task 2: Return focus to task row after Escape cancel (AC3)

- [x] Add a `rowRef` to `TaskRow`:
  ```tsx
  const rowRef = useRef<HTMLLIElement>(null)
  ```
- [x] Add `ref={rowRef}` to the `<li>` element
- [x] Update `cancelEdit()` to restore focus:
  ```tsx
  const cancelEdit = () => {
    setEditValue(task.title)
    setEditError(null)
    setIsEditing(false)
    // AC3: return focus to the row so the user does not lose their position
    rowRef.current?.focus()
  }
  ```
- [x] No changes needed to `handleInputKeyDown` — it already calls `cancelEdit()` on Escape

### Task 3: Surface Edit and Delete buttons when keyboard-focused (AC5)

- [x] In `TaskRow.tsx`, locate the Edit (✎) button and add `focus:opacity-100`:
  ```tsx
  <button
    onClick={enterEditMode}
    aria-label="Edit task title"
    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#888] hover:text-[#f0f0f0] motion-safe:transition-opacity px-1"
  >
    ✎
  </button>
  ```
- [x] Locate the Delete (✕) button and add `focus:opacity-100`:
  ```tsx
  <button
    onClick={() => { setDeleteError(null); setIsConfirmingDelete(true) }}
    aria-label="Delete task"
    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[#888] hover:text-red-400 motion-safe:transition-opacity px-1"
  >
    ✕
  </button>
  ```
- [x] These two-character changes (`focus:opacity-100`) are the complete fix — no other classes need changing

### Task 4: Add focus ring to AppHeader logout button (AC5)

- [x] Open `frontend/src/components/AppHeader.tsx`
- [x] Locate the logout `<button>` element
- [x] Add `focus:outline focus:outline-2 focus:outline-[#00ff88]` to its className:
  ```tsx
  className="font-pixel text-[8px] px-3 py-2 border-2 border-[#e0e0e0] bg-transparent text-[#f0f0f0] hover:border-[#00ff88] hover:text-[#00ff88] focus:outline focus:outline-2 focus:outline-[#00ff88] disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-colors"
  ```

### Task 5: Add visible focus indicator to InlineTaskInput (AC5)

- [x] Open `frontend/src/components/InlineTaskInput.tsx`
- [x] Locate the `<input type="text">` for task creation
- [x] Replace `outline-none` with a distinguished-but-subtle focus state. Recommended: add `focus:bg-[#252525]` to provide a visible background change when focused, keeping the pixel-art aesthetic:
  ```tsx
  className="flex-1 font-mono text-[13px] text-[#f0f0f0] placeholder-[#555] outline-none focus:bg-[#252525] bg-transparent"
  ```
  > **Alt**: Wrap the input container `<div>` with a `focus-within:border-[#00ff88]` class to make the already-present outer border glow on focus — either approach satisfies AC5.

### Task 6: Unit tests for keyboard interactions (NFR — ≥70% coverage)

- [x] Open `frontend/test/components/TaskRow.test.tsx` (already exists — add new test cases)
- [x] Add test: **Space on focused row triggers toggle**
- [x] Add test: **Space on focused row calls preventDefault**
- [x] Add test: **Escape in edit mode returns focus to row**
- [x] Add test: **Edit button becomes visible when focused**
- [x] Add test: **Delete button becomes visible when focused**
- [x] Open `frontend/test/components/AppHeader.test.tsx` (already exists — add new test case)
- [x] Add test: **Logout button has focus ring class**
- [x] Run: `cd frontend && npx vitest run` — all 183 tests pass

### Task 7: Verify all ACs pass — no regressions

- [x] Manual keyboard-only walkthrough (or dev notes):
  - [x] Tab from browser bar → Logout → InlineTaskInput → FilterBar buttons → SortDropdown → task `<li>` rows
  - [x] Press Space on a focused task row → checkbox toggles ✓
  - [x] Press Enter on a focused task row → edit mode ✓ → press Escape → focus returns to row ✓
  - [x] Tab to Edit (✎) button → button becomes visible ✓ → press Enter → edit mode ✓
  - [x] Tab to Delete (✕) button → button becomes visible ✓ → press Enter → confirmation strip appears ✓
  - [x] Tab to FilterBar "Active" button → press Space → `aria-pressed` becomes true ✓
- [x] Run `cd frontend && npx vitest run` — zero failures (183 tests pass)
- [ ] (Optional but recommended) Run `cd e2e && npx playwright test` against the full Docker stack

## Dev Notes

### Architecture Principles (Must Follow)

1. **No new state management** — all keyboard changes are pure event-handler additions; do NOT introduce new `useState` for keyboard management.
2. **`e.target === e.currentTarget` guard is mandatory** for the `<li>` `onKeyDown` handler — without it, Space on an inner `<button>` (e.g., the Edit button) would also trigger the parent row's toggle, causing double-action bugs.
3. **`useRef` pattern is already used in this component** — `inputRef` for the edit input already exists; add `rowRef` following the same pattern.
4. **Do NOT change `tabIndex` values** — the current `tabIndex={0}` on the `<li>` is correct. Do not add negative tabIndex to inner buttons (they must remain sequentially reachable).
5. **Focus ring colours must match design system** — `#00ff88` (vivid green on dark backgrounds) is the established focus/active colour throughout the app. Do not introduce new colours.
6. **`motion-safe:` prefix on all new transitions** — if adding any `transition` utility alongside new focus states, prefix with `motion-safe:`.

### File Structure — Changes Required

| File | Change Type | Detail |
|---|---|---|
| `frontend/src/components/TaskRow.tsx` | **Modify** | 3 changes: Space handler in `handleRowKeyDown`, `rowRef` + focus restore in `cancelEdit`, `focus:opacity-100` on Edit + Delete buttons |
| `frontend/src/components/AppHeader.tsx` | **Modify** | 1 change: add `focus:outline focus:outline-2 focus:outline-[#00ff88]` to Logout button |
| `frontend/src/components/InlineTaskInput.tsx` | **Modify** | 1 change: add `focus:bg-[#252525]` to task creation input |
| `frontend/test/components/TaskRow.test.tsx` | **Modify** | Add 4 new test cases |
| `frontend/test/components/AppHeader.test.tsx` | **Modify** | Add 1 new test case |

### Files Not to Modify

| File | Reason |
|---|---|
| `frontend/src/components/FilterBar.tsx` | All AC4 requirements already satisfied (native `<button>` handles Enter/Space; `aria-pressed` ✅; focus ring ✅) |
| `frontend/src/components/SortDropdown.tsx` | Native `<select>` with focus ring — keyboard-navigable by browser ✅ |
| `frontend/src/components/SubtaskPanel.tsx` | Subtask checkboxes and delete buttons are standard interactive elements with no keyboard gaps identified |
| `frontend/src/components/SkeletonTaskRow.tsx` | Purely presentational — no keyboard interaction required |
| Any backend file | Zero backend changes required for this story |
| `frontend/src/hooks/useTasks.ts` | No mutation logic changes needed |

### Key Implementation Detail: `rowRef` Pattern

```tsx
// In TaskRow, alongside existing inputRef:
const rowRef = useRef<HTMLLIElement>(null)

// On the <li> (add ref alongside existing tabIndex and onKeyDown):
<li
  ref={rowRef}
  tabIndex={0}
  className="group px-3 py-2 ..."
  onKeyDown={handleRowKeyDown}
>

// In cancelEdit():
const cancelEdit = () => {
  setEditValue(task.title)
  setEditError(null)
  setIsEditing(false)
  rowRef.current?.focus()  // ← AC3: return focus to row
}
```

### Key Implementation Detail: Complete `handleRowKeyDown` (after change)

```tsx
const handleRowKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
  // Space on the row (not editing, not confirming delete) toggles the checkbox
  if (e.key === ' ' && !isEditing && !isConfirmingDelete && e.target === e.currentTarget) {
    e.preventDefault() // suppress page scroll
    handleToggle()
    return
  }
  // Enter on the row (not editing, not confirming delete) enters edit mode
  if (e.key === 'Enter' && !isEditing && !isConfirmingDelete && e.target === e.currentTarget) {
    e.preventDefault()
    enterEditMode()
  }
}
```

### Focus Tab Order (Current — Already Logical)

The DOM ordering in `TaskListPage.tsx` already produces a logical left-to-right, top-to-bottom tab sequence:

```
1. AppHeader: [Logout button]
2. InlineTaskInput: [New task title input] → [Add button]
3. FilterBar: [All] [Active] [Done] [Has deadline] [label buttons...]
4. SortDropdown: [Sort <select>]
5. Task list: [task row <li>] × N  (each row contains sequentially: checkbox → title-or-input → edit button → delete button → labels → add-label → deadline button → subtask toggle)
```

This matches WCAG Success Criterion 2.4.3 (Focus Order — logical and meaningful). No DOM reordering is needed.

### WCAG Focus Ring Contrast Verification

| Element | Focus colour | Background | Contrast ratio | Meets 3:1? |
|---|---|---|---|---|
| Task row `<li>` | `#00ff88` left border | `#2a2a2a` adjacent border | ~8:1 | ✅ |
| Filter buttons | `#00ff88` outline | `#0f0f0f` page bg | ~8:1 | ✅ |
| Sort dropdown | `#00ff88` outline | `#111` bg | ~8:1 | ✅ |
| Logout button (after fix) | `#00ff88` outline | `#1c1c1c` header bg | ~8:1 | ✅ |
| Edit/Delete (after fix) | browser default + `focus:opacity-100` reveals them | — | visible | ✅ |

### Previous Story Learnings (from 5-2)

- **177 frontend unit tests exist** — all must pass after changes (test count should increase by ≥5 with new cases)
- **`motion-safe:` prefix** is established on all animation/transition classes — maintain this pattern
- **Pixel-art colour palette**: `#00ff88` (accent), `#0f0f0f` (bg), `#1c1c1c` (header/card), `#333`/`#2a2a2a` (borders), `#888`/`#666`/`#555` (muted text)
- **`useRef`** is already imported in `TaskRow.tsx` — just add `rowRef` alongside `inputRef`
- **Test pattern**: `@testing-library/react` + `vitest` + `userEvent` for interaction tests; mocking hooks with `vi.mock()`
- **Story 5.4** will audit full WCAG 2.1 AA — this story closes only the keyboard-navigation specific gaps

### Test Runner Commands

```bash
# Frontend unit tests (must all pass after changes)
cd frontend && npx vitest run

# E2E (requires full Docker stack via docker-compose up --build)
cd e2e && npx playwright test
```

### Scope Boundary

This story is scoped to **keyboard navigation only**:
- ✅ In scope: Tab order, Space/Enter/Escape key handling, focus ring visibility for keyboard users
- ❌ Out of scope: Full WCAG 2.1 AA audit (axe-core) → Story 5.4
- ❌ Out of scope: `prefers-reduced-motion` full audit → Story 5.4
- ❌ Out of scope: Colour contrast audit (beyond focus rings) → Story 5.4

### References

- FR29: All core flows operable via keyboard — [_bmad-output/planning-artifacts/epics.md — FR29](../../_bmad-output/planning-artifacts/epics.md)
- NFR10: All interactive elements keyboard navigable (Tab, Enter, Escape, Space) — [_bmad-output/planning-artifacts/epics.md — NFR10](../../_bmad-output/planning-artifacts/epics.md)
- UX spec keyboard-native path — [_bmad-output/planning-artifacts/epics.md — UX Design section](../../_bmad-output/planning-artifacts/epics.md)
- `handleRowKeyDown` current impl — [frontend/src/components/TaskRow.tsx](../../frontend/src/components/TaskRow.tsx)
- Filter button focus ring impl — [frontend/src/components/FilterBar.tsx](../../frontend/src/components/FilterBar.tsx)
- Previous story patterns and test count baseline — [_bmad-output/implementation-artifacts/5-2-performance-sub-second-state-reflection.md](./5-2-performance-sub-second-state-reflection.md)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot / Amelia Dev agent)

### Debug Log References

None — all tasks implemented cleanly on first pass. One test fix needed: added `waitFor` to async assertion for Space-key toggle test (mutation is async).

### Completion Notes List

- All 5 source code gaps closed as specified
- 6 new test cases added (5 in TaskRow.test.tsx, 1 in AppHeader.test.tsx)
- Total tests: 183 (up from 177) — all passing
- `e.target === e.currentTarget` guard preserved in Space handler
- `rowRef` pattern follows existing `inputRef` pattern in the same component

### File List

- `frontend/src/components/TaskRow.tsx`
- `frontend/src/components/AppHeader.tsx`
- `frontend/src/components/InlineTaskInput.tsx`
- `frontend/test/components/TaskRow.test.tsx`
- `frontend/test/components/AppHeader.test.tsx`
- `e2e/tests/keyboard-navigation.spec.ts`
- `_bmad-output/implementation-artifacts/5-3-full-keyboard-navigation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
