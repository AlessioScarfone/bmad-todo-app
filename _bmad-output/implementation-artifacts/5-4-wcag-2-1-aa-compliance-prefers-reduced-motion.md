# Story 5.4: WCAG 2.1 AA Compliance & `prefers-reduced-motion`

Status: done

## Story

As a user with accessibility needs,
I want the application to meet WCAG 2.1 AA standards with no critical violations,
So that I can use the app regardless of how I interact with technology.

## Acceptance Criteria

**AC1 — Zero automated WCAG violations:**
- **Given** the app is rendered with a logged-in user
- **When** an automated WCAG audit is run via axe-core
- **Then** zero WCAG 2.1 AA critical violations are reported

**AC2 — ARIA attributes complete and correct:**
- **Given** all interactive elements are rendered
- **When** I inspect them
- **Then** the following are verified:
  - Checkboxes: `aria-label="Mark [task title] as done"` (or "as not done")
  - Subtask panel trigger: `aria-expanded={subtasksOpen}`
  - Filter buttons: `aria-pressed={isActive}`
  - Empty state region: `aria-live="polite"`
  - Task count display: `aria-label="Tasks completed: N of M"` with `aria-live="polite"`
  - All inline error divs: `role="alert"`

**AC3 — `prefers-reduced-motion` disables all transitions:**
- **Given** a user has `prefers-reduced-motion: reduce` enabled in their OS
- **When** the app renders
- **Then** all CSS transitions are suppressed (Tailwind `motion-safe:` variant used — transitions only apply when `prefers-reduced-motion: no-preference`)

**AC4 — Color contrast meets WCAG AA thresholds:**
- **Given** color contrast is evaluated across the pixel-art theme
- **When** measured against WCAG AA thresholds
- **Then** all text meets 4.5:1 (normal/small text) and 3:1 (large text / UI component boundaries)

## Current Codebase State — Pre-Story Audit

> ⚠️ **Critical context for the dev agent**: Read this entire section before touching any code. Many AC items are already satisfied. Only the specific gaps listed below need implementation.

### ✅ Already Implemented — Do NOT re-implement

| Requirement | File | Status |
|---|---|---|
| `aria-label="Tasks completed: N of M"` + `aria-live="polite"` | `TaskCountDisplay.tsx` | ✅ |
| `aria-live="polite"` on empty state region | `EmptyState.tsx` | ✅ |
| `aria-pressed` on filter buttons | `FilterBar.tsx` | ✅ |
| `motion-safe:transition-colors` on filter buttons | `FilterBar.tsx` | ✅ |
| `aria-expanded` on subtask panel trigger | `TaskRow.tsx` | ✅ |
| `aria-label="Mark [title] as done/not done"` on task checkbox | `TaskRow.tsx` | ✅ |
| `role="alert"` on all inline errors (edit, delete, toggle, label, deadline) | `TaskRow.tsx` | ✅ |
| `motion-safe:transition-colors`, `motion-safe:transition-opacity`, `motion-safe:transition-all` throughout | multiple | ✅ |
| `role="alert"` on validation + network errors | `InlineTaskInput.tsx` | ✅ |
| `motion-safe:transition-colors` on Add button | `InlineTaskInput.tsx` | ✅ |
| `focus:outline focus:outline-2 focus:outline-[#00ff88]` on logout button | `AppHeader.tsx` | ✅ |
| `focus:bg-[#252525]` on new-task input (replacement for outline-none) | `InlineTaskInput.tsx` | ✅ |
| Focus ring on filter buttons (`focus:outline focus:outline-1 focus:outline-[#00ff88]`) | `FilterBar.tsx` | ✅ |
| Focus ring on sort dropdown | `SortDropdown.tsx` | ✅ |
| `aria-label` on subtask checkboxes | `SubtaskPanel.tsx` | ✅ |
| `role="list"` + `aria-label="Subtasks"` on subtask container | `SubtaskPanel.tsx` | ✅ |

### ❌ Gaps That Story 5.4 Must Close

