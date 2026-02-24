# Story 1.4: Email Pre-fill on Return & Logout

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a returning user,
I want my email address pre-filled on the login form and a clear way to log out,
So that return visits require minimal friction and I can end my session when needed.

## Acceptance Criteria

**AC1 — Email saved on successful login:**
- **Given** I successfully log in
- **When** my session is established
- **Then** my email address is stored in `localStorage` under key `bmad_todo_email`

**AC2 — Email pre-filled on return visit:**
- **Given** I navigate to the login page on a return visit
- **When** the page loads
- **Then** the email field is pre-filled with the value from `localStorage` (if present)
- **And** the password field is empty and focused (even when email is pre-filled)

**AC3 — Logout clears session and localStorage:**
- **Given** I am authenticated and click the logout button
- **When** `POST /api/auth/logout` is called
- **Then** the server clears the JWT cookie (sets it as expired / `Max-Age=0`)
- **And** the client calls `clearSavedEmail()` removing `bmad_todo_email` from `localStorage`
- **And** the TanStack Query cache is cleared
- **And** I am redirected to the login page

**AC4 — Logout is idempotent:**
- **Given** the logout API is called
- **When** it processes (regardless of whether a valid cookie is present)
- **Then** it returns `200 OK`
- **And** no error is thrown if the cookie was already absent

## Tasks / Subtasks

- [ ] **Task 1: Backend — `POST /auth/logout` route** (AC: AC3, AC4)
  - [ ] 1.1 Add `POST /auth/logout` to the **existing** `backend/src/routes/auth.ts` plugin — same file as `POST /auth/register` and `POST /auth/login` (from Story 1.3). Append inside the same `async (fastify, opts) => {}` block:
    ```typescript
    f.post('/auth/logout', async (_req, reply) => {
      return reply
        .clearCookie('token', { path: '/' })
        .status(200)
        .send({ message: 'Logged out' })
    })
    ```
  - [ ] 1.2 **No `preHandler: [fastify.authenticate]` on logout** — the route must be reachable even when the cookie is absent or expired (idempotent per AC4). Clearing a non-existent cookie is harmless.
  - [ ] 1.3 The `clearCookie` call must use `path: '/'` — same path as `setCookie` in `POST /auth/login`. Mismatched paths cause the cookie to persist in the browser.
  - [ ] 1.4 Verify TypeScript compiles: `cd backend && npx tsc --noEmit`

- [ ] **Task 2: Backend — integration test for logout** (AC: AC3, AC4)
  - [ ] 2.1 Extend `backend/test/routes/auth.test.ts` (existing file from Stories 1.2 & 1.3) with:
    - `POST /api/auth/logout` with valid session cookie → `200 OK`, response sets `Set-Cookie: token=; Max-Age=0` (cookie cleared)
    - `POST /api/auth/logout` with no cookie → `200 OK` (idempotent — no error)
    - `POST /api/auth/logout` with tampered cookie → `200 OK` (idempotent — no auth check)
  - [ ] 2.2 Test cookie-cleared assertion — the response `Set-Cookie` header should contain `Max-Age=0` or the cookie value should be empty:
    ```typescript
    const logoutRes = await app.inject({ method: 'POST', url: '/api/auth/logout' })
    expect(logoutRes.statusCode).toBe(200)
    const setCookie = logoutRes.headers['set-cookie'] as string
    expect(setCookie).toMatch(/Max-Age=0|expires=.*1970/)
    ```
  - [ ] 2.3 Run `npm test` — **all** previous tests (migrate, register, login, me) plus new logout tests must pass

