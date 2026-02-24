---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-23'
lastRevised: '2026-02-24'
revisionSummary: 'Removed scoring/gamification: points column, is_system column, seed task, /api/scores/* routes, ScoreHistoryPage, useScores hook. Replaced score aggregation query with task count query (FR21). Reduced schema to 4 tables. Removed /history route.'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/planning-artifacts/product-brief-bmad-todo-app-2026-02-23.md'
workflowType: 'architecture'
project_name: 'bmad-todo-app'
user_name: 'Alessio'
date: '2026-02-23'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements (36 total):**
- **Authentication & Session Management (FR1–5):** Email/password registration and login, long-lived JWT sessions persisted across browser restarts, email pre-fill on return, logout.
- **Task Management (FR6–11):** Full CRUD (create, read, complete/un-complete, delete, edit title).
- **Task Enrichment (FR12–21):** Free-form labels (add/remove), optional deadline date (add/remove), flat one-level subtasks (add, complete independently, delete). Subtask completion does not auto-complete parent. Task count display (completed/total, e.g. `3/5`) shown persistently in the header (FR21).
- **Organisation & Discovery (FR22–25):** Filter by label, by completion status, by deadline; sort by label, deadline, or completion status. Filters are session-only, non-persistent.
- **User Experience & Feedback (FR26–29):** Inline error feedback with retry, sub-1-second UI reflection of state changes, full keyboard navigation.

**Non-Functional Requirements:**
- **Performance:** Task actions < 1s, initial page load < 3s.
- **Security:** HTTPS only, bcrypt password hashing, JWT server-side validation on every authenticated request, strict per-user data isolation, no sensitive data logged.
- **Accessibility:** WCAG 2.1 AA — zero critical violations, keyboard navigation for all interactive elements, ARIA attributes, visible focus rings, color contrast ratios met, `prefers-reduced-motion` support.
- **Reliability:** Durable persistence (no data loss on refresh/restart), graceful network failure UX, `docker-compose up` clean-start deployment.
- **Browser support:** Modern evergreen only (Chrome, Firefox, Safari, Edge — latest stable).

**Scale & Complexity:**
- Primary domain: Full-stack web application
- Complexity level: Low — CRUD, auth, task count display, no real-time collaboration, no multi-tenancy beyond per-user isolation
- Estimated architectural components: ~4 (Auth, Tasks, Subtasks, Labels)
- Solo developer constraint: Monolithic backend required — no microservices

### Technical Constraints & Dependencies

- SPA frontend communicates with backend exclusively via REST API (JSON) — no SSR
- Task count is derived client-side from the task list response — no separate endpoint needed
- No SEO requirements — all content is authentication-gated
- Docker Compose is the sole deployment mechanism — no external infrastructure
- Frontend design system: 8bitcn-ui (shadcn/ui architecture, Tailwind CSS, Radix UI primitives)
- React SPA with client-side routing
- No dedicated background worker process required

### Cross-Cutting Concerns Identified

1. **JWT authentication middleware** — applied to all authenticated API routes; token validation, user extraction from claims
2. **Per-user data isolation** — enforced at every query level; application-level `WHERE user_id = $userId` on all reads/writes
3. **Optimistic UI + error recovery** — React state updates before server confirmation; rollback on error with inline retry affordance
4. **Task count derivation** — computed client-side from the already-fetched task list (`completed / total`); no separate API call needed
5. **WCAG 2.1 AA compliance** — ARIA attributes, focus management, color contrast, keyboard navigation required across all components

---

## Starter Template Evaluation & Architectural Decisions

### Primary Technology Domain

Full-stack web application: React SPA frontend + Fastify REST API backend + PostgreSQL database. All services containerised and orchestrated via Docker Compose.

No starter template selected — the stack is composed from purpose-chosen primitives rather than a monorepo boilerplate, keeping the footprint minimal and every dependency intentional.

### Initialization Commands

```bash
# Frontend
npm create vite@latest frontend -- --template react-ts

# Backend
mkdir backend && cd backend && npm init -y
npm install fastify @fastify/jwt @fastify/cors @fastify/cookie @sinclair/typebox @fastify/type-provider-typebox postgres bcrypt
npm install -D typescript @types/node vitest @testcontainers/postgresql
```

### ADR-001: Frontend Framework & Build Tool

**Decision:** Vite + React + TypeScript