All gaps are **color contrast violations** and **missing axe-core automated test**:

| Gap | File | Violation | Current Value | Fix |
|---|---|---|---|---|
| Empty state text contrast | `EmptyState.tsx` | 2.76:1 on `#0f0f0f` bg (need 4.5:1) | `text-[#555]` | → `text-[#888]` |
| Inactive filter button text contrast | `FilterBar.tsx` | 3.42:1 on `#0f0f0f` bg (need 4.5:1) | `text-[#666]` | → `text-[#888]` |
| Inactive filter button border contrast | `FilterBar.tsx` | 1.41:1 on `#0f0f0f` bg (need 3:1 for UI boundary) | `border-[#333]` | → `border-[#555]` |
| Inactive filter button hover text contrast | `FilterBar.tsx` | 3.42:1 (hover: `text-[#aaa]` = 8.2:1 ✅) | `hover:border-[#555]` is fine | OK |
| Subtask toggle button text contrast | `TaskRow.tsx` | 2.40:1 on `#1c1c1c` bg (need 4.5:1) | `text-[#555]` on toggle `▼/▲ Subtasks` | → `text-[#888]` |
| Completed subtask title contrast | `SubtaskPanel.tsx` | 3.24:1 on `#1c1c1c` bg (need 4.5:1) | `text-[#666]` | → `text-[#888]` |
| Subtask delete button contrast | `SubtaskPanel.tsx` | 2.40:1 on `#1c1c1c` bg (need 4.5:1) | `text-[#555]` | → `text-[#888]` |
| axe-core automated test | missing | No WCAG audit in CI/test suite | N/A | Add `e2e/tests/accessibility.spec.ts` |

### Contrast Calculation Reference

The page background is `#0f0f0f` (`TaskListPage` → `min-h-screen bg-[#0f0f0f]`).
Task rows have `bg-[#1c1c1c]`.
All text in Tailwind's color palette must be computed against the adjacent background.

| Color pair | Contrast | WCAG small text (4.5:1) | WCAG UI (3:1) |
|---|---|---|---|
| `#555` on `#0f0f0f` | 2.76:1 | ❌ | ❌ |
| `#666` on `#0f0f0f` | 3.42:1 | ❌ | ✅ |
| `#888` on `#0f0f0f` | 5.39:1 | ✅ | ✅ |
| `#666` on `#1c1c1c` | 3.24:1 | ❌ | ✅ |
| `#555` on `#1c1c1c` | 2.40:1 | ❌ | ❌ |
| `#888` on `#1c1c1c` | 4.68:1 | ✅ | ✅ |
| `#333` on `#0f0f0f` | 1.41:1 | ❌ | ❌ |
| `#555` on `#0f0f0f` | 2.76:1 | ❌ | ❌ |
| `#666` on `#0f0f0f` (border) | 3.42:1 | — | ✅ |
| `#f0f0f0` on `#0f0f0f` | 19.1:1 | ✅ | ✅ |
| `#00ff88` on `#0f0f0f` | 13.7:1 | ✅ | ✅ |

## Tasks / Subtasks

### Task 1: Fix color contrast — `EmptyState.tsx` (AC4)

- [x] Open `frontend/src/components/EmptyState.tsx`
- [x] Change `text-[#555]` → `text-[#888]` on the `<p>` element
  ```tsx
  <p className="font-pixel text-[8px] text-[#888] leading-loose">
  ```
- [x] Verify: `#888` on `#0f0f0f` = 5.39:1 ✅

### Task 2: Fix color contrast — `FilterBar.tsx` (AC4)

- [x] Open `frontend/src/components/FilterBar.tsx`
- [x] Locate the `FilterButton` component's inactive class string:
  ```
  'border-[#333] text-[#666] hover:border-[#555] hover:text-[#aaa]'
  ```