- [ ] **Task 3: Frontend — `LoginPage.tsx` — email pre-fill & saveEmail** (AC: AC1, AC2)
  - [ ] 3.1 Import helpers at top of `frontend/src/pages/LoginPage.tsx`:
    ```typescript
    import { getSavedEmail, saveEmail } from '../lib/auth'
    ```
  - [ ] 3.2 Initialise the email state with the saved value:
    ```typescript
    const [email, setEmail] = useState(() => getSavedEmail() ?? '')
    ```
    Using the lazy initialiser form ensures `localStorage` is only read once on mount.
  - [ ] 3.3 After successful login API call (before calling `navigate('/')`), save the email:
    ```typescript
    saveEmail(email)
    navigate('/')
    ```
    This must happen **on success only** — do NOT save on failed login attempts.
  - [ ] 3.4 Focus the password field on mount, even when email is pre-filled. Use a `ref` + `useEffect`:
    ```typescript
    const passwordRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      passwordRef.current?.focus()
    }, [])
    ```
    Attach `ref={passwordRef}` to the password `<input>`. This satisfies AC2's requirement that the password field is focused.
  - [ ] 3.5 Verify: if `localStorage` has no `bmad_todo_email` key, the email field renders empty and focused per normal (Story 1.3 behaviour). If the key exists, email pre-filled, password focused.
  - [ ] 3.6 Verify TypeScript compiles: `cd frontend && npx tsc --noEmit`

- [ ] **Task 4: Frontend — `AppHeader.tsx` component (NEW)** (AC: AC3)
  - [ ] 4.1 Create `frontend/src/components/AppHeader.tsx`:
    ```tsx
    import { useNavigate } from 'react-router-dom'
    import { useQueryClient } from '@tanstack/react-query'
    import { clearSavedEmail } from '../lib/auth'
    import { api } from '../lib/api'

    interface AppHeaderProps {
      userEmail?: string
    }

    export function AppHeader({ userEmail }: AppHeaderProps) {
      const navigate = useNavigate()
      const queryClient = useQueryClient()
      const [isLoggingOut, setIsLoggingOut] = useState(false)

      async function handleLogout() {
        setIsLoggingOut(true)
        try {
          await api.post('/auth/logout', {})
        } catch {
          // Logout is best-effort — proceed even if the API call fails
        } finally {
          clearSavedEmail()
          queryClient.clear()
          navigate('/login', { replace: true })
        }
      }

      return (
        <header className="flex items-center justify-between px-6 py-3 border-b-4 border-black bg-white">
          <h1 className="font-['Press_Start_2P'] text-sm">bmad-todo</h1>
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="font-['Press_Start_2P'] text-xs text-gray-500 hidden sm:block" aria-label={`Logged in as ${userEmail}`}>
                {userEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Log out"
              className="font-['Press_Start_2P'] text-xs px-3 py-2 border-2 border-black bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px"
            >
              {isLoggingOut ? '...' : 'Logout'}
            </button>
          </div>
        </header>
      )
    }
    ```
  - [ ] 4.2 `useState` import — add to the React import at the top of the file:
    ```tsx
    import { useState } from 'react'
    ```
  - [ ] 4.3 **Logout is best-effort**: the `try/catch` in `handleLogout` intentionally proceeds through `finally` even if the API call fails (network down). The client-side cleanup (`clearSavedEmail`, `queryClient.clear`, `navigate`) always runs — preventing stale UI state.
  - [ ] 4.4 **No task count display in this story** — the `<TaskCountDisplay>` component belongs to Story 2.3. Leave a comment placeholder if desired but do not implement it here.
  - [ ] 4.5 Verify pixel-art aesthetic is consistent with `LoginPage` and `RegisterPage` — `Press_Start_2P` font, border-2/border-4, black borders, no rounded corners.

- [ ] **Task 5: Frontend — integrate `AppHeader` into `TaskListPage.tsx`** (AC: AC3)
  - [ ] 5.1 Modify `frontend/src/pages/TaskListPage.tsx` to render `<AppHeader>`:
    ```tsx
    import { AppHeader } from '../components/AppHeader'
    import { useAuth } from '../hooks/useAuth'

    export default function TaskListPage() {
      const { user } = useAuth()

      return (
        <div className="min-h-screen bg-gray-50">
          <AppHeader userEmail={user?.email} />
          <main className="max-w-2xl mx-auto px-4 py-8">
            <p className="font-['Press_Start_2P'] text-sm text-center text-gray-400">
              Task list — coming in Epic 2
            </p>
          </main>
        </div>
      )
    }
    ```
  - [ ] 5.2 `useAuth()` hook must already exist (created in Story 1.3). If Story 1.3 is not yet done, implement it first per the Story 1.3 file before starting this task.
  - [ ] 5.3 Verify TypeScript compiles: `cd frontend && npx tsc --noEmit`

