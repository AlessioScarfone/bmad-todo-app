---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# bmad-todo-app - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bmad-todo-app, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Unregistered users can create an account with email and password
FR2: Registered users can log in with email and password
FR3: The system maintains user sessions across browser restarts without requiring re-authentication (30-day long-lived JWT stored in httpOnly cookie)
FR4: The login form pre-fills the user's email address on return visits (email stored in localStorage key `bmad_todo_email`)
FR5: Authenticated users can log out
FR6: Authenticated users can create a new task with a title
FR7: Authenticated users can view all their tasks
FR8: Authenticated users can mark a task as complete
FR9: Authenticated users can un-complete a previously completed task
FR10: Authenticated users can delete a task
FR11: Authenticated users can edit an existing task's title
FR12: Authenticated users can assign a point value to a task at creation time
FR13: Authenticated users can update the point value of an existing task
FR14: Authenticated users can attach one or more free-form labels to a task
FR15: Authenticated users can remove a label from a task
FR16: Authenticated users can set an optional deadline date on a task
FR17: Authenticated users can remove the deadline from a task
FR18: Authenticated users can add subtasks to a task
FR19: Authenticated users can mark individual subtasks as complete independently
FR20: Authenticated users can delete a subtask
FR21: Subtasks are limited to one level of nesting (no nested subtasks)
FR22: Completing all subtasks does not automatically complete the parent task
FR23: The system displays the user's accumulated daily score persistently on every authenticated page
FR24: The daily score increases when a task is marked complete, by that task's assigned point value
FR25: The system records the user's total score for each calendar day (derived from tasks.completed_at — no separate score table)
FR26: Authenticated users can view their score history across previous days
FR27: Authenticated users can view a chronological list of daily scores for up to 30 previous calendar days
FR28: Authenticated users can filter their task list by label
FR29: Authenticated users can filter their task list by completion status
FR30: Authenticated users can filter their task list by deadline
FR31: Authenticated users can sort their task list by label, deadline, or completion status
FR32: The system provides inline error feedback when a task action fails
FR33: Users can retry a failed task action without re-entering data
FR34: The system reflects task state changes within 1 second after each action without a full page reload
FR35: All core flows are operable via keyboard navigation
FR36: The system automatically creates a daily seed task — titled "Record your first task for today" (1 point, is_system=true) — for each user at the start of each calendar day via an idempotent server-side hook; the task appears at the top of the task list and can be completed or deleted by the user

### NonFunctional Requirements

NFR1: All user-initiated task actions (create, complete, delete, edit) complete and reflect in the UI within 1 second under normal network conditions
NFR2: Initial page load completes within 3 seconds on a standard broadband connection
NFR3: The daily score updates and renders within 500ms of a task state change
NFR4: All API communication occurs over HTTPS
NFR5: Passwords are stored hashed using bcrypt (12 rounds)
NFR6: JWT tokens are validated server-side on every authenticated request via Fastify onRequest hook
NFR7: Users can only access their own tasks and data — no cross-user data leakage (enforced via WHERE user_id = $userId on all DB queries)
NFR8: No sensitive data (passwords, raw tokens) is logged — auth routes never log request bodies
NFR9: The application meets WCAG 2.1 AA compliance — zero critical violations
NFR10: All interactive elements are keyboard navigable (Tab, Enter, Escape, Space)
NFR11: Color contrast ratios meet AA thresholds throughout the pixel-art-inspired theme
NFR12: Destructive actions (delete) require explicit user confirmation before execution (two-step: hover reveals → explicit click confirms)
NFR13: Task data is persisted durably — no data loss on page refresh or browser restart
NFR14: The application behaves gracefully on network failure — inline error feedback, no silent data loss
NFR15: The Docker Compose deployment starts successfully from a clean environment with no manual configuration beyond `docker-compose up`
NFR16: Unit/integration test coverage ≥ 70% meaningful coverage (Vitest + Testcontainers)
NFR17: Minimum 5 passing Playwright E2E tests covering core user flows

### Additional Requirements