**Rationale:**
- The PRD specifies a SPA with client-side routing and no SEO requirements — Next.js/Remix server runtimes add unnecessary complexity
- Vite produces a pure static bundle served by nginx — a 3-line multi-stage Dockerfile, no Node runtime in production
- 8bitcn-ui is built on shadcn/ui + Tailwind CSS + Radix UI, a native fit for this Vite + React setup
- **React Router v7** (client-side mode) handles auth redirects and page routing declaratively
- **TanStack Query** manages server state: optimistic mutations, background refetch, and error retry are first-class — all required by the UX spec

**Architectural decisions established:**
- TypeScript strict mode throughout
- Tailwind CSS (utility-first, no CSS-in-JS)
- Vite HMR for development, static bundle output for production
- Client-side routing only — no file-system router

---

### ADR-002: Backend Framework

**Decision:** Fastify + TypeScript + TypeBox (`@sinclair/typebox` + `@fastify/type-provider-typebox`)

**Rationale:**
- Fastify's schema validation pipeline runs through Ajv (compiled JSON Schema) — TypeBox generates JSON Schema natively, making it the correct pairing; no separate parse step as with Zod
- `@fastify/type-provider-typebox` provides full request/response type inference from TypeBox schemas — types flow end-to-end without code-gen
- First-party plugins (`@fastify/jwt`, `@fastify/cors`, `@fastify/cookie`) cover all auth and security requirements without third-party risk
- NestJS is excluded — decorators/DI/module registration adds ceremony that doesn't earn its weight on a low-complexity solo project
- Shared TypeBox `Static<typeof Schema>` types exportable to frontend from a `shared/types` package — prevents API/client drift

**Plugins:**
| Plugin | Purpose |
|---|---|
| `@fastify/jwt` | JWT sign/verify, token extraction middleware |
| `@fastify/cors` | CORS headers for SPA → API requests |
| `@fastify/cookie` | Cookie support for token storage |
| `@fastify/type-provider-typebox` | TypeBox schema integration |

---

### ADR-003: Database

**Decision:** PostgreSQL 16 (`postgres:16-alpine`)

**Rationale:**
- Production-grade relational database with full MVCC, proper `DATE` type, `UNIQUE` constraints — correct fit for the task and label data model
- `(user_id, created_at)` composite index is standard Postgres tooling
- `postgres:16-alpine` image is lean (~80MB); named Docker volume persists data across restarts
- Health check: `pg_isready`; API container uses `depends_on: db: condition: service_healthy` to avoid startup race conditions

**Docker Compose service:**
```yaml
db:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB}
  volumes:
    - db_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
    interval: 5s
    retries: 5
```

---

### ADR-004: Query Layer

**Decision:** `postgres` npm package (raw SQL, tagged template literals) — no ORM

**Rationale:**
- The `postgres` package (Porsager) uses tagged template literals for safe parameterised queries — no SQL injection risk, no query builder abstraction to learn
- Async/await native, TypeScript generic return typing (`sql<Task[]>\`...\``), built-in connection pooling
- SQL is readable, diffable in git, and auditable without decoding ORM-generated queries
- No binary sidecar, no code-gen step, no migration engine dependency — full control

**Query file structure:**
```
backend/src/db/
  client.ts          ← opens postgres connection, exports `sql`
  schema.sql         ← CREATE TABLE statements (source of truth)
  migrate.ts         ← 30-line runner: reads migrations/*.sql, tracks in _migrations table
  migrations/        ← versioned SQL files (001_init.sql, 002_add_deadline_index.sql …)
  queries/
    tasks.ts         ← getTasks, createTask, completeTask, deleteTask …
    auth.ts          ← getUserByEmail, createUser …
    subtasks.ts      ← getSubtasks, createSubtask, completeSubtask, deleteSubtask …
    labels.ts        ← getLabels, addLabelToTask, removeLabelFromTask …
```

**Example pattern:**
```typescript
import { sql } from '../client'
import type { Task } from '../../../shared/types'

export const getTasks = (userId: number) =>
  sql<Task[]>`
    SELECT * FROM tasks
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
```

---

### ADR-005: Testing Stack

**Decision:** Vitest (unit/integration) + Testcontainers (`@testcontainers/postgresql`) + Playwright (E2E)

**Rationale:**
- **Vitest** — Vite-native test runner, Jest-compatible API, runs on both frontend and backend; single test runner across the monorepo
- **Testcontainers** — spins up a real `postgres:16-alpine` container per backend test suite; migrations run against it; tests are hermetic and validate real SQL behaviour (constraints, `ON CONFLICT DO UPDATE`, `RETURNING`)
- **Playwright** — E2E tests run against the full Docker Compose stack; same environment as production; `playwright.config.ts` targets `http://localhost:3000`
- No mocking of the database in integration tests — the `postgres` raw SQL queries must be validated against a real engine