- [x] Update to:
  ```
  'border-[#555] text-[#888] hover:border-[#777] hover:text-[#ccc]'
  ```
  Rationale: `border-[#555]` on `#0f0f0f` = 2.76:1 — still under 3:1 for non-text UI boundary. Upgrade to `border-[#666]` for 3:1. Wait — calculated above: `#666` on `#0f0f0f` = 3.42:1 ✅
  
  **Correct final change:**
  ```
  'border-[#666] text-[#888] hover:border-[#888] hover:text-[#ccc]'
  ```
- [x] Verify the active button state is unchanged:
  `'border-[#00ff88] text-[#00ff88] bg-[#0a2a1a]'` — all high contrast, unchanged ✅

### Task 3: Fix color contrast — `TaskRow.tsx` subtask toggle (AC4)

- [x] Open `frontend/src/components/TaskRow.tsx`
- [x] Locate the subtask toggle `<button>` near the bottom of the JSX (renders `▼/▲ Subtasks`):
  ```tsx
  className="text-[11px] text-[#555] hover:text-[#00ff88] font-mono"
  ```
- [x] Change `text-[#555]` → `text-[#888]`:
  ```tsx
  className="text-[11px] text-[#888] hover:text-[#00ff88] font-mono"
  ```
- [x] Verify: `#888` on `#1c1c1c` = 4.68:1 ✅

### Task 4: Fix color contrast — `SubtaskPanel.tsx` (AC4)

- [x] Open `frontend/src/components/SubtaskPanel.tsx`
- [x] Locate the completed subtask `<span>` — fix `text-[#666]` → `text-[#888]`:
  ```tsx
  subtask.isCompleted
    ? 'line-through text-[#888] text-[12px] font-mono'
    : 'text-[12px] font-mono text-[#d0d0d0]'
  ```
- [x] Locate the delete subtask `<button>` — fix `text-[#555]` → `text-[#888]`:
  ```tsx
  className="ml-auto text-[#888] hover:text-red-400 text-xs"
  ```
- [x] Verify: `#888` on `#1c1c1c` = 4.68:1 ✅

### Task 5: Add axe-core automated accessibility E2E test (AC1)

- [x] Install `@axe-core/playwright` into e2e package:
  ```bash
  cd e2e && npm install --save-dev @axe-core/playwright
  ```
- [x] Create `e2e/tests/accessibility.spec.ts`:
  ```ts
  import { test, expect } from '@playwright/test'
  import AxeBuilder from '@axe-core/playwright'
  import { loginAs } from '../helpers/auth'

  test.describe('WCAG 2.1 AA accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'accessibility@test.com', 'password123')
    })

    test('task list page has zero WCAG 2.1 AA violations', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('login page has zero WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/login')
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('register page has zero WCAG 2.1 AA violations', async ({ page }) => {
      await page.goto('/register')
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
      expect(accessibilityScanResults.violations).toEqual([])
    })
  })
  ```
- [x] Check `e2e/helpers/auth.ts` for the `loginAs` helper signature and adapt if the function name differs (uses `registerAndLogin`)
- [x] Run the E2E suite and fix any axe violations surfaced (these would be in addition to the color contrast fixes above)

### Task 6: Add frontend Vitest unit test for key ARIA attributes (AC2)