**From Architecture:**
- No starter template — project scaffolded from purpose-chosen primitives: `npm create vite@latest frontend -- --template react-ts` (frontend) and manual Fastify backend setup
- Three-service Docker Compose topology: `db` (postgres:16-alpine), `api` (Fastify :3001), `web` (nginx :3000 serving Vite static bundle + reverse proxy /api/*)
- JWT stored exclusively in httpOnly, SameSite=Strict, Secure cookie — never in localStorage
- Score aggregation computed at query time from tasks.completed_at and tasks.points — no separate daily_scores table
- Seed task idempotency enforced via single SQL INSERT ... WHERE NOT EXISTS in a Fastify onRequest hook on all authenticated routes
- Filter and sort applied client-side on TanStack Query cache in MVP (GET /api/tasks accepts query params for future use)
- Database schema: 5 tables — users, tasks (with is_system flag), labels, task_labels, subtasks
- Required indexes: idx_tasks_user_id, idx_tasks_completed_at (partial: WHERE is_completed = true), idx_tasks_system (partial: WHERE is_system = true)
- Versioned SQL migrations in backend/src/db/migrations/ (001_init.sql, etc.) tracked in _migrations table
- Test files must reside in test/ directory mirroring src/ structure — never co-located with source files
- Shared TypeBox Static<> types defined once in shared/types/ at repo root — imported by both frontend and backend
- Environment variables documented in .env.example (committed); .env gitignored
- Logging via pino (Fastify built-in) — structured JSON, level info in production

**From UX Design:**
- Inline-always task creation — task input row permanently visible at top of list (no modal, no "+ New Task" button opening a form)
- Keyboard-native primary path: Tab to point field, Enter to submit task; Space to toggle complete on focused row; Escape to cancel inline edit
- Score display in header/top-right — static number update, no animation or transition on change; `aria-label="Today's score: N points"`
- `prefers-reduced-motion` respected — all transitions disabled for users who opt out
- Filter bar always rendered at zero interaction cost (no click to reveal)
- All errors shown inline (never in a modal or toast that auto-dismisses)
- Pixel-art aesthetic via 8bitcn-ui (shadcn/ui + Radix UI + Tailwind CSS) — calm and composed, not celebratory
- ARIA requirements: `role="alert"` on inline errors, `aria-live="polite"` on empty state region, `aria-pressed` on active filter buttons, `aria-expanded` on subtask panel trigger, checkbox `aria-label="Mark [task title] as done"`

### FR Coverage Map

FR1 → Epic 1 – User registration (email + password)
FR2 → Epic 1 – User login
FR3 → Epic 1 – Long-lived JWT sessions (httpOnly cookie, 30 days)
FR4 → Epic 1 – Email pre-fill on return (localStorage bmad_todo_email)
FR5 → Epic 1 – Logout
FR6 → Epic 2 – Create task with title
FR7 → Epic 2 – View all tasks
FR8 → Epic 2 – Mark task complete
FR9 → Epic 2 – Un-complete task
FR10 → Epic 2 – Delete task
FR11 → Epic 2 – Edit task title
FR12 → Epic 2 – Assign point value at creation
FR13 → Epic 2 – Update task point value
FR14 → Epic 3 – Attach labels to task
FR15 → Epic 3 – Remove label from task
FR16 → Epic 3 – Set deadline date on task
FR17 → Epic 3 – Remove deadline from task
FR18 → Epic 3 – Add subtasks to task
FR19 → Epic 3 – Mark individual subtasks complete (independent)
FR20 → Epic 3 – Delete subtask
FR21 → Epic 3 – Subtasks limited to one level (no nesting)
FR22 → Epic 3 – Completing all subtasks does not auto-complete parent
FR23 → Epic 2 – Persistent daily score display on every authenticated page
FR24 → Epic 2 – Daily score increments on task completion by task points
FR25 → Epic 4 – Per-day score records (derived from tasks.completed_at at query time)
FR26 → Epic 4 – View score history across previous days
FR27 → Epic 4 – 30-day chronological score history list
FR28 → Epic 5 – Filter by label
FR29 → Epic 5 – Filter by completion status
FR30 → Epic 5 – Filter by deadline
FR31 → Epic 5 – Sort by label, deadline, or completion status
FR32 → Epic 6 – Inline error feedback on failed task action
FR33 → Epic 6 – Retry failed action without re-entering data
FR34 → Epic 6 – Sub-1-second UI state reflection (no full page reload)
FR35 → Epic 6 – Full keyboard navigation on all core flows
FR36 → Epic 2 – Daily seed task (idempotent, is_system=true, 1pt, Fastify onRequest hook)

## Epic List

### Epic 1: Project Foundation & Authentication
Users can register for an account, log in (with email pre-fill on return visits), maintain a long-lived session across browser restarts, and log out. This establishes the complete authenticated foundation — including full Docker Compose infrastructure, database schema, and migrations runner.
**FRs covered:** FR1, FR2, FR3, FR4, FR5

### Epic 2: Core Task Management & Daily Score
Authenticated users can create tasks with point values, view their full task list, mark tasks complete (and un-complete), edit task titles and points, delete tasks, and always see their live daily score update in the header. The system automatically seeds a daily task at the top of the list each day.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR23, FR24, FR36

### Epic 3: Task Enrichment — Labels, Deadlines & Subtasks
Authenticated users can enhance tasks with free-form labels, optional deadline dates, and flat one-level subtasks (each independently completable). Completing all subtasks never auto-completes the parent — points are awarded on explicit parent completion only.
**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22

### Epic 4: Score History & Productivity Tracking
Authenticated users can navigate to a score history view showing their accumulated daily scores across up to 30 previous calendar days — score always derived at query time from completed tasks, no separate table.
**FRs covered:** FR25, FR26, FR27

### Epic 5: Task Filtering & Sorting
Authenticated users can filter their task list by label, completion status, or deadline and sort by label, deadline, or completion status. Filters are client-side, session-only, and non-destructive — clearing returns the full list instantly.
**FRs covered:** FR28, FR29, FR30, FR31

### Epic 6: Resilience, Accessibility & Quality Assurance
Users receive inline error feedback with one-tap retry on any failed action; all state changes reflect within 1 second with no full page reload; every core flow is operable via keyboard alone. WCAG 2.1 AA compliance (zero critical violations), ≥70% meaningful test coverage, ≥5 passing Playwright E2E tests.
**FRs covered:** FR32, FR33, FR34, FR35
**NFRs addressed:** NFR1–NFR17 (all performance, security, accessibility, reliability, and testing targets)
---

## Epic 1: Project Foundation & Authentication

Users can register for an account, log in (with email pre-fill on return visits), maintain a long-lived session across browser restarts, and log out. This establishes the complete authenticated foundation — including full Docker Compose infrastructure, database schema, and migrations runner.

### Story 1.1: Project Scaffolding & Docker Infrastructure Baseline

As a developer,
I want the complete project scaffolded (Vite + React + TS frontend, Fastify + TS backend, PostgreSQL 16 database) running as three Docker Compose services with a health-verified startup sequence,
So that there is a verified, runnable baseline (`docker-compose up`) to build all features on top of.

**Acceptance Criteria:**

**Given** a developer clones the repo and creates a `.env` from `.env.example`
**When** they run `docker-compose up --build`
**Then** all three services (db, api, web) start successfully with no manual configuration steps required
**And** the web service is accessible at `http://localhost:3000` and returns an HTML response

**Given** the Docker Compose stack is running
**When** a request is made to `GET http://localhost:3000/api/health`
**Then** the API returns `200 OK` (proxied through nginx)
**And** the PostgreSQL service is healthy (pg_isready passes)

**Given** the migration runner executes on API startup
**When** `migrate.ts` completes
**Then** the `_migrations` table exists and `001_init.sql` is recorded as applied
**And** the `users` table exists with columns: `id`, `email`, `password_hash`, `created_at`

### Story 1.2: User Registration

As an unregistered user,
I want to create an account with my email and password,
So that I can access the application and my personal task list.

**Acceptance Criteria:**

**Given** I am on the registration page
**When** I submit a valid email and password
**Then** my account is created and I am immediately redirected to the authenticated task list
**And** my password is stored as a bcrypt hash (12 rounds) — never plaintext

**Given** I attempt to register with an email already in use
**When** I submit the form
**Then** I see an inline error message indicating the email is already taken
**And** no duplicate account is created

**Given** I submit the registration form with an empty email or password
**When** the form is validated
**Then** I see inline field-level validation errors
**And** no API call is made

**Given** the registration API receives a request
**When** the request body is validated server-side via TypeBox schema
**Then** any invalid input returns `400` with `{ statusCode, error: "BAD_REQUEST", message }` shape
**And** the request body is never logged

### Story 1.3: User Login & Long-lived Session

As a registered user,
I want to log in with my email and password and remain authenticated across browser restarts for 30 days,
So that I don't have to re-authenticate on return visits.

**Acceptance Criteria:**

**Given** I am on the login page and enter valid credentials
**When** I submit the login form
**Then** I am redirected to the authenticated task list
**And** the server sets an `httpOnly`, `SameSite=Strict`, `Secure` cookie containing a 30-day JWT

**Given** I have previously logged in and close/reopen the browser
**When** my browser sends the stored cookie on the next visit
**Then** `GET /api/auth/me` validates the JWT server-side and returns my user record
**And** I land directly on the task list without seeing the login page

**Given** I enter an incorrect password or unregistered email
**When** I submit the login form
**Then** I see a generic inline error (e.g., "Invalid email or password") — no field-specific hint
**And** the server returns `401` with the standard error shape

**Given** my session cookie has expired (>30 days)
**When** I visit the app
**Then** I am redirected to the login page
**And** no stale session data is shown

### Story 1.4: Email Pre-fill on Return & Logout

As a returning user,
I want my email address pre-filled on the login form and a clear way to log out,
So that return visits require minimal friction and I can end my session when needed.

**Acceptance Criteria:**

**Given** I successfully log in
**When** my session is established
**Then** my email address is stored in `localStorage` under key `bmad_todo_email`

**Given** I navigate to the login page on a return visit
**When** the page loads
**Then** the email field is pre-filled with the value from `localStorage` (if present)
**And** the password field is empty and focused

**Given** I am authenticated and click the logout button
**When** `POST /api/auth/logout` is called
**Then** the server clears the JWT cookie (sets it as expired)
**And** the client removes `bmad_todo_email` from `localStorage`
**And** I am redirected to the login page

**Given** the logout API is called
**When** it processes
**Then** it returns `200 OK` regardless of whether the cookie was already absent (idempotent)

---

## Epic 2: Core Task Management & Daily Score

Authenticated users can create tasks with point values, view their full task list, mark tasks complete (and un-complete), edit task titles and points, delete tasks, and always see their live daily score update in the header. The system automatically seeds a daily task at the top of the list each day.

### Story 2.1: Task List View & Database Foundation

As an authenticated user,
I want to see my personal task list when I log in, with an always-visible inline creation row at the top,
So that I can immediately start adding tasks without any extra navigation.

**Acceptance Criteria:**

**Given** I am authenticated and navigate to the task list
**When** the page loads
**Then** I see an inline task creation row permanently visible at the top of the list (no modal, no "+ New Task" button opening a form)
**And** the `tasks` table exists in the database with all required columns including `is_system`

**Given** I have no tasks yet
**When** the task list loads
**Then** I see an empty state with a prompt to add my first task
**And** the score display area is visible in the header showing `0 pts`

**Given** `GET /api/tasks` is called
**When** the request is authenticated
**Then** only tasks belonging to the authenticated user are returned (WHERE user_id = $userId)
**And** the response is a direct array (never a `{ data: [...] }` wrapper)

### Story 2.2: Create Task with Title and Points

As an authenticated user,
I want to create a task by typing a title and optionally assigning a point value, then pressing Enter,
So that I can capture work items with their relative value in one fluid action.

**Acceptance Criteria:**

**Given** I am on the task list with the inline creation row focused
**When** I type a task title and press Enter (or Tab to point field, set points, then Enter)
**Then** the task appears at the top of my task list immediately (optimistic UI — no spinner)
**And** `POST /api/tasks` is called with the title and point value (default: 1 if not set)

**Given** I submit a task with no title
**When** validation runs
**Then** no API call is made and the input shows an inline validation hint

**Given** `POST /api/tasks` is called with a valid body
**When** the task is created
**Then** the response is the created task object (direct, no wrapper) with a 201 status
**And** the task has `is_system: false`, `is_completed: false`, and `points` as specified

**Given** the API request fails (network error)
**When** the optimistic task is shown
**Then** the task shows an inline error state with a retry affordance
**And** the task is rolled back from the list if retry is abandoned

### Story 2.3: Mark Task Complete & Un-complete with Live Score

As an authenticated user,
I want to mark a task as complete (or un-complete it) with a single click,
So that my daily score reflects my progress in real time.

**Acceptance Criteria:**

**Given** I have a task in my list
**When** I click the completion checkbox
**Then** the task is visually marked as complete immediately (optimistic UI)
**And** `PATCH /api/tasks/:id/complete` is called server-side

**Given** a task is marked complete with a point value of N
**When** the completion is confirmed by the server
**Then** the daily score display in the header increases by N points within 500ms
**And** the score is computed server-side from `SUM(points) WHERE is_completed = true AND completed_at::date = CURRENT_DATE`

**Given** I click the completion checkbox on an already-completed task
**When** `PATCH /api/tasks/:id/uncomplete` is called
**Then** the task reverts to incomplete state (optimistic UI)
**And** the daily score decreases by the task's point value

**Given** the complete/uncomplete API call fails
**When** the server returns an error
**Then** the optimistic state is rolled back
**And** an inline error with retry is shown on the affected task row

### Story 2.4: Edit Task Title and Points

As an authenticated user,
I want to edit a task's title or point value after creation,
So that I can correct mistakes or re-prioritize work.

**Acceptance Criteria:**

**Given** I have a task in my list
**When** I activate the edit action on a task row (click edit icon or press Enter on focused row)
**Then** the task row enters an inline edit mode with the title and points fields editable
**And** I can submit the edit with Enter or cancel with Escape

**Given** I submit an edited title
**When** `PATCH /api/tasks/:id` is called
**Then** the task row updates immediately (optimistic) with the new title
**And** the server persists the change and returns the updated task object

**Given** I submit an updated point value on an already-completed task
**When** the update is saved
**Then** the daily score in the header recalculates to reflect the new point value
**And** `GET /api/scores/today` is re-fetched to confirm accuracy

**Given** I cancel the inline edit with Escape
**When** edit mode is dismissed
**Then** the original title and points are restored with no API call made

### Story 2.5: Delete Task

As an authenticated user,
I want to delete a task I no longer need,
So that my list stays clean and relevant.

**Acceptance Criteria:**

**Given** I have a task in my list
**When** I activate the delete action (hover reveals delete icon → explicit click confirms)
**Then** a two-step confirmation is required before deletion occurs (no undo available)
**And** `DELETE /api/tasks/:id` is called only after explicit confirmation

**Given** the delete is confirmed
**When** `DELETE /api/tasks/:id` succeeds
**Then** the task is removed from the list immediately (optimistic)
**And** if the task was completed, the daily score decreases by that task's points

**Given** the delete API call fails
**When** the server returns an error
**Then** the task is restored to the list
**And** an inline error is shown

**Given** I attempt to delete a task belonging to another user
**When** `DELETE /api/tasks/:id` is called
**Then** the server returns `403 Forbidden` with the standard error shape

### Story 2.6: Daily Seed Task

As an authenticated user,
I want a daily "Record your first task for today" seed task to appear at the top of my list each day automatically,
So that I always have a starting prompt on days I open the app.

**Acceptance Criteria:**

**Given** I have not yet been seeded a task for today
**When** any authenticated API request is made (Fastify onRequest hook fires)
**Then** a seed task is created: title "Record your first task for today", 1 point, `is_system: true`
**And** the insertion is idempotent — if today's seed already exists, no duplicate is created (INSERT ... WHERE NOT EXISTS)

**Given** the seed task is created
**When** I view my task list
**Then** the seed task appears at the top of the list
**And** it is visually indistinguishable from user-created tasks (completable and deletable by me)

**Given** the seed task creation fails silently
**When** the hook encounters a DB error
**Then** the error is logged at `warn` level and the request continues normally (non-critical path)

---

## Epic 3: Task Enrichment — Labels, Deadlines & Subtasks

Authenticated users can enhance tasks with free-form labels, optional deadline dates, and flat one-level subtasks (each independently completable). Completing all subtasks never auto-completes the parent — points are awarded on explicit parent completion only.

### Story 3.1: Labels — Attach and Remove

As an authenticated user,
I want to attach free-form labels to a task and remove them at any time,
So that I can visually categorise my work (e.g., "Client", "Backend", "Admin").

**Acceptance Criteria:**

**Given** I have a task in my list
**When** I add a label (e.g., "Backend") via the inline task row
**Then** the label appears visually on the task card immediately (optimistic)
**And** the label is created in the `labels` table if it doesn't exist, then linked via `task_labels`

**Given** I type a label name that I've used before
**When** the label input is active
**Then** existing label names are suggested for quick selection (no duplicate labels per user)

**Given** I remove a label from a task
**When** `PATCH /api/tasks/:id` processes the removal
**Then** the `task_labels` join row is deleted
**And** the label itself remains in the `labels` table (reusable on future tasks)

**Given** I delete a label from my label list (`DELETE /api/labels/:id`)
**When** the label is deleted
**Then** it is removed from all tasks it was attached to (CASCADE via `task_labels`)
**And** only labels belonging to the authenticated user can be deleted (403 otherwise)

### Story 3.2: Deadline — Set and Remove

As an authenticated user,
I want to set an optional deadline date on a task and remove it at any time,
So that I can track time-sensitive work at a glance.

**Acceptance Criteria:**

**Given** I have a task in my list
**When** I set a deadline date via the task row (date picker or typed date)
**Then** the deadline is visible on the task card (formatted date)
**And** `PATCH /api/tasks/:id` persists the `deadline` field as a `DATE` value

**Given** I remove the deadline from a task
**When** `PATCH /api/tasks/:id` is called with `deadline: null`
**Then** the deadline is cleared from the task card
**And** the `deadline` column is set to NULL in the database

**Given** a task has a deadline set
**When** I view the task list
**Then** the deadline date is displayed on the task card in a clearly readable format
**And** no automatic overdue alerting or styling is required in MVP

### Story 3.3: Subtasks — Add, Complete, and Delete

As an authenticated user,
I want to add flat subtasks to a task, mark them complete independently, and delete them,
So that I can track the steps needed to finish a larger piece of work.

**Acceptance Criteria:**

**Given** I have a task in my list
**When** I expand the subtask panel (toggle button on the task row)
**Then** the subtask panel opens inline below the task (no page navigation)
**And** an input field is available to add a new subtask title

**Given** I type a subtask title and press Enter
**When** `POST /api/tasks/:id/subtasks` is called
**Then** the subtask appears in the panel immediately
**And** the `subtasks` table record has `is_completed: false`

**Given** I mark a subtask as complete
**When** `PATCH /api/tasks/:id/subtasks/:subId` is called
**Then** the subtask shows a completed visual state
**And** the parent task remains incomplete — its completion checkbox is unaffected (FR22)

**Given** all subtasks of a task are marked complete
**When** I view the parent task
**Then** the parent task checkbox remains unchecked — no auto-completion (FR22 enforced)
**And** parent task points are only awarded when I explicitly mark the parent complete

**Given** I delete a subtask
**When** `DELETE /api/tasks/:id/subtasks/:subId` is called
**Then** the subtask is removed from the panel immediately (optimistic)
**And** the parent task is unaffected

**Given** I attempt to add a subtask to a subtask
**When** the UI renders
**Then** no nested subtask input is available — nesting is structurally prevented (FR21)
**And** the API returns `400` if a subtask creation is attempted with a parent that is itself a subtask

---

## Epic 4: Score History & Productivity Tracking

Authenticated users can navigate to a dedicated score history page showing their accumulated daily scores across up to 30 previous calendar days. Score is always derived at query time from `tasks.completed_at` — no separate table.

### Story 4.1: Today's Score API & Header Display Polish

As an authenticated user,
I want my daily score shown persistently in the header on every authenticated page,
So that I always know my current day's accumulated points without any extra navigation.

**Acceptance Criteria:**

**Given** I am authenticated on any page of the app
**When** the page renders
**Then** the score display in the header shows my accumulated points for today (sum of `points` for completed tasks where `completed_at::date = CURRENT_DATE`)

**Given** `GET /api/scores/today` is called
**When** I have no completed tasks today
**Then** the API returns `{ "total": 0 }` and the header shows `0 pts`

**Given** the score is displayed
**When** it renders
**Then** the element has `aria-label="Today's score: N points"` for screen reader accessibility
**And** the score value updates as a static number — no animation or transition

**Given** `GET /api/scores/today` returns a value
**When** it is displayed
**Then** the response is a direct object `{ "total": N }` — no wrapper

### Story 4.2: Score History Page

As an authenticated user,
I want to navigate to a score history page and see a chronological list of my daily scores for up to 30 previous days,
So that I can review my productivity patterns and compare output across days.

**Acceptance Criteria:**

**Given** I am authenticated
**When** I navigate to `/history`
**Then** I see a `ScoreHistoryPage` with a chronological list of daily scores

**Given** `GET /api/scores/history?days=30` is called
**When** the request is authenticated
**Then** the response is a direct array of `{ score_date: "YYYY-MM-DD", total_points: N }` objects ordered by `score_date DESC`
**And** only days with at least one completed task appear (days with 0 completions are omitted)
**And** only data belonging to the authenticated user is returned

**Given** I view the history page
**When** I have data for multiple days
**Then** each entry shows the calendar date and the total points earned that day
**And** the list covers up to 30 previous calendar days (not including today)

**Given** I have no score history yet
**When** the history page loads
**Then** I see an empty state message (e.g., "No score history yet — complete tasks to start tracking your daily progress")

**Given** I am on the task list page
**When** I want to view my history
**Then** there is a navigation link to `/history` accessible from the app header or sidebar
**And** the link is keyboard navigable

---

## Epic 5: Task Filtering & Sorting

Authenticated users can filter their task list by label, completion status, or deadline and sort by label, deadline, or completion status. Filters are client-side, session-only, and non-destructive — clearing returns the full list instantly.

### Story 5.1: Filter Task List by Label, Status, and Deadline

As an authenticated user,
I want to filter my task list by label, completion status, or deadline with a single click,
So that I can focus on a specific subset of tasks without losing my full list.

**Acceptance Criteria:**

**Given** I am on the task list page
**When** the page loads
**Then** the filter bar is always rendered below the header — no click required to reveal it (zero interaction cost)

**Given** I click a label filter button (e.g., "Client")
**When** the filter is applied
**Then** only tasks with that label are shown in the list
**And** the filter button shows an `aria-pressed="true"` state and active visual styling

**Given** I click a completion status filter (e.g., "Done")
**When** the filter is applied
**Then** only completed tasks are shown
**And** clicking "All" or clearing the filter restores the full list instantly (no API call)

**Given** I click a deadline filter (e.g., "Has deadline")
**When** the filter is applied
**Then** only tasks with a deadline set are shown

**Given** a filter is active and produces no matching tasks
**When** the filtered list is empty
**Then** an empty state message is shown in an `aria-live="polite"` region so screen readers announce the result (e.g., "No tasks match this filter")

**Given** filters are session-only
**When** I refresh the page or navigate away and return
**Then** all filters are cleared and the full task list is shown (filters are never persisted)

### Story 5.2: Sort Task List

As an authenticated user,
I want to sort my task list by label, deadline, or completion status,
So that I can view my tasks in the order most useful for my current focus.

**Acceptance Criteria:**

**Given** I am on the task list page
**When** I open the sort dropdown
**Then** I can select from: sort by label (A→Z), sort by deadline (earliest first), sort by completion status (incomplete first)

**Given** I select a sort option
**When** it is applied
**Then** the task list re-orders immediately with no API call (client-side on TanStack Query cache)
**And** the sort dropdown shows the currently active sort option

**Given** a sort is active alongside an active filter
**When** both are applied
**Then** the list shows only filtered tasks in the selected sort order

**Given** I interact with the sort dropdown via keyboard
**When** the dropdown is open
**Then** I can navigate options with arrow keys and confirm with Enter
**And** the dropdown has `aria-haspopup="listbox"` and each option has `role="option"`

---

## Epic 6: Resilience, Accessibility & Quality Assurance

Users receive inline error feedback with one-tap retry on any failed action; all state changes reflect within 1 second with no full page reload; every core flow is operable via keyboard alone. WCAG 2.1 AA compliance (zero critical violations), ≥70% meaningful test coverage, ≥5 passing Playwright E2E tests.

### Story 6.1: Inline Error Feedback & Retry

As an authenticated user,
I want to see an inline error message on any task that fails to save, with a one-click retry,
So that I can recover from network failures without re-entering my work.

**Acceptance Criteria:**

**Given** a task action (create, complete, delete, edit) fails due to a network or server error
**When** the failure is detected by TanStack Query's `onError` handler
**Then** the task row shows an inline error message with a retry button (`role="alert"` so it is announced immediately by screen readers)
**And** the optimistic UI state is rolled back to match server truth

**Given** the inline error is shown
**When** I click the retry button
**Then** the same action is re-attempted without me re-entering any data
**And** the retry affordance has `aria-label="Retry saving [task title]"`

**Given** the retry succeeds
**When** the server confirms the action
**Then** the inline error is dismissed and the task row returns to its normal state

**Given** the app encounters an unhandled error (JS exception outside a query)
**When** it propagates to the React Error Boundary wrapping the app
**Then** a full-page error state is shown (never a silent failure or blank screen)

### Story 6.2: Performance & Sub-second State Reflection

As an authenticated user,
I want all task actions to reflect in the UI within 1 second and the page to load within 3 seconds,
So that the app feels instant and never makes me wait to see my work.

**Acceptance Criteria:**

**Given** I perform any task action (create, complete, uncomplete, delete, edit)
**When** I trigger the action
**Then** the UI reflects the change immediately via optimistic update (no spinner, no delay)
**And** the server round-trip completes and is confirmed within 1 second under normal network conditions (NFR1)

**Given** the daily score changes due to a task completion or uncompletion
**When** the score re-fetches
**Then** the updated score is displayed within 500ms of the action (NFR3)

**Given** I navigate to the app for the first time (cold load)
**When** the page begins loading
**Then** the initial page load completes within 3 seconds on a standard broadband connection (NFR2)

**Given** task list data is loading on initial page fetch
**When** TanStack Query is fetching
**Then** 4 skeleton rows (same height as `TaskRow`) are shown — never a blank list or spinner overlay

### Story 6.3: Full Keyboard Navigation

As an authenticated user who relies on keyboard navigation,
I want to operate every core flow without a mouse,
So that the app is fully accessible and efficient for keyboard-first users.

**Acceptance Criteria:**

**Given** I land on the task list page
**When** I press Tab
**Then** focus moves through interactive elements in a logical order: header nav → score → filter bar → task creation row → task rows

**Given** I have a task row focused
**When** I press Space
**Then** the task completion checkbox is toggled (same as a mouse click)

**Given** a task row is in inline edit mode
**When** I press Escape
**Then** edit mode is cancelled and focus returns to the task row

**Given** I use the filter bar
**When** I Tab to a filter button and press Enter or Space
**Then** the filter is toggled and `aria-pressed` updates accordingly

**Given** I am on any interactive element
**When** it receives focus
**Then** a visible focus ring is rendered that meets WCAG 2.1 AA contrast requirements

### Story 6.4: WCAG 2.1 AA Compliance & `prefers-reduced-motion`

As a user with accessibility needs,
I want the application to meet WCAG 2.1 AA standards with no critical violations,
So that I can use the app regardless of how I interact with technology.

**Acceptance Criteria:**

**Given** the app is rendered
**When** an automated WCAG audit is run (e.g., axe-core)
**Then** zero critical WCAG 2.1 AA violations are reported

**Given** all interactive elements are rendered
**When** I inspect them
**Then** checkboxes have `aria-label="Mark [task title] as done"`; subtask panel trigger has `aria-expanded`; filter buttons have `aria-pressed`; empty state region has `aria-live="polite"`; score display has `aria-label="Today's score: N points"`; inline errors have `role="alert"`

**Given** a user has `prefers-reduced-motion: reduce` enabled in their OS
**When** the app renders
**Then** all CSS transitions and animations are disabled (Tailwind `motion-reduce:` utilities applied)

**Given** color contrast is evaluated across the pixel-art theme
**When** measured against WCAG AA thresholds
**Then** all text and interactive element contrast ratios meet or exceed 4.5:1 (normal text) and 3:1 (large text / UI components)

### Story 6.5: Test Coverage & Playwright E2E Suite

As a developer,
I want ≥70% meaningful test coverage and ≥5 passing Playwright E2E tests,
So that the codebase meets quality standards and core user flows are regression-protected.

**Acceptance Criteria:**

**Given** the Vitest test suite is run against the backend
**When** coverage is measured
**Then** meaningful coverage is ≥70% across: DB query functions (`tasks.ts`, `auth.ts`, `scores.ts`, `subtasks.ts`), auth middleware (JWT validation), score aggregation logic, and seed task idempotency

**Given** backend integration tests run
**When** Testcontainers spins up a real `postgres:16-alpine` instance
**Then** migrations execute successfully against it and all query functions are tested against real SQL behaviour (constraints, `ON CONFLICT`, `RETURNING`)

**Given** the Playwright E2E suite runs against the full Docker Compose stack
**When** all 5+ E2E tests execute
**Then** they all pass; the tests cover at minimum: user registration, user login + session persistence, task creation, task completion with score update, and task deletion with confirmation

**Given** test files are created
**When** placed in the repository
**Then** they reside in `test/` directories mirroring `src/` structure — never co-located with source files
**And** frontend test files use `.test.tsx?` extension; backend test files use `.test.ts`