**Backend test setup pattern:**
```typescript
// test/helpers/db.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import postgres from 'postgres'
import { runMigrations } from '../../src/db/migrate'

export async function createTestDb() {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start()
  const sql = postgres(container.getConnectionUri())
  await runMigrations(sql)
  return { sql, container }
}
```

**Coverage target:** ≥70% meaningful coverage (PRD NFR) — query functions and auth middleware are primary targets.

---

### ADR-006: Docker Compose Architecture

**Decision:** Three-service Docker Compose — `db` (PostgreSQL), `api` (Fastify), `web` (nginx serving Vite static build)

**Service topology:**
```
User → web (nginx :3000)
         ├── /           → serves Vite static bundle
         └── /api/*      → proxied to api (:3001)
api (Fastify :3001) → db (PostgreSQL :5432)
```

**Rationale:**
- nginx reverse proxy on the frontend service routes `/api/*` to the backend — no CORS issues in production, no hardcoded backend URLs in the frontend bundle (relative `/api/...` paths only)
- Multi-stage Dockerfiles: `node:alpine` to build, `nginx:alpine` to serve (frontend); `node:alpine` build + runtime (backend)
- `.env.example` committed; `.env` gitignored — no secrets in the compose file
- `docker-compose up --build` is the complete, zero-configuration deployment

---

### Architectural Decisions Summary

| Decision | Choice |
|---|---|
| Frontend framework | Vite + React + TypeScript |
| Client-side routing | React Router v7 |
| Server state / optimistic UI | TanStack Query |
| Design system | 8bitcn-ui (shadcn/ui + Radix UI + Tailwind CSS) |
| Backend framework | Fastify + TypeScript |
| Schema validation & types | TypeBox (`@sinclair/typebox` + `@fastify/type-provider-typebox`) |
| Database | PostgreSQL 16 (`postgres:16-alpine`) |
| Query layer | `postgres` npm package — raw SQL, no ORM |
| Unit/integration testing | Vitest + Testcontainers (real PostgreSQL) |
| E2E testing | Playwright (against Docker Compose stack) |
| Deployment | Docker Compose — 3 services (db, api, web) |

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block implementation):**
- Data model finalised (4 tables — no score or seed task tables; task count derived client-side)
- JWT auth via httpOnly cookie confirmed
- API route surface defined
- Frontend state management split confirmed (TanStack Query = server state, React local state = UI state)

**Deferred to Post-MVP:**
- CI/CD pipeline
- OAuth (Phase 2)
- PWA / mobile-first (Phase 2)

---

### Data Architecture

#### Schema (4 tables)

```sql
-- users
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tasks
CREATE TABLE tasks (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  deadline     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- labels (normalised per user; reusable across tasks)
CREATE TABLE labels (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  UNIQUE(user_id, name)
);

-- task_labels (join table)
CREATE TABLE task_labels (
  task_id  INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- subtasks (flat, one level only)
CREATE TABLE subtasks (
  id           SERIAL PRIMARY KEY,
  task_id      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Task Count Derivation (client-side, no separate query)

The completed/total count (e.g. `3/5`) displayed in the header is derived directly from the already-fetched task list on the client:

```typescript
// Computed from TanStack Query cache — no extra API call
const completed = tasks.filter(t => t.is_completed).length;
const total = tasks.length;
// Display: `${completed}/${total} tasks`
```

**Advantages:** Zero additional API round-trips; count is always in sync with the rendered list; toggling a task updates both the list and the count atomically via the optimistic UI pattern.

#### Recommended Indexes

```sql
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_completed ON tasks(user_id, is_completed);
CREATE INDEX idx_tasks_deadline ON tasks(user_id, deadline) WHERE deadline IS NOT NULL;
```

#### Migration Approach

Versioned `.sql` files in `backend/src/db/migrations/` (e.g. `001_init.sql`, `002_add_deadline_index.sql`). A lightweight `migrate.ts` runner (~30 lines) reads files in order, tracking applied migrations in a `_migrations` table. No ORM migration engine dependency.

---

### Authentication & Security

| Concern | Decision |
|---|---|
| Token storage | `httpOnly`, `SameSite=Strict`, `Secure` cookie — JS cannot read token |
| CSRF mitigation | `SameSite=Strict` cookie attribute |
| Email pre-fill | `localStorage` key `bmad_todo_email` — stores email string only, not token |
| JWT expiry | 30 days (long-lived session per FR3) |
| Refresh token | None in MVP — expiry redirects to login |
| Password hashing | `bcrypt`, 12 rounds |
| Token validation | Fastify `onRequest` hook via `@fastify/jwt` on all authenticated routes |
| Sensitive data logging | Prohibited — auth routes never log request bodies |

---

### API & Communication Patterns

#### Route Surface

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/tasks              ?label=&status=&deadline=&sort=
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
PATCH  /api/tasks/:id/complete
PATCH  /api/tasks/:id/uncomplete

GET    /api/tasks/:id/subtasks
POST   /api/tasks/:id/subtasks
PATCH  /api/tasks/:id/subtasks/:subId
DELETE /api/tasks/:id/subtasks/:subId

GET    /api/labels
DELETE /api/labels/:id

GET    /health
```

