# Sprint Change Proposal — 2026-02-25

**Project:** bmad-todo-app
**Date:** 2026-02-25
**Scope:** Minor — Implemented directly by dev team
**Status:** ✅ Implemented

---

## Section 1: Issue Summary

Two defects were discovered during manual testing of the task list view after Story 2.2 (Create Task) was marked done:

1. **Logout button non-functional** — clicking the Logout button in the `AppHeader` did not reliably navigate the user to the login page. The root cause was a race condition combined with a backend cookie-clearing mismatch.

2. **Task list page violates UX design specification** — the task list page, app header, inline task input, empty state, and task count display all used light/white colors (`bg-white`, `bg-gray-50`, `border-black`) inherited from Vite's default scaffold. The UX spec mandates a dark terminal aesthetic (`#0f0f0f` background, `#1c1c1c` surface, `#e0e0e0` borders, `#00ff88` primary accent, `#f0f0f0` text). The `LoginPage` and `ProtectedRoute` were already correctly themed — these components were missed.

---

## Section 2: Impact Analysis

### Epic Impact
- **Epic 2 (Core Task Management)**: Stories 2.1 and 2.2 are marked `done` but delivered with incorrect UX. Stories 2.3–2.5 (not yet implemented) would have inherited the wrong theme had these not been caught now.

### Story Impact
- **2.1 and 2.2 (done)**: The defects existed in both but are now corrected without changing any acceptance criteria or API contracts. No re-testing of backend logic required.
- **Story 2.3 onward**: The `TaskRow` component to be built in 2.3 will now be authored against the correct dark-theme baseline.

### Artifact Conflicts
- No PRD changes required — both issues are implementation defects, not requirement gaps.
- No architecture changes required — the dark theme was correctly specified in UX design spec.
- `project-context.md` correctly documented the dark palette tokens — not a knowledge gap.

### Technical Impact
- Backend: one-line change to `POST /api/auth/logout` clearCookie options (no migration, no schema change, no API contract change).
- Frontend: CSS/Tailwind class changes across 5 components; no logic changes except the logout race-condition fix in `AppHeader`.

---

## Section 3: Recommended Approach — Direct Adjustment

**Chosen path:** Direct Adjustment — implement fixes inline with the current sprint.

**Rationale:** Both defects are confined to frontend styling and one backend cookie header. They carry zero risk to existing API contracts, database schema, or test coverage (tests are backend integration tests that don't test CSS). No story re-writing or backlog reorganisation is needed.

---

## Section 4: Detailed Change Proposals

### Change 1: Backend — Fix `clearCookie` options in logout route

**File:** `backend/src/routes/auth.ts`

**OLD:**
```typescript
reply.clearCookie('token', { path: '/' })
```

**NEW:**
```typescript
reply.clearCookie('token', {
  path: '/',
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
})
```

**Rationale:** The cookie was originally set with `httpOnly`, `SameSite=Strict`, and `Secure` (in production). Some browsers require matching security attributes on the clearing `Set-Cookie` header to correctly delete the cookie. In docker-compose, `NODE_ENV=production`, so `Secure=true`. Omitting these from `clearCookie` could lead to the cookie not being deleted, causing authenticated sessions to persist after logout.

---

### Change 2: Frontend — Fix logout race condition in `AppHeader`

**File:** `frontend/src/components/AppHeader.tsx`

**OLD:**
```typescript
finally {
  clearSavedEmail()
  queryClient.clear()
  setIsLoggingOut(false)
  navigate('/login', { replace: true })
}
```

**NEW:**
```typescript
finally {
  clearSavedEmail()
  queryClient.setQueryData(['auth', 'me'], null) // immediately mark unauthenticated
  queryClient.clear()
  navigate('/login', { replace: true })
}
```

**Rationale:** `queryClient.clear()` removes the auth query from the cache but doesn't cancel in-flight fetches. A background refetch completing after `clear()` could repopulate `['auth', 'me']` with a valid user before `navigate('/login')` executes. `LoginPage` would then see an authenticated user and redirect back to `/`. Setting the auth data to `null` before clearing ensures `ProtectedRoute` immediately enters the "not authenticated" path. The `setIsLoggingOut(false)` call was removed as the component unmounts on navigation.

**Also:** Removed unused `useState` import for `isLoggingOut` setter... actually `isLoggingOut` state is still used to disable the button during the API call — kept.

---

### Change 3: Frontend — Dark theme across all task-list-area components

| File | Issue | Fix |
|---|---|---|
| `AppHeader.tsx` | `bg-white border-b-4 border-black` header; `bg-white` button; no text color | `bg-[#1c1c1c] border-b-2 border-[#333]`; brand text `text-[#00ff88]`; email `text-[#888]`; button `text-[#f0f0f0] border-[#e0e0e0] hover:border-[#00ff88] hover:text-[#00ff88]` |
| `TaskListPage.tsx` | `bg-gray-50` wrapper; `bg-white border-black font-pixel` task items | `bg-[#0f0f0f]`; task items `bg-[#1c1c1c] border-l-2 border-[#2a2a2a] hover:border-[#00ff88] font-mono text-[#f0f0f0]` |
| `EmptyState.tsx` | `text-gray-500` | `text-[#555]`; UX spec empty-state copy updated |
| `TaskCountDisplay.tsx` | `text-gray-600 text-[8px]` | `text-[#00ff88] text-[10px] tabular-nums` (matches UX spec — primary accent at count display size) |
| `InlineTaskInput.tsx` | `bg-white border-black` container; `font-pixel` input; white buttons with black borders | `bg-[#1c1c1c] border-[#e0e0e0]`; `font-mono text-[#f0f0f0] placeholder-[#555]`; Add button `border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88] hover:text-[#0f0f0f]`; error `text-[#ff4444]` |

---

## Section 5: Implementation Handoff

**Change scope classification:** Minor — implemented directly by dev team in this workflow run.

**Status:** ✅ All changes applied and docker-compose rebuilt successfully (all 3 services healthy).

**Deliverables:**
- [x] `backend/src/routes/auth.ts` — `clearCookie` fix
- [x] `frontend/src/components/AppHeader.tsx` — race condition fix + dark theme
- [x] `frontend/src/pages/TaskListPage.tsx` — dark theme
- [x] `frontend/src/components/EmptyState.tsx` — dark theme
- [x] `frontend/src/components/TaskCountDisplay.tsx` — dark theme
- [x] `frontend/src/components/InlineTaskInput.tsx` — dark theme

**No story file updates required** — these are implementation defects in already-completed stories, not acceptance-criteria gaps.

**No sprint-status.yaml updates required** — stories 2.1 and 2.2 remain `done`.

**Impact on Story 2.3** — The `TaskRow` component to be built in Story 2.3 now inherits the correct dark-theme baseline. No changes needed to the 2.3 story file.

---

## Section 6: Workflow Completion

- **Issue addressed:** Logout non-functional + task list UX color violations
- **Change scope:** Minor
- **Artifacts modified:** 6 source files (backend auth route, 5 frontend components)
- **Routed to:** Development team (direct implementation — complete)
