# Component Inventory — Frontend

> Part: `frontend` | Generated: 2026-02-27 | Scan: Quick

---

## Pages (Route Components)

These are top-level components rendered by React Router. They own data fetching (via hooks) and compose child components.

| Component | Route | Description |
|---|---|---|
| `LoginPage.tsx` | `/login` | Login form with email + password. Pre-fills email from localStorage after logout. Links to /register. |
| `RegisterPage.tsx` | `/register` | Registration form. On success, redirects to /login (or auto-login). |
| `TaskListPage.tsx` | `/` (protected) | Main view: header, filter bar, sort dropdown, task count, inline create, task list. Passes filter/sort state down to components. |

---

## Layout Components

| Component | Description | Key Props / Behavior |
|---|---|---|
| `AppHeader.tsx` | Top navigation bar | Shows app name + logged-in user email. Logout button triggers `useAuth().logout()`. |
| `ProtectedRoute.tsx` | Auth guard wrapper | Checks authentication via `useAuth()`. Redirects to `/login` if not authenticated. Wraps all protected routes. |
| `ErrorBoundary.tsx` | React error boundary | Catches render errors in the component tree. Displays a fallback error UI. |

---

## Task Components

| Component | Description | Key Props / Behavior |
|---|---|---|
| `TaskRow.tsx` | Single task list item | Props: `task` object. Contains: checkbox (toggle complete), editable title (click to edit), label chips, deadline badge, delete button, subtask toggle. |
| `InlineTaskInput.tsx` | Task creation input | Inline text field. Enter submits → calls `useTasks().createTask()`. Shows validation feedback on empty submit. |
| `SubtaskPanel.tsx` | Collapsible subtask list | Shown inside `TaskRow`. Add subtask input + list of subtask items (each with checkbox + delete). Managed via `useTasks()` or a dedicated subtask hook. |
| `TaskCountDisplay.tsx` | Completion count | Displays `"completed/total"` (e.g. `"3/5"`). Updates live on task toggle. |
| `SkeletonTaskRow.tsx` | Loading placeholder | Renders an animated placeholder row while tasks are fetching (shown during initial load). |
| `EmptyState.tsx` | Empty list message | Shown when the task list has no items (either no tasks or no filter matches). |

---

## Filter & Sort Components

| Component | Description | Key Props / Behavior |
|---|---|---|
| `FilterBar.tsx` | Filter controls row | Contains dropdowns/buttons for: status (all/todo/completed), label (select from user's labels), deadline (overdue/today/upcoming/all). Controlled by `TaskListPage` state. |
| `SortDropdown.tsx` | Sort order selector | Dropdown/select for sort criteria: created date, title (A–Z), deadline. Controlled by `TaskListPage` state. |

---

## Custom Hooks

| Hook | Description | Returns |
|---|---|---|
| `useAuth.ts` | Authentication state and actions | `{ user, isLoading, login(), logout(), register() }` |
| `useTasks.ts` | Task CRUD + mutations | `{ tasks, isLoading, createTask(), updateTask(), deleteTask(), toggleTask(), setDeadline(), addSubtask(), updateSubtask(), deleteSubtask() }` |
| `useLabels.ts` | Label management | `{ labels, isLoading, createLabel(), deleteLabel(), attachLabel(), detachLabel() }` |

All hooks use **TanStack Query** (`useQuery`, `useMutation`) internally for caching and background sync.

---

## Third-Party UI Primitives (Radix UI)

| Package | Primitive Used As |
|---|---|
| `@radix-ui/react-checkbox` | Task / subtask completion checkbox |
| `@radix-ui/react-dialog` | Modal dialogs (e.g. confirm delete) |
| `@radix-ui/react-dropdown-menu` | Sort, label filter dropdown menus |
| `@radix-ui/react-label` | Accessible form labels |
| `@radix-ui/react-separator` | Visual dividers |
| `@radix-ui/react-slot` | Polymorphic `asChild` pattern |
| `@radix-ui/react-toast` | Error / success toast notifications |

---

## Design System Utilities

| Utility | Package | Purpose |
|---|---|---|
| `cn()` | `clsx` + `tailwind-merge` | Conditional/merged Tailwind class composition |
| `cva()` | `class-variance-authority` | Variant-based component styling (button variants, etc.) |

---

## Accessibility Notes

- All interactive elements are keyboard-accessible (Tab, Enter, Space, Escape)
- Radix UI primitives provide ARIA roles and attributes automatically
- axe-core WCAG 2.1 AA validation runs in E2E tests (`accessibility.spec.ts`)
- `prefers-reduced-motion` is respected (animations conditionally applied)