#### Error Response Shape (TypeBox-typed, consistent across all routes)

```json
{ "statusCode": 404, "error": "NOT_FOUND", "message": "Task not found" }
```

Standard HTTP status codes: 200/201 success · 400 validation error · 401 unauthenticated · 403 forbidden · 404 not found · 409 conflict · 500 internal.

---

### Frontend Architecture

#### State Management Split

| State type | Owner | Examples |
|---|---|---|
| Server state | TanStack Query | Task list, labels |
| UI state | React `useState` / `useReducer` | Expanded subtask panel, active filter, inline editor open |

No global state library (Zustand/Redux). TanStack Query's cache is the single source of truth for all server data.

#### Optimistic UI Pattern (all task mutations)

```typescript
useMutation({
  mutationFn: completeTask,
  onMutate: async (taskId) => {
    await queryClient.cancelQueries({ queryKey: ['tasks'] })
    const previous = queryClient.getQueryData(['tasks'])
    queryClient.setQueryData(['tasks'], (old) => /* apply optimistic update */)
    return { previous }
  },
  onError: (_err, _taskId, context) => {
    queryClient.setQueryData(['tasks'], context.previous) // rollback
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
})
```

#### Component File Structure

```
frontend/src/
  components/
    AppHeader.tsx + AppHeader.test.tsx
    TaskRow.tsx + TaskRow.test.tsx
    SubtaskPanel.tsx + SubtaskPanel.test.tsx
    FilterBar.tsx + FilterBar.test.tsx
    TaskCountDisplay.tsx
    EmptyState.tsx
    InlineTaskError.tsx
  pages/
    TaskListPage.tsx
    LoginPage.tsx
    RegisterPage.tsx
  hooks/
    useTasks.ts
    useAuth.ts
  lib/
    api.ts          ← typed fetch wrapper (all requests go through here)
    auth.ts         ← cookie/localStorage helpers
  shared/           ← TypeBox Static<> types shared with backend
```

---

### Infrastructure & Deployment

#### Docker Compose Topology

```
User → web (nginx :3000)
         ├── /          → Vite static bundle
         └── /api/*     → proxied to api:3001
api (Fastify :3001) → db (PostgreSQL :5432)
```

#### nginx Configuration (frontend container)

```nginx
location /api/ {
  proxy_pass http://api:3001/api/;
}
location / {
  root /usr/share/nginx/html;
  try_files $uri $uri/ /index.html;  -- SPA routing fallback
}
```

#### Environment Variables

| Variable | Service | Purpose |
|---|---|---|
| `DATABASE_URL` | api | PostgreSQL connection string |
| `JWT_SECRET` | api | JWT signing secret |
| `POSTGRES_USER` | db, api | PostgreSQL user |
| `POSTGRES_PASSWORD` | db, api | PostgreSQL password |
| `POSTGRES_DB` | db | Database name |
| `NODE_ENV` | api | `production` \| `development` |
| `PORT` | api | Fastify listen port (default 3001) |

`.env.example` committed with all keys documented and placeholder values. `.env` gitignored.

#### Logging

`pino` (Fastify built-in). Structured JSON. Level `info` in production, `debug` in development. Auth routes never log request bodies.

---

## Implementation Patterns & Consistency Rules

### Naming Patterns

#### Database — `snake_case` throughout

| Element | Convention | Example |
|---|---|---|
| Tables | lowercase plural | `tasks`, `users`, `labels`, `subtasks`, `task_labels` |
| Columns | `snake_case` | `user_id`, `is_completed`, `completed_at`, `deadline` |
| Foreign keys | `{singular_table}_id` | `user_id`, `task_id`, `label_id` |
| Indexes | `idx_{table}_{column(s)}` | `idx_tasks_user_id`, `idx_tasks_completed` |
| Migrations | zero-padded sequence | `001_init.sql`, `002_add_deadline_index.sql` |

#### API — REST conventions