- [ ] **Task 6: Frontend — end-to-end logout flow verification** (AC: AC1, AC2, AC3, AC4)
  - [ ] 6.1 Manual smoke test (Docker Compose stack running):
    1. Register or login → verify `bmad_todo_email` is set in `localStorage` (DevTools → Application → Local Storage)
    2. Reload app → verify auto-redirected back to task list (session persists)
    3. Open a new tab → navigate to `http://localhost:3000/login` → verify email field is pre-filled and password field is focused
    4. Click logout → verify redirect to `/login`, `bmad_todo_email` is removed from `localStorage`, `token` cookie is cleared
    5. Navigate to `http://localhost:3000/` → verify redirect to `/login` (no stale session)
  - [ ] 6.2 Run existing backend tests to ensure no regression: `cd backend && npm test`
  - [ ] 6.3 Run frontend TypeScript check: `cd frontend && npx tsc --noEmit`

## Dev Notes

### Dependency on Story 1.3

> ⚠️ **Story 1.4 builds directly on Story 1.3.** Before implementing this story, verify the following from Story 1.3 are in place:

| Requirement | Location | Status check |
|---|---|---|
| `POST /auth/login` route | `backend/src/routes/auth.ts` | Returns 200 + sets `token` httpOnly cookie |
| `GET /auth/me` route | `backend/src/routes/auth.ts` | Returns `{ id, email }` with `authenticate` preHandler |
| `fastify.authenticate` decorator | `backend/src/server.ts` | Declared via `fastify.decorate()` inside `buildServer()` |
| `useAuth` hook | `frontend/src/hooks/useAuth.ts` | Uses `useQuery(['auth', 'me'])` |
| `ProtectedRoute` component | `frontend/src/components/ProtectedRoute.tsx` | Wraps `TaskListPage` in `main.tsx` |
| `LoginPage.tsx` full implementation | `frontend/src/pages/LoginPage.tsx` | Controlled form, inline errors, navigate('/') on success |
| `QueryClientProvider` in `main.tsx` | `frontend/src/main.tsx` | Wraps router with `<QueryClientProvider client={queryClient}>` |

If any of the above is missing, implement Story 1.3 in full before starting Story 1.4.

---

### Previous Story Intelligence (Stories 1.1–1.3)

**From Story 1.1 (always applies):**
1. **ESM `.js` extensions** — all internal TypeScript imports use `.js` extension: `import { ... } from '../lib/auth.js'` (backend). Frontend uses Vite bundler so no `.js` extension needed in `.tsx` files.
2. **`buildServer(jwtSecret, sqlOverride?)` pattern** — `server.ts` exports `buildServer()` accepting optional `sqlOverride` for test injection. Do not change this signature.
3. **Testcontainers Colima env** — `npm test` already includes `TESTCONTAINERS_RYUK_DISABLED=true` and `DOCKER_HOST`. No changes needed.

**From Story 1.2 (always applies):**
4. **`routes/auth.ts` is a `fastify-plugin` (`fp`) wrapped plugin** — all new routes are added inside the same `async (fastify, opts) => {}` closure. Do not create a separate plugin file.
5. **`getUserByEmail` function exists** in `backend/src/db/queries/auth.ts` — already used by login. No changes needed.
6. **`fastify-plugin` and TypeBox type provider are already installed** — do not reinstall.

**From Story 1.3 (critical for this story):**
7. **`POST /auth/login` already sets the `token` cookie** with `path: '/'`. The `clearCookie` in logout must use the **same path** (`path: '/'`) or the browser will not clear it.
8. **`@fastify/jwt` reads the `token` cookie automatically** via `cookieName: 'token'` config in `server.ts`. The `authenticate` decorator calls `request.jwtVerify()` — no manual extraction needed.
9. **Story 1.3 explicitly deferred** saving email to `localStorage` and implementing logout — both belong here in Story 1.4.
10. **`frontend/src/lib/auth.ts` already exists** with `saveEmail()`, `getSavedEmail()`, and `clearSavedEmail()` fully implemented. Do **not** recreate this file. Import from it directly.
11. **`useAuth()` query key is `['auth', 'me']`** — `queryClient.clear()` in logout will clear this and all other queries. Alternatively use `queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })` then navigate, but `clear()` is cleaner for logout (avoids background refetch of now-expired session).
12. **`api.ts` fetch wrapper exists** at `frontend/src/lib/api.ts` — use `api.post('/auth/logout', {})`. This sends the cookie automatically (same-origin request).
13. **Tailwind v4 CSS-based config**: `frontend/src/index.css` uses `@import "tailwindcss"` and `@theme {}`. No `tailwind.config.ts` changes needed for new components.