- [x] Create `frontend/test/components/accessibility.test.tsx`
- [x] Test that `TaskCountDisplay` renders with correct `aria-label` and `aria-live`:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import { describe, it, expect } from 'vitest'
  import { TaskCountDisplay } from '../../src/components/TaskCountDisplay'

  describe('TaskCountDisplay accessibility', () => {
    it('renders with aria-label and aria-live="polite"', () => {
      render(<TaskCountDisplay completed={3} total={5} />)
      const el = screen.getByText('3/5')
      expect(el).toHaveAttribute('aria-label', 'Tasks completed: 3 of 5')
      expect(el).toHaveAttribute('aria-live', 'polite')
    })
  })
  ```
- [x] Test that `EmptyState` renders with `aria-live="polite"`:
  ```tsx
  import { EmptyState } from '../../src/components/EmptyState'

  describe('EmptyState accessibility', () => {
    it('has aria-live="polite" on the region', () => {
      const { container } = render(<EmptyState />)
      const region = container.firstChild as HTMLElement
      expect(region).toHaveAttribute('aria-live', 'polite')
    })
  })
  ```

### Task 7: Verify `prefers-reduced-motion` coverage (AC3)

- [x] Grep for any `transition-` CSS in `frontend/src/` that is NOT prefixed with `motion-safe:`
- [x] Found: `RegisterPage.tsx` submit button had bare `transition-[transform,box-shadow]` — added `motion-reduce:transition-none` to match `LoginPage.tsx` pattern
- [x] Confirmed `index.css` has no unconditional CSS transitions
- [x] All other occurrences already use `motion-safe:` correctly

## Dev Notes

### Architecture Patterns & Critical Rules

- **All component edits** follow the naming and structure in `frontend/src/components/` — no new components needed
- **No inline styles** — all visual changes use Tailwind utility classes only (`cn()` helper from `clsx`/`tailwind-merge` if conditional)
- **No new global CSS** — no changes to `index.css` needed; contrast fixes are Tailwind utility class swaps only
- **Tailwind `motion-safe:` vs `motion-reduce:`**: The project uses `motion-safe:transition-*` which applies transitions ONLY when `prefers-reduced-motion: no-preference`. This is semantically equivalent to `motion-reduce:transition-none` but more concise. Do NOT change this pattern.
- **Backend is untouched** — this story is purely frontend (components + E2E test)

### Project Structure Notes

- E2E tests live in `e2e/tests/*.spec.ts` — new file `accessibility.spec.ts` goes there
- Frontend unit tests live in `frontend/test/components/*.test.tsx` — new file `accessibility.test.tsx` goes there
- The `e2e/helpers/auth.ts` file contains the `loginAs(page, email, password)` helper — reuse it
- `@axe-core/playwright` is installed in the `e2e/` package, NOT in `frontend/` or the root

### Color System Reference

Page background: `bg-[#0f0f0f]` (TaskListPage wrapper)  
Task row background: `bg-[#1c1c1c]` (TaskRow `<li>`)  
Primary green: `#00ff88`  
Primary text: `#f0f0f0`  
Safe subdued text (≥ 4.5:1 on both backgrounds): `#888` onwards  
Avoid for small text: `#555`, `#666` (both fail on both page and task-row backgrounds)

### What axe-core Checks At Runtime

axe-core tests rendered DOM so it will catch:
- Contrast failures (image of text is excluded — only foreground/background text)
- Missing ARIA labels
- Invalid ARIA usage
- Focus order issues
- Missing landmarks (`<main>`, `<header>`)

Note: The page already has `<header>` (AppHeader) and `<main>` (TaskListPage) landmarks ✅

### Previous Story Learnings (from Story 5.3)

- All keyboard fixes (Space toggle, Escape focus return, opacity-0 edit/delete buttons fixed with `focus:opacity-100`) were completed in Story 5.3 — do NOT re-implement
- `AppHeader.tsx` already has `focus:outline focus:outline-2 focus:outline-[#00ff88]` on logout button — verified in 5.3
- `rowRef` and `cancelEdit()` focus-return were implemented in 5.3

### References

- WCAG 2.1 AA contrast requirements: [4.5:1 normal text, 3:1 large text/UI components] — [Source: _bmad-output/planning-artifacts/epics.md#Story 5.4]
- NFR9: WCAG 2.1 AA compliance — zero critical violations — [Source: _bmad-output/planning-artifacts/epics.md#NFR9]
- `prefers-reduced-motion` handling: `motion-safe:` Tailwind variant — [Source: _bmad-output/project-context.md#Radix UI + Tailwind CSS]
- ARIA attributes design: `aria-label`, `aria-live`, `aria-pressed`, `aria-expanded`, `role="alert"` — [Source: _bmad-output/planning-artifacts/epics.md#From UX Design]
- axe-core Playwright integration: `@axe-core/playwright` npm package

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5 (bmad-auto-agent Single Process mode)

### Debug Log References

### Completion Notes List

- Story created 2026-02-27 by Auto-Alessio (Bob/SM persona, Single Process mode)
- Story implemented 2026-02-27 by Auto-Alessio (Amelia/Dev persona, Single Process mode)
- Story code-reviewed 2026-02-27 by Auto-Alessio (Amelia/Dev adversarial review, Single Process mode)
- Comprehensive pre-story audit completed — 7 color contrast gaps identified, all fixed
- Found additional gap during Task 7: `RegisterPage.tsx` missing `motion-reduce:transition-none` — added to match `LoginPage.tsx`
- `@axe-core/playwright` installed in e2e package (3 packages added, 0 vulnerabilities)
- 5 new E2E accessibility tests created in `e2e/tests/accessibility.spec.ts`
- 5 new Vitest unit tests created in `frontend/test/components/accessibility.test.tsx`
- All 188 frontend unit tests pass (0 regressions), TypeScript clean

**Code Review Findings (all auto-fixed):**
- HIGH: `RegisterPage.tsx` password hint `text-[#555]` on `#1c1c1c` (2.40:1) → fixed to `text-[#888]` (4.68:1)
- HIGH: `TaskListPage.tsx` filter empty state `text-[#555]` on `#0f0f0f` (2.76:1) → fixed to `text-[#888]` (5.39:1)
- HIGH: `ErrorBoundary.tsx` error detail `text-[#555]` on `#0f0f0f` (2.76:1) → fixed to `text-[#888]` (5.39:1)
- HIGH: `SubtaskPanel.tsx` "No subtasks yet" `text-[#555]` on `#1c1c1c` (2.40:1) → fixed to `text-[#888]` (4.68:1)
- MEDIUM: `TaskRow.tsx` remove deadline `×` button `text-[#666]` on `#1c1c1c` (3.24:1) → fixed to `text-[#888]` (4.68:1)
- MEDIUM: `TaskRow.tsx` set deadline `📅` button `text-[#666]` on `#1c1c1c` (3.24:1) → fixed to `text-[#888]` (4.68:1)
- MEDIUM: E2E `prefers-reduced-motion` test queried `ul li` on empty account → task created first + header button fallback
- MEDIUM: E2E empty task list axe test didn't await stable state → added `expect(getByText(/no tasks yet/i)).toBeVisible()`
- LOW: Unused `TEST_PASSWORD` import in `accessibility.spec.ts` → removed

### File List

Files MODIFIED:
- `frontend/src/components/EmptyState.tsx` — `text-[#555]` → `text-[#888]`
- `frontend/src/components/FilterBar.tsx` — inactive button `text-[#666]` → `text-[#888]`, `border-[#333]` → `border-[#666]`
- `frontend/src/components/TaskRow.tsx` — subtask toggle `text-[#555]` → `text-[#888]`; remove deadline `text-[#666]` → `text-[#888]`; set deadline `text-[#666]` → `text-[#888]`
- `frontend/src/components/SubtaskPanel.tsx` — completed title `text-[#666]` → `text-[#888]`; delete btn `text-[#555]` → `text-[#888]`; "No subtasks yet" `text-[#555]` → `text-[#888]`
- `frontend/src/pages/RegisterPage.tsx` — `motion-reduce:transition-none` added to submit button; password hint `text-[#555]` → `text-[#888]`
- `frontend/src/pages/TaskListPage.tsx` — filter empty state `text-[#555]` → `text-[#888]`
- `frontend/src/components/ErrorBoundary.tsx` — error detail `text-[#555]` → `text-[#888]`

Files CREATED:
- `e2e/tests/accessibility.spec.ts` — 6 axe-core WCAG 2.1 AA E2E tests + prefers-reduced-motion test
- `frontend/test/components/accessibility.test.tsx` — 5 ARIA unit tests

Packages INSTALLED:
- `@axe-core/playwright` (into `e2e/package.json`)