| Element | Convention | Example |
|---|---|---|
| Endpoints | plural nouns | `/api/tasks`, `/api/labels` |
| Route params | `:name` style | `:id`, `:subId` |
| Query params | `camelCase` | `?status=active`, `?label=backend` |
| JSON body fields | `camelCase` | `isCompleted`, `completedAt` |

#### TypeScript code

| Element | Convention | Example |
|---|---|---|
| React component files | `PascalCase.tsx` | `TaskRow.tsx`, `AppHeader.tsx` |
| Hook / util files | `camelCase.ts` | `useTasks.ts`, `api.ts`, `auth.ts` |
| React components | `PascalCase` | `TaskRow`, `SubtaskPanel`, `FilterBar` |
| Hooks | `use` prefix + `camelCase` | `useTasks`, `useAuth` |
| Functions | `camelCase` | `getTasksByUser`, `completeTask`, `createLabel` |
| Constants | `SCREAMING_SNAKE_CASE` | `JWT_COOKIE_NAME`, `MAX_LABEL_LENGTH` |
| TypeBox schemas | `PascalCase` + `Schema` suffix | `TaskSchema`, `CreateTaskBodySchema` |
| TypeBox types | `PascalCase` (via `Static<>`) | `type Task = Static<typeof TaskSchema>` |

---

### Structure Patterns

#### Test organisation

Tests live in a dedicated `test/` folder mirroring `src/` structure — **never co-located** with source files.

| Source file | Test file |
|---|---|
| `backend/src/db/queries/tasks.ts` | `backend/test/db/queries/tasks.test.ts` |
| `backend/src/routes/tasks.ts` | `backend/test/routes/tasks.test.ts` |
| `frontend/src/components/TaskRow.tsx` | `frontend/test/components/TaskRow.test.tsx` |
| `frontend/src/hooks/useTasks.ts` | `frontend/test/hooks/useTasks.test.ts` |

Vitest config: `include: ['test/**/*.test.ts']` (backend) and `include: ['test/**/*.test.tsx?']` (frontend).

#### Backend query organisation

One file per domain in `db/queries/` — `tasks.ts`, `auth.ts`, `labels.ts`, `subtasks.ts`. Each exports named async functions only. No classes, no default exports.

#### Fastify route organisation

One file per resource in `routes/` — `tasks.ts`, `auth.ts`, `labels.ts`. Each file exports a Fastify plugin using `fastify-plugin` (`fp`) wrapping its routes.

#### Shared types

TypeBox `Static<>` types defined once in `shared/types/` at the repo root. Both frontend and backend import from there. No duplicate interface definitions across packages.

---

### Format Patterns

#### API responses

**Success — single resource:** Return the resource object directly (no wrapper):
```json
{ "id": 1, "title": "Write tests", "isCompleted": false }
```

**Success — collection:** Return an array directly:
```json
[{ "id": 1, "title": "..." }, { "id": 2, "title": "..." }]
```

**Error — all routes:** Standard shape, always:
```json
{ "statusCode": 404, "error": "NOT_FOUND", "message": "Task not found" }
```

#### Date / time in JSON

ISO 8601 strings always — `"2026-02-23T09:00:00.000Z"`. Date-only fields: `"2026-02-23"`. **Never Unix timestamps** in API responses.

#### Booleans

Always `true` / `false` — never `1` / `0`.

---

### Process Patterns

#### Error handling — backend

All route handlers use try/catch. Fastify `setErrorHandler` provides the global fallback formatting any unhandled error into the standard error shape. Route-level errors use `createError(statusCode, errorCode, message)`.

#### Error handling — frontend

TanStack Query `onError` handles mutation failures: rollback optimistic state, set inline error flag on the affected task. A React Error Boundary wrapping the app catches uncaught errors — full-page error state, never silent.

#### Loading states

| Scenario | Pattern |
|---|---|
| Task list initial load | 4 skeleton rows (same height as `TaskRow`) |
| Task create / complete / delete | Optimistic UI — no spinner |
| Auth form submit | Button disabled + pixel spinner during request |

#### Auth flow

1. App load → `GET /api/auth/me` to validate JWT cookie
2. Valid → render app; Invalid/expired → redirect to `/login`
3. Login success → server sets `httpOnly` cookie; client saves email to `localStorage` key `bmad_todo_email`
4. Logout → `POST /api/auth/logout` clears cookie server-side; client clears `localStorage` email; redirects to `/login`

#### Filter / sort (MVP)

Filter and sort state lives in React `useState` in `TaskListPage`. Applied **client-side** on TanStack Query cache result. `GET /api/tasks` accepts query params for future use but frontend does not send them in MVP.