---

### Backend: `POST /auth/logout` Details

```typescript
// Add to existing authRoutes plugin in backend/src/routes/auth.ts
// after the POST /auth/login and GET /auth/me routes

f.post('/auth/logout', async (_req, reply) => {
  return reply
    .clearCookie('token', { path: '/' })
    .status(200)
    .send({ message: 'Logged out' })
})
```

**Why no `authenticate` preHandler:** Logout must work even with an expired or missing cookie. If the user navigates away, has an expired session, and then tries to hit logout (e.g., browser extension scenario), the server must return 200 gracefully. This is explicitly specified in AC4.

**`clearCookie` mechanics:** Fastify's `reply.clearCookie('token', { path: '/' })` sets `Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`. The `path` must match the `setCookie` path from login exactly — otherwise the browser treats them as different cookies and doesn't clear the original.

---

### Frontend: `lib/auth.ts` — Already Complete

> ✅ **No changes needed to `frontend/src/lib/auth.ts`**. It was pre-scaffolded in Story 1.3 and is fully implemented:

```typescript
const EMAIL_KEY = 'bmad_todo_email'                    // ← matches architecture spec

export function saveEmail(email: string): void { ... }     // call after successful login
export function getSavedEmail(): string | null { ... }     // call in LoginPage state initialiser
export function clearSavedEmail(): void { ... }            // call in logout handler
```

Just import and use. No modification required.

---

### Frontend: LoginPage Email Pre-fill Pattern

The lazy `useState` initialiser is the correct pattern (not `useEffect`) for pre-filling from `localStorage`:

```typescript
// ✅ Correct — reads localStorage once on mount, before first render
const [email, setEmail] = useState(() => getSavedEmail() ?? '')

// ❌ Wrong — useEffect runs after render, causes flash of empty field
useEffect(() => { setEmail(getSavedEmail() ?? '') }, [])
```

After successful login pass — save email **before** navigating:
```typescript
// In submit handler, after api.post('/auth/login', ...) succeeds:
saveEmail(email)           // persist for next visit pre-fill
navigate('/')              // go to task list
```

**Password focus with pre-filled email:** The password field must be focused on mount, even when email is pre-filled (AC2). Use `useRef` + `useEffect`:

```typescript
const passwordRef = useRef<HTMLInputElement>(null)
useEffect(() => { passwordRef.current?.focus() }, [])
// Then on the <input>: ref={passwordRef}
```

Do NOT use `autoFocus` HTML attribute on both fields — only one element can have focus. The `ref` + `useEffect` pattern gives explicit control.

---

### Frontend: Logout Flow

The `handleLogout` function in `AppHeader` should follow the **best-effort pattern** — the client-side cleanup always runs regardless of API response:

```typescript
async function handleLogout() {
  setIsLoggingOut(true)
  try {
    await api.post('/auth/logout', {})
  } catch {
    // Swallow — server cookie cleared on server side if reachable.
    // Client cleanup always proceeds regardless.
  } finally {
    clearSavedEmail()           // remove localStorage key
    queryClient.clear()         // wipe all TanStack Query cache (auth, tasks, etc.)
    navigate('/login', { replace: true })  // replace=true prevents back-button returning to task list
  }
}
```

**`navigate('/login', { replace: true })`:** Using `replace` prevents the user from pressing the browser back button after logout and returning to the (now-stale) task list page.

**`queryClient.clear()` vs `invalidateQueries`:** `clear()` removes all cached data immediately. On logout this is correct — we don't want background refetches of data that belongs to the logged-out user.

---

### API Contract

