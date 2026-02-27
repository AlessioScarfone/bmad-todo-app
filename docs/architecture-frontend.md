# Architecture — Frontend (web)

> Part: `frontend` | Type: Web SPA | Generated: 2026-02-27 | Scan: Quick

---

## Executive Summary

The frontend is a **React 19 Single Page Application** built with Vite. It follows a component-based architecture with a clear separation between pages, reusable components, data-fetching hooks, and API utilities. Server state is managed entirely by **TanStack Query v5** (caching, background refetching, optimistic updates). Routing is handled by **React Router v7**.

---

## Technology Stack

| Category | Technology | Version | Notes |
|---|---|---|---|
| Framework | React | ^19.2.0 | Concurrent mode features in use |
| Build tool | Vite | via `@vitejs/plugin-react` | HMR in dev, Nginx in prod |
| Language | TypeScript | ~5.9.3 | Strict mode |
| Styling | Tailwind CSS | ^4.2.1 | v4 zero-config via PostCSS/Vite plugin |
| Headless components | Radix UI | various | Checkbox, Dialog, DropdownMenu, Label, Separator, Slot, Toast |
| Server state | TanStack Query | ^5.90.21 | Caching, mutation, optimistic updates |
| Routing | React Router | ^7.13.1 | Client-side SPA routing |
| Unit testing | Vitest | ^4.0.18 | |
| Component testing | @testing-library/react | ^16.3.2 | |
| User event simulation | @testing-library/user-event | ^14.6.1 | |
| DOM assertions | @testing-library/jest-dom | ^6.9.1 | |
| Test environment | jsdom | ^26.1.0 | |

---

## Architecture Pattern

**Component-based SPA with server-state management (TanStack Query):**

```
main.tsx (entry)
  └─ App.tsx (providers: QueryClient, Router)
       ├─ /login         → LoginPage.tsx
       ├─ /register      → RegisterPage.tsx
       └─ / (protected)  → TaskListPage.tsx
            ├─ AppHeader
            ├─ FilterBar
            ├─ SortDropdown
            ├─ TaskCountDisplay
            ├─ InlineTaskInput (create)
            ├─ TaskRow (× n)
            │    └─ SubtaskPanel (expandable)
            ├─ EmptyState (conditional)
            └─ SkeletonTaskRow (loading state)
```

---

## Source Structure

```
frontend/src/
├── main.tsx              # Entry point — mounts React root, wraps with QueryClientProvider + RouterProvider
├── App.tsx               # Root component — defines routes and global providers
├── App.css               # Global CSS overrides
├── index.css             # Tailwind base imports
│
├── pages/                # Route-level page components (one per URL)
│   ├── LoginPage.tsx     # Login form, email pre-fill on return
│   ├── RegisterPage.tsx  # Registration form
│   └── TaskListPage.tsx  # Main task management view (protected)
│
├── components/           # Reusable UI components
│   ├── AppHeader.tsx         # Top navigation bar (user info, logout)
│   ├── EmptyState.tsx        # Shown when task list is empty
│   ├── ErrorBoundary.tsx     # React error boundary wrapper
│   ├── FilterBar.tsx         # Filter controls (label, status, deadline)
│   ├── InlineTaskInput.tsx   # Inline task creation input
│   ├── ProtectedRoute.tsx    # Route guard (redirects to /login if unauthenticated)
│   ├── SkeletonTaskRow.tsx   # Loading skeleton for task rows
│   ├── SortDropdown.tsx      # Sort order selector
│   ├── SubtaskPanel.tsx      # Collapsible subtask list within a task row
│   ├── TaskCountDisplay.tsx  # Shows "completed/total" count
│   └── TaskRow.tsx           # Single task row (complete, edit title, delete, labels, deadline)
│
├── hooks/                # Custom React hooks (data + auth)
│   ├── useAuth.ts        # Authentication state (user, login, logout, register)
│   ├── useLabels.ts      # Label CRUD queries and mutations
│   └── useTasks.ts       # Task CRUD queries and mutations (incl. subtasks, deadlines)
│
├── lib/                  # Shared utilities
│   └── (API client utilities, helpers)
│
├── types/                # TypeScript interfaces and types
│   └── (Task, Label, Subtask, User types)
│
└── assets/               # Static assets
```

---

## State Management

| State type | Solution | Details |
|---|---|---|
| Server state (tasks, labels) | TanStack Query v5 | Query caching, background refetch, optimistic mutations |
| Auth state | `useAuth` hook (React context or local state) | JWT managed server-side via cookie |
| UI state (filter, sort, modals) | Local component state (`useState`) | Filter/sort state in `TaskListPage` |

### Optimistic Updates
Mutations (create task, toggle complete, edit title, delete) use TanStack Query's `onMutate`/`onError`/`onSettled` pattern for sub-second UI feedback without waiting for network response.

---

## Routing

```
/           → TaskListPage (protected via ProtectedRoute)
/login      → LoginPage
/register   → RegisterPage
```

`ProtectedRoute` wraps authenticated routes; unauthenticated users are redirected to `/login`.

---

## Authentication Flow

1. User submits login form → `POST /auth/login` → server sets HttpOnly JWT cookie
2. All subsequent API requests include the cookie automatically (credentials: include)
3. On app load, `useAuth` calls a `/auth/me` or similar endpoint to verify session
4. Logout → `POST /auth/logout` → server clears cookie → redirect to `/login`
5. Email pre-fill: last used email is stored in `localStorage`/sessionStorage and pre-populated on `/login` after logout

---

## API Communication

- **Base URL:** `http://localhost:3001` (dev) / auto-detected from same origin via proxy or env var (prod)
- **Protocol:** REST over HTTP (JSON body)
- **Credentials:** `fetch` calls use `credentials: 'include'` so cookies are sent
- **Error handling:** TanStack Query's `onError` + toast notifications (Radix UI Toast)

---

## Component Design Patterns

| Pattern | Usage |
|---|---|
| Radix UI headless primitives | Checkbox, Dialog, DropdownMenu, Toast — unstyled, accessible |
| Tailwind utility classes | All visual styling (no CSS modules) |
| Compound component pattern | TaskRow + SubtaskPanel (parent owns expand state) |
| Container/Presenter | Pages fetch data via hooks; components receive props |
| Skeleton loading | `SkeletonTaskRow` replaces actual rows during initial data load |

---

## Accessibility

- **WCAG 2.1 AA** compliance target
- Radix UI primitives provide ARIA attributes out of the box
- `@axe-core/playwright` validates accessibility during E2E tests
- Full **keyboard navigation** support (Tab/Enter/Escape flows)
- **`prefers-reduced-motion`** media query respected in animations

---

## Testing

| Layer | Tool | Location |
|---|---|---|
| Unit / component | Vitest + Testing Library | `frontend/test/` |
| E2E (full stack) | Playwright | `e2e/tests/` |

```bash
# Unit tests
cd frontend && npm test

# Watch mode
npm run test:watch
```

---

## Build & Production

The production image is built via `frontend/Dockerfile` and served by **Nginx** on port 80. Vite outputs a static bundle (`dist/`) which Nginx serves with HTML5 history-API fallback (`try_files $uri /index.html`).

```
docker build -t bmad-todo-frontend ./frontend
# or via Docker Compose:
docker-compose up --build web
```