---

### Enforcement Guidelines

**All AI agents MUST:**
- Use `camelCase` for all TypeScript identifiers and all JSON body field names
- Use `snake_case` for all SQL identifiers (tables, columns, indexes)
- Return `{ statusCode, error, message }` for every API error — no exceptions
- Place test files in `test/` mirroring `src/` — never co-located with source
- Import entity types (`Task`, `User`, `Label` …) from `shared/types` — never redefine locally
- Never log request bodies on auth routes
- Never use `any` in TypeScript — use `unknown` and narrow, or define a TypeBox schema
- Apply the TanStack Query optimistic mutation pattern for all task mutations
- Validate all API inputs with TypeBox schemas via `@fastify/type-provider-typebox`

**Anti-patterns — never produce:**
- `{ data: { ... } }` wrapper objects in API success responses — return resources directly
- JWT token in `localStorage` — `httpOnly` cookie only
- Auto-completing parent task when all subtasks complete — explicitly forbidden (FR22)
- `*.test.ts` files placed next to source files — always mirror path under `test/`
- Unix timestamps in API responses — ISO 8601 strings only
- Duplicate type interfaces for the same entity across frontend / backend packages

---

## Project Structure & Boundaries

### Complete Directory Structure

```
bmad-todo-app/
├── .env.example
├── .env                          ← gitignored
├── .gitignore
├── README.md
├── docker-compose.yml
│
├── shared/                       ← TypeBox Static<> types shared by frontend + backend
│   └── types/
│       ├── task.ts               ← Task, CreateTaskBody, UpdateTaskBody
│       ├── subtask.ts
│       ├── label.ts
│       └── auth.ts               ← LoginBody, RegisterBody, AuthUser
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts          ← include: ['test/**/*.test.tsx?']
│   ├── tailwind.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx              ← React root, TanStack Query provider
│   │   ├── App.tsx               ← Router, auth guard
│   │   ├── components/
│   │   │   ├── AppHeader.tsx
│   │   │   ├── TaskRow.tsx
│   │   │   ├── SubtaskPanel.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── TaskCountDisplay.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── InlineTaskError.tsx
│   │   ├── pages/
│   │   │   ├── TaskListPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── hooks/
│   │   │   ├── useTasks.ts
│   │   │   └── useAuth.ts
│   │   └── lib/
│   │       ├── api.ts            ← typed fetch wrapper; all requests go through here
│   │       └── auth.ts           ← localStorage email helpers
│   └── test/                     ← mirrors src/ structure
│       ├── components/
│       │   ├── AppHeader.test.tsx
│       │   ├── TaskRow.test.tsx
│       │   ├── SubtaskPanel.test.tsx
│       │   └── FilterBar.test.tsx
│       ├── pages/
│       │   └── TaskListPage.test.tsx
│       └── hooks/
│           ├── useTasks.test.ts
│           └── useAuth.test.ts
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts          ← include: ['test/**/*.test.ts']
│   ├── src/
│   │   ├── main.ts               ← Fastify server entry, plugin registration, listen()
│   │   ├── app.ts                ← createApp() factory — testable without listen()
│   │   ├── db/
│   │   │   ├── client.ts         ← postgres() connection, exports `sql`
│   │   │   ├── migrate.ts        ← ~30-line migration runner
│   │   │   ├── schema.sql        ← CREATE TABLE source of truth
│   │   │   ├── migrations/
│   │   │   │   └── 001_init.sql
│   │   │   └── queries/
│   │   │       ├── tasks.ts
│   │   │       ├── subtasks.ts
│   │   │       ├── labels.ts
│   │   │       ├── scores.ts
│   │   │       └── auth.ts
│   │   ├── routes/
│   │   │   ├── auth.ts           ← POST /api/auth/register|login|logout, GET /api/auth/me
│   │   │   ├── tasks.ts          ← GET|POST /api/tasks, PATCH|DELETE /api/tasks/:id, PATCH .../complete|uncomplete
│   │   │   ├── subtasks.ts       ← GET|POST|PATCH|DELETE /api/tasks/:id/subtasks/:subId
│   │   │   ├── labels.ts         ← GET /api/labels, DELETE /api/labels/:id
│   │   │   └── health.ts         ← GET /health
│   │   ├── middleware/
│   │   │   └── authenticate.ts   ← JWT cookie validation, attaches user to request
│   │   └── plugins/
│   │       ├── jwt.ts            ← @fastify/jwt registration
│   │       ├── cookie.ts         ← @fastify/cookie registration
│   │       └── cors.ts           ← @fastify/cors registration
│   └── test/                     ← mirrors src/ structure
│       ├── helpers/
│       │   └── db.ts             ← createTestDb() with Testcontainers PostgreSQL
│       ├── db/
│       │   └── queries/
│       │       ├── tasks.test.ts
│       │       ├── subtasks.test.ts
│       │       └── auth.test.ts
│       └── routes/
│           ├── auth.test.ts
│           ├── tasks.test.ts
│           ├── subtasks.test.ts
│           └── labels.test.ts
│
└── e2e/                          ← Playwright E2E tests (against full Docker Compose stack)
    ├── playwright.config.ts      ← baseURL: http://localhost:3000
    └── tests/
        ├── auth.spec.ts          ← registration, login, session continuity, email pre-fill
        ├── tasks.spec.ts         ← create, complete, delete, edit
        ├── subtasks.spec.ts      ← add, complete, expand/collapse
        ├── filters.spec.ts       ← filter by label / status / deadline
        └── count.spec.ts         ← task count display (3/5) on completion and creation
```