**`POST /api/auth/logout`**

No request body.

Success — `200 OK` (always, including when no cookie present):
```json
{ "message": "Logged out" }
```

Response header (cookie cleared):
```
Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly
```

No error responses — the route never returns 4xx or 5xx in normal operation.

---

### `AppHeader` Component Scope for This Story

`AppHeader` in Story 1.4 is intentionally minimal — just the app title and logout button. Do **not** implement:

| Feature | Belongs to |
|---|---|
| Task count display (`completed/total`) | Story 2.3 — requires task list data |
| User profile / settings link | Post-MVP |
| Navigation breadcrumbs | Post-MVP |

Leave a comment in `AppHeader.tsx` for task count:
```tsx
{/* TODO Story 2.3: <TaskCountDisplay /> goes here */}
```

---

### Component and File Structure This Story Adds

```
backend/src/
  routes/
    auth.ts           ← EXTENDED — add POST /auth/logout
backend/test/
  routes/
    auth.test.ts      ← EXTENDED — add logout test cases

frontend/src/
  components/
    AppHeader.tsx     ← NEW — app header with logout button
    .gitkeep          ← remove this file once AppHeader.tsx is created
  pages/
    LoginPage.tsx     ← MODIFIED — add email pre-fill (getSavedEmail), saveEmail on success, password focus
    TaskListPage.tsx  ← MODIFIED — render <AppHeader userEmail={user?.email} />
  lib/
    auth.ts           ← NO CHANGES — already fully implemented
```

---

### Testing Standards

| Layer | Framework | Pattern |
|---|---|---|
| Backend routes | Vitest + `app.inject()` | Extend `test/routes/auth.test.ts` |
| Frontend unit | Vitest + React Testing Library | Optional for AppHeader (if time allows) |
| E2E | Playwright (against Docker Compose) | Part of Story 5.x coverage |

**Backend test file location:** `backend/test/routes/auth.test.ts` — extend only, do not create a new file.

**Key test assertions for logout:**
- Status code `200` on all logout scenarios (with cookie, without cookie, with invalid cookie)
- Response `Set-Cookie` header clears the `token` cookie (`Max-Age=0` or past `Expires`)

---

### What NOT to Build in This Story

| Feature | Belongs to |
|---|---|
| Task count display in header | Story 2.3 |
| Task list actual implementation | Stories 2.1–2.5 |
| Session refresh / token rotation | Post-MVP |
| "Remember me" toggle | Post-MVP |
| Confirm logout dialog | Not in UX spec — single click logout is fine |

---

### Cross-Story Context (for awareness only)

**Story 2.1** will implement the full task list in `TaskListPage.tsx`. The shell structure (AppHeader + main content area) established in this story will be built upon. The `ProtectedRoute` wrapping from Story 1.3 remains unchanged.

**Story 2.3** will add `<TaskCountDisplay>` to `AppHeader`. It reads from TanStack Query cache (`tasks` query key) — no prop drilling from `TaskListPage`. The comment placeholder in `AppHeader.tsx` marks the exact insertion point.

---

### References

- [Source: epics.md — Story 1.4 Acceptance Criteria & User Story]
- [Source: architecture.md — Authentication & Security table (localStorage key `bmad_todo_email`, cookie name `token`)]
- [Source: architecture.md — API Route Surface (`POST /api/auth/logout`)]
- [Source: architecture.md — Component File Structure (`AppHeader.tsx`, `auth.ts`)]
- [Source: architecture.md — Enforcement Guidelines (JWT in httpOnly cookie only, never localStorage)]
- [Source: architecture.md — Environment Variables (`NODE_ENV` for `secure` cookie flag)]
- [Source: story 1.3 Dev Notes — Cross-Story Context section (saveEmail, clearEmail, POST /auth/logout implementation hints)]
- [Source: story 1.3 Tasks 8.3 and 8.4 — explicit deferral of localStorage saving and logout to Story 1.4]
- [Source: frontend/src/lib/auth.ts — pre-scaffolded helper functions (saveEmail, getSavedEmail, clearSavedEmail)]
- [Source: ux-design-specification.md — pixel-art aesthetic, Press Start 2P font, border conventions]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (via GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List