---

### Architectural Boundaries

#### API Boundary

- All frontend ↔ backend communication via `/api/*` REST endpoints (JSON)
- nginx reverse proxy on the frontend container routes `/api/*` → `api:3001` — no direct browser → backend connection
- No server-side rendering; all HTML served as a static Vite bundle
- Authentication boundary enforced by `authenticate.ts` middleware on every route except `/api/auth/register`, `/api/auth/login`, `/health`

#### Data Access Boundary

- Only `backend/src/db/queries/` files may issue SQL queries — routes never call `sql` directly
- All queries parameterised via `postgres` tagged template literals — no string concatenation
- Per-user isolation enforced at query level: every query includes `WHERE user_id = $userId`

#### Shared Types Boundary

- `shared/types/` is the single source of truth for entity shapes
- Frontend `lib/api.ts` returns types imported from `shared/types/`
- Backend TypeBox schemas extend types from `shared/types/` — no redefinition

---

### Requirements → Structure Mapping

| FR Category | Primary Files |
|---|---|
| Auth & Session (FR1–5) | `backend/src/routes/auth.ts`, `backend/src/middleware/authenticate.ts`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/lib/auth.ts` |
| Task CRUD (FR6–11) | `backend/src/routes/tasks.ts`, `backend/src/db/queries/tasks.ts`, `frontend/src/pages/TaskListPage.tsx`, `frontend/src/components/TaskRow.tsx` |
| Task Enrichment & Count (FR12–21) | `backend/src/routes/subtasks.ts` + `labels.ts`, `backend/src/db/queries/subtasks.ts` + `labels.ts`, `frontend/src/components/SubtaskPanel.tsx`, `frontend/src/components/TaskCountDisplay.tsx` |
| Organisation & Discovery (FR22–25) | `frontend/src/components/FilterBar.tsx`, `frontend/src/pages/TaskListPage.tsx` (client-side filter/sort) |
| UX & Feedback (FR26–29) | `frontend/src/components/InlineTaskError.tsx`, TanStack Query optimistic mutation pattern in `frontend/src/hooks/useTasks.ts` |

---

### Data Flow

```
User action
  → React component (optimistic state update via TanStack Query)
  → lib/api.ts typed fetch
  → nginx /api/* proxy
  → Fastify route (TypeBox request validation)
  → authenticate.ts middleware (JWT cookie)
  → db/queries/*.ts (raw SQL via `postgres` tagged templates)
  → PostgreSQL
  ← typed result row(s)
  ← JSON response (camelCase fields, ISO 8601 dates)
  ← TanStack Query cache update (or rollback on error)
  ← React re-render
```

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility:** All technology choices are mutually compatible. Vite + React + TypeBox on the frontend share the same TypeScript type system as Fastify + TypeBox on the backend. The `postgres` driver is async-first, consistent with Fastify's async route model. `httpOnly` cookie JWT pairs correctly with `@fastify/jwt` + `@fastify/cookie`. PostgreSQL 16 and Testcontainers are fully compatible.

**Pattern consistency:** `camelCase` JSON body ↔ `snake_case` SQL is consistently applied; TypeBox `Static<>` types bridge both at compile time. The `test/` mirror convention is applied identically to `frontend/` and `backend/`. The optimistic UI pattern (TanStack Query) is specified uniformly for all task mutations.

**Structure alignment:** All architectural boundaries (API, data access, shared types) map cleanly to the directory tree. The nginx proxy eliminates CORS issues without requiring any hardcoded backend URL in the frontend bundle.

---

### Requirements Coverage Validation ✅

| FR Range | Coverage |
|---|---|
| FR1–5 — Auth & Session | `routes/auth.ts`, `middleware/authenticate.ts`, `httpOnly` cookie, `localStorage` email pre-fill |
| FR6–11 — Task CRUD | `routes/tasks.ts`, `db/queries/tasks.ts`, `TaskRow.tsx` |
| FR12–21 — Labels, Deadlines, Subtasks, Count | `routes/labels.ts` + `subtasks.ts`, `SubtaskPanel.tsx`, `TaskCountDisplay.tsx` (client-side derived count); FR no-auto-complete enforced by pattern rule |
| FR22–25 — Filter & Sort | `FilterBar.tsx`, client-side filter on TanStack Query cache |
| FR26–29 — UX & Feedback | `InlineTaskError.tsx`, optimistic UI rollback, sub-1s target met by Fastify + direct SQL |

**NFR coverage:**
- **Performance** — Optimistic UI + direct SQL queries; no ORM overhead
- **Security** — bcrypt (12 rounds), `httpOnly` cookie, per-user `WHERE user_id` on every query, no sensitive data logged
- **Accessibility** — 8bitcn-ui Radix UI primitives provide ARIA/keyboard nav; WCAG rules specified in patterns
- **Reliability** — Testcontainers integration tests + Playwright E2E against real stack; `docker-compose up` clean deploy
- **Deployment** — Three-service Docker Compose; `docker-compose up --build` is complete

---

### Gap Analysis

**Critical (resolve in first implementation story):**

1. **`shared/types/` import mechanism** — `frontend/` and `backend/` are separate packages. Configure as **npm/pnpm workspaces** or add `"paths": { "shared/*": ["../../shared/*"] }` to both `tsconfig.json` files. Must be the first implementation task.

**Minor (handle during implementation):**

2. **`tasks.updated_at` auto-update** — needs a PostgreSQL trigger (`BEFORE UPDATE`) or explicit `SET updated_at = NOW()` in every UPDATE query. Add trigger in `001_init.sql`.
3. **`PATCH /api/tasks/:id` partial body schema** — use `Type.Partial(TaskSchema)` from TypeBox; document in the route file.
4. **Playwright + Docker Compose dependency** — `playwright.config.ts` should include `webServer` config or README note that `docker-compose up` must be running before `npx playwright test`.

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analysed
- [x] Scale and complexity assessed (low complexity, solo dev, monolith)
- [x] Technical constraints identified (no SSR, no WebSockets, Docker Compose only)
- [x] Cross-cutting concerns mapped (JWT auth, per-user isolation, optimistic UI, task count derivation, WCAG 2.1 AA)

**✅ Architectural Decisions**
- [x] Technology stack fully specified with rationale (6 ADRs)
- [x] Integration patterns defined (nginx proxy, shared types, cookie auth)
- [x] Database schema finalised (4 tables, task count derived client-side)
- [x] Performance and security approaches addressed

**✅ Implementation Patterns**
- [x] Naming conventions established (`snake_case` DB, `camelCase` TS/JSON)
- [x] Test structure defined (`test/` mirrors `src/`)
- [x] Error handling patterns documented (backend + frontend)
- [x] Anti-pattern list defined and enforcement guidelines written

**✅ Project Structure**
- [x] Complete directory tree defined for all three packages
- [x] All component boundaries documented
- [x] Requirements → file mapping complete
- [x] End-to-end data flow documented

### Architecture Readiness Assessment

**Overall Status: ✅ READY FOR IMPLEMENTATION**

**Key strengths:**
- Minimal surface area — every dependency earns its place
- Client-side task count derivation eliminates server-side aggregation complexity entirely
- Shared TypeBox types prevent frontend/backend drift at compile time
- Docker Compose topology with nginx proxy is clean, auditable, and zero-config
- `test/` mirror structure enforces discipline without co-location noise

**Areas for future enhancement (post-MVP):**
- OAuth (Phase 2)
- PWA / service worker (Phase 2)
- npm/pnpm workspace formalisation if `shared/` grows
- CI/CD pipeline (GitHub Actions)

### Implementation Handoff

**First implementation task:** Initialise the monorepo structure and configure `shared/types/` imports (npm workspaces or `tsconfig` path aliases) before any feature work begins.

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented — no local reinterpretation
- Apply implementation patterns consistently across all components
- Refer to this document for all architectural questions before making independent decisions
- The `shared/types/` folder is the single source of truth for all entity shapes — never redefine locally
