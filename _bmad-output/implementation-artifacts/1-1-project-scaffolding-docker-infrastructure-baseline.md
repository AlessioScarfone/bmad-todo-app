# Story 1.1: Project Scaffolding & Docker Infrastructure Baseline

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the complete project scaffolded (Vite + React + TS frontend, Fastify + TS backend, PostgreSQL 16 database) running as three Docker Compose services with a health-verified startup sequence,
So that there is a verified, runnable baseline (`docker-compose up`) to build all features on top of.

## Acceptance Criteria

**AC1 — Clean start from clone:**
- **Given** a developer clones the repo and creates a `.env` from `.env.example`
- **When** they run `docker-compose up --build`
- **Then** all three services (`db`, `api`, `web`) start successfully with no manual configuration steps required
- **And** the `web` service is accessible at `http://localhost:3000` and returns an HTML response

**AC2 — Health check:**
- **Given** the Docker Compose stack is running
- **When** a request is made to `GET http://localhost:3000/api/health`
- **Then** the API returns `200 OK` (proxied through nginx)
- **And** the PostgreSQL service is healthy (`pg_isready` passes)

**AC3 — Migration runner:**
- **Given** the migration runner executes on API startup
- **When** `migrate.ts` completes
- **Then** the `_migrations` table exists and `001_init.sql` is recorded as applied
- **And** the `users` table exists with columns: `id`, `email`, `password_hash`, `created_at`

## Tasks / Subtasks

- [x] **Task 1: Repository & root setup** (AC: all)
  - [x] 1.1 Initialise git repo at project root with `.gitignore` (covers `node_modules/`, `.env`, `dist/`, `*.log`)
  - [x] 1.2 Create `.env.example` with all required variables (see Dev Notes — Environment Variables)
  - [x] 1.3 Create `.env` locally from `.env.example` (never committed)
  - [x] 1.4 Create `shared/types/` directory with `index.ts` exporting TypeBox `Static<>` types (Task, User, Subtask, Label); these are imported by both frontend and backend

- [x] **Task 2: Frontend scaffolding** (AC: AC1)
  - [x] 2.1 Run `npm create vite@latest frontend -- --template react-ts` at repo root
  - [x] 2.2 Install UI and routing dependencies: `react-router-dom@7`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/react-*` (as needed per 8bitcn-ui), `class-variance-authority`, `clsx`, `tailwind-merge`
  - [x] 2.3 Configure Tailwind (`tailwind.config.ts`, `postcss.config.js`), add Press Start 2P Google Fonts `<link>` in `frontend/index.html`
  - [x] 2.4 Set up basic routing skeleton in `frontend/src/main.tsx`: `BrowserRouter` → `Routes` with placeholder `LoginPage`, `RegisterPage`, `TaskListPage`
  - [x] 2.5 Configure `frontend/vite.config.ts` — no `/api` proxy needed in dev (nginx handles it in production); set `base: '/'`
  - [x] 2.6 Write multi-stage `frontend/Dockerfile` (build stage: `node:20-alpine`, serve stage: `nginx:alpine`)
  - [x] 2.7 Write `frontend/nginx.conf`: serve static bundle, `/api/*` proxy to `api:3001`, SPA fallback to `/index.html`

- [x] **Task 3: Backend scaffolding** (AC: AC2, AC3)
  - [x] 3.1 Create `backend/` directory, run `npm init -y`, install production deps:
    `fastify @fastify/jwt @fastify/cors @fastify/cookie @sinclair/typebox @fastify/type-provider-typebox postgres bcrypt pino`
  - [x] 3.2 Install dev deps: `typescript @types/node @types/bcrypt tsx vitest @testcontainers/postgresql`
  - [x] 3.3 Create `backend/tsconfig.json` (strict mode, `moduleResolution: bundler`, target `ESNext`, `outDir: dist`)
  - [x] 3.4 Create `backend/src/server.ts` — Fastify instance wired with `@fastify/cors`, `@fastify/cookie`, `@fastify/jwt` (secret from `JWT_SECRET` env var), health route `GET /health → 200 { status: "ok" }`; **do NOT register auth/task routes yet** (those belong to later stories)
  - [x] 3.5 Create `backend/src/db/client.ts` — opens `postgres` connection from `DATABASE_URL` env var; exports `sql` tagged-template function
  - [x] 3.6 Create `backend/src/db/migrate.ts` — ~30 line runner: ensure `_migrations` table exists, read `migrations/*.sql` in alphabetical order, skip already-applied files, record each in `_migrations`
  - [x] 3.7 Create `backend/src/db/migrations/001_init.sql` — creates the `users` table only (see schema below); **do NOT create tasks, labels, task_labels, subtasks yet**
  - [x] 3.8 Wire `migrate.ts` to run on API startup before Fastify `.listen()` call
  - [x] 3.9 Write `backend/Dockerfile` (multi-stage: `node:20-alpine` build + runtime; `EXPOSE 3001`)

- [x] **Task 4: Docker Compose** (AC: AC1, AC2)
  - [x] 4.1 Create `docker-compose.yml` at repo root with three services: `db`, `api`, `web` (see exact config in Dev Notes)
  - [x] 4.2 Ensure `api` uses `depends_on: db: condition: service_healthy` to avoid startup race condition
  - [x] 4.3 Ensure `web` uses `depends_on: [api]`
  - [x] 4.4 Define named volume `db_data` for PostgreSQL persistence
  - [x] 4.5 Verify `docker-compose up --build` starts cleanly; confirm `http://localhost:3000` returns HTML and `http://localhost:3000/api/health` returns 200

- [x] **Task 5: TypeScript shared types** (AC: all)
  - [x] 5.1 Create `shared/types/index.ts` with TypeBox schemas for `UserSchema`, `TaskSchema` (placeholder — full Task schema comes in Story 2.1), `ErrorResponseSchema`
  - [x] 5.2 Ensure `backend/tsconfig.json` has `paths` or relative import resolving `shared/types` (e.g. `../../shared/types`)
  - [x] 5.3 Ensure `frontend/tsconfig.json` similarly resolves `shared/types`

- [x] **Task 6: Basic tests for migration runner** (AC: AC3)
  - [x] 6.1 Create `backend/test/helpers/db.ts` — `createTestDb()` using `@testcontainers/postgresql`; starts `postgres:16-alpine` container, runs `migrate.ts`, returns `{ sql, container }`
  - [x] 6.2 Write `backend/test/db/migrate.test.ts` — asserts:
    - `_migrations` table exists after `migrate.ts` runs
    - `001_init.sql` is recorded in `_migrations`
    - `users` table exists with columns `id`, `email`, `password_hash`, `created_at`
    - `users` table does NOT have `points`, `score`, `is_system`, or other gamification columns
  - [x] 6.3 Run `vitest run` to confirm tests pass

## Dev Notes

### Architecture Compliance

This story establishes the **entire project skeleton**. All subsequent stories build on top of it. No feature logic (auth, tasks, labels, subtasks, filtering) belongs in this story — only infrastructure and the verified running baseline.

**Technology stack (mandatory — no deviations):**

| Layer | Technology | Version constraint |
|---|---|---|
| Frontend build | Vite + React + TypeScript | Latest stable via `npm create vite@latest` |
| Client routing | React Router v7 | `react-router-dom@7` |
| Server state | TanStack Query | Latest stable `@tanstack/react-query` |
| Design system | 8bitcn-ui (shadcn/ui + Radix UI + Tailwind CSS) | Per 8bitcn-ui docs |
| Backend | Fastify + TypeScript | Latest stable |
| Schema validation | TypeBox | `@sinclair/typebox` + `@fastify/type-provider-typebox` |
| Database | PostgreSQL 16 | `postgres:16-alpine` Docker image |
| Query layer | `postgres` npm package | Raw SQL — **NO ORM** |
| Testing | Vitest + Testcontainers + Playwright | |
| Logging | pino (Fastify built-in) | structured JSON, level `info` in production |

**Do NOT use:** Express, Prisma, Drizzle, Sequelize, class-transformer, NestJS, Next.js, Remix, Storybook, Redux, Zustand, Axios (use native `fetch`).

---

### Database Schema — This Story (001_init.sql)

Only the `users` table is created in this story. All other tables belong to later stories:

```sql
-- 001_init.sql
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**What NOT to create here:** `tasks`, `labels`, `task_labels`, `subtasks`, `_migrations` (that's created by `migrate.ts` itself), any index beyond what Postgres creates automatically for PRIMARY KEY and UNIQUE.

> ⚠️ **Naming discrepancy in planning docs:** The epics AC and architecture both reference file `001_init.sql`. The migration strategy note in epics uses `001_auth.sql`. Use **`001_init.sql`** — it matches both the AC and the architecture file tree.

---

### Project File Structure

The final structure after this story:

```
bmad-todo-app/
├── .env                        ← local only, gitignored
├── .env.example                ← committed, all vars with placeholder values
├── .gitignore
├── docker-compose.yml
├── shared/
│   └── types/
│       └── index.ts            ← TypeBox Static<> shared types (User, Task placeholder, ErrorResponse)
├── frontend/
│   ├── Dockerfile              ← multi-stage: node:20-alpine build → nginx:alpine serve
│   ├── nginx.conf              ← / → static bundle, /api/* → api:3001, SPA fallback
│   ├── index.html              ← includes Press Start 2P Google Font <link>
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   └── src/
│       ├── main.tsx            ← BrowserRouter + Routes skeleton
│       ├── App.tsx
│       ├── pages/
│       │   ├── TaskListPage.tsx   ← placeholder
│       │   ├── LoginPage.tsx      ← placeholder
│       │   └── RegisterPage.tsx   ← placeholder
│       ├── components/            ← empty, populated in later stories
│       ├── hooks/                 ← empty
│       └── lib/
│           ├── api.ts             ← typed fetch wrapper skeleton (empty for now)
│           └── auth.ts            ← cookie/localStorage helpers skeleton
└── backend/
    ├── Dockerfile              ← multi-stage: node:20-alpine build + runtime
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── server.ts           ← Fastify instance + health route only
        └── db/
            ├── client.ts       ← postgres connection from DATABASE_URL
            ├── migrate.ts      ← migration runner (~30 lines)
            ├── migrations/
            │   └── 001_init.sql  ← users table only
            └── queries/        ← empty directory, populated in Story 1.2+
    test/
        ├── helpers/
        │   └── db.ts           ← createTestDb() with Testcontainers
        └── db/
            └── migrate.test.ts ← migration assertions
```

---

### Docker Compose Configuration

Exact `docker-compose.yml` structure (adapt to match `.env` variable names):

```yaml
version: "3.9"

services:
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
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy

  web:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  db_data:
```

---

### Environment Variables (.env.example)

```bash
# Database
POSTGRES_USER=bmad_user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=bmad_todo

# API
JWT_SECRET=supersecretchangeme
NODE_ENV=development
PORT=3001
```

All of these must be documented in `.env.example`. The `.env` file is gitignored. **Never hardcode any of these in source code** — always read from `process.env`.

---

### nginx Configuration (frontend/nginx.conf)

```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://api:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Key points:
- `/api/*` proxied to `api:3001` — frontend uses relative `/api/...` paths only, no hardcoded backend URLs in the bundle
- SPA fallback (`try_files ... /index.html`) is required for React Router client-side routing

---

### Backend Health Route

```typescript
// backend/src/server.ts
fastify.get('/health', async () => ({ status: 'ok' }))
```

Accessible via `GET http://localhost:3000/api/health` (proxied through nginx). This is the only route in this story — auth routes belong to Story 1.2 and 1.3.

---

### migrate.ts Pattern

```typescript
// backend/src/db/migrate.ts
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import type { Sql } from 'postgres'

export async function runMigrations(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         SERIAL PRIMARY KEY,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    const [existing] = await sql`SELECT id FROM _migrations WHERE filename = ${file}`
    if (existing) continue

    const content = await readFile(path.join(migrationsDir, file), 'utf-8')
    await sql.unsafe(content)
    await sql`INSERT INTO _migrations (filename) VALUES (${file})`
    console.log(`Applied migration: ${file}`)
  }
}
```

Call this in `server.ts` before `fastify.listen()`. Pass in the `sql` instance from `db/client.ts`.

---

### Testing Standards

- **Test runner:** Vitest (configured in `backend/package.json` vitest config)
- **Test location:** `backend/test/` mirroring `backend/src/` structure (never co-locate tests with source files)
- **Integration tests use Testcontainers** — spawn real `postgres:16-alpine`, run `migrate.ts`, assert against real database engine
- **Coverage target:** ≥ 70% overall (PRD NFR16), but for this story the migration runner integration test is the primary deliverable
- **Do NOT mock the database** in integration tests — Testcontainers provides a real engine

**Mandatory test assertions for this story (migrate.test.ts):**
1. `_migrations` table exists after `runMigrations()` runs
2. `001_init.sql` is recorded in `_migrations.filename`
3. `users` table has columns: `id`, `email`, `password_hash`, `created_at`
4. `users` table does **NOT** have columns: `points`, `score`, `is_system` (regression guard against gamification column creep)

---

### Phased Migration Strategy

> [Source: epics.md — Story 1.1 migration strategy decision (QA-2)]

Each migration file is scoped to the story that first needs its table:

| Migration file | Story | Creates |
|---|---|---|
| `001_init.sql` | **1.1 (this story)** | `users` table |
| `002_tasks.sql` | 2.1 | `tasks` table + `idx_tasks_user_id`, `idx_tasks_completed` |
| `003_enrichment.sql` | 3.1 | `labels`, `task_labels`, `subtasks` tables + `idx_tasks_deadline` |

**Do not pre-create future tables in this story's migration.** The Testcontainers integration test in Story 2.1 will validate the `tasks` table schema.

---

### Cross-Story Context

**What comes after this story (do not implement, context only):**
- **Story 1.2** — User registration: `POST /api/auth/register`, bcrypt hashing, TypeBox schema validation
- **Story 1.3** — Login + JWT cookie: `POST /api/auth/login`, `GET /api/auth/me`, httpOnly cookie
- **Story 1.4** — Email pre-fill + logout: localStorage `bmad_todo_email`, `POST /api/auth/logout`
- All these stories reuse the `sql` client, `migrate.ts` runner, and shared TypeBox types scaffolded here

**Conventions established by this story (ALL subsequent stories must follow):**
- Relative `/api/...` paths only in frontend — **never** hardcode `http://localhost:3001`
- TypeScript strict mode throughout — no `any` without explicit comment
- `test/` mirrors `src/` structure — never co-locate test files with source
- `shared/types/` is the single source of truth for API contract types
- All env vars from `process.env` — no hardcoded values

---

### Project Structure Notes

- **Monorepo with three npm packages:** `frontend/`, `backend/`, `shared/` — no workspaces root `package.json` required for MVP
- `shared/types` is imported via relative paths (e.g. `../../shared/types`) in both frontend and backend tsconfig paths — no symlinks needed
- No Docker Compose `watch` or bind mounts for hot reload needed in this story — static build only. (Dev hot-reload setup can be added later via `docker-compose.override.yml`)

### References

- [Source: architecture.md — ADR-001 Frontend Framework]
- [Source: architecture.md — ADR-002 Backend Framework]
- [Source: architecture.md — ADR-003 Database]
- [Source: architecture.md — ADR-004 Query Layer]
- [Source: architecture.md — ADR-005 Testing Stack]
- [Source: architecture.md — ADR-006 Docker Compose Architecture]
- [Source: architecture.md — Data Architecture / Schema]
- [Source: architecture.md — Infrastructure & Deployment / Docker Compose Topology]
- [Source: architecture.md — Infrastructure & Deployment / nginx Configuration]
- [Source: architecture.md — Infrastructure & Deployment / Environment Variables]
- [Source: epics.md — Story 1.1 Acceptance Criteria]
- [Source: epics.md — Story 1.1 Migration Strategy Decision (QA-2)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (via GitHub Copilot)

### Debug Log References

- **JWT_SECRET type narrowing:** `buildServer()` refactored to accept `jwtSecret: string` parameter instead of reading `process.env.JWT_SECRET` directly inside the function — avoids `string | undefined` TS error with `@fastify/jwt`.
- **Tailwind v4:** Installed `tailwindcss@4` + `@tailwindcss/vite` (Vite plugin). CSS-based config via `@import "tailwindcss"` and `@theme` block in `index.css`. `tailwind.config.ts` and `postcss.config.js` kept for tooling compatibility.
- **Colima / Testcontainers:** Ryuk resource reaper disabled via `TESTCONTAINERS_RYUK_DISABLED=true` in npm test script — required because Colima's VirtioFS mount type does not support Unix socket bind-mounts needed by Ryuk. `DOCKER_HOST` must point to `unix:///Users/<user>/.colima/default/docker.sock`.

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created
- Story 1.1 is the foundation story: no auth routes, no task routes — only infrastructure and health endpoint
- Phased migration strategy confirmed: only `users` table in `001_init.sql` for this story
- Filename discrepancy between epics (QA-2 note uses `001_auth.sql`) and AC + architecture (`001_init.sql`) — resolved in favour of `001_init.sql`
- All 6 Vitest migration tests pass (Testcontainers + real postgres:16-alpine)
- Frontend TypeScript and Vite build both clean
- Backend TypeScript compiles cleanly (strict mode)

### File List

- `.gitignore` (modified — added node_modules/, .env, dist/, *.log)
- `.env.example` (created)
- `docker-compose.yml` (created)
- `shared/types/index.ts` (created)
- `frontend/Dockerfile` (created)
- `frontend/nginx.conf` (created)
- `frontend/index.html` (modified — Press Start 2P font, title)
- `frontend/package.json` (modified — added deps)
- `frontend/vite.config.ts` (modified — base: '/', Tailwind plugin)
- `frontend/tailwind.config.ts` (created)
- `frontend/postcss.config.js` (created)
- `frontend/tsconfig.app.json` (modified — shared/types paths alias)
- `frontend/src/index.css` (modified — @import tailwindcss, @theme)
- `frontend/src/main.tsx` (modified — BrowserRouter + Routes skeleton)
- `frontend/src/pages/LoginPage.tsx` (created)
- `frontend/src/pages/RegisterPage.tsx` (created)
- `frontend/src/pages/TaskListPage.tsx` (created)
- `frontend/src/lib/api.ts` (created)
- `frontend/src/lib/auth.ts` (created)
- `frontend/src/components/.gitkeep` (created)
- `frontend/src/hooks/.gitkeep` (created)
- `backend/package.json` (created)
- `backend/tsconfig.json` (created)
- `backend/vitest.config.ts` (created)
- `backend/Dockerfile` (created)
- `backend/src/server.ts` (created)
- `backend/src/db/client.ts` (created)
- `backend/src/db/migrate.ts` (created)
- `backend/src/db/migrations/001_init.sql` (created)
- `backend/src/db/queries/.gitkeep` (created)
- `backend/test/helpers/db.ts` (created)
- `backend/test/db/migrate.test.ts` (created)

### Senior Developer Review (AI)

_Reviewer: Alessio on 2026-02-24_

**Outcome: Approved** (after fixes applied)

| Severity | Count | Status |
|---|---|---|
| 🔴 High | 3 | Fixed |
| 🟡 Medium | 4 | Fixed (3) / Noted (1) |
| 🟢 Low | 2 | Noted |

**Fixes applied:**

- **[H1] Tests were failing** — `DOCKER_HOST` was missing from `npm test` script. Added `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` to both `test` and `test:watch` scripts. All 6 tests now pass. [`backend/package.json`]
- **[H2] `afterAll` teardown crash** — when `beforeAll` threw, `sql` and `container` were `undefined`, causing a secondary `TypeError`. Changed to optional chaining (`sql?.end()`, `container?.stop()`). [`backend/test/db/migrate.test.ts`]
- **[H3] `TaskSchema` field drift** — `completed` renamed to `is_completed` to match the database column name defined in architecture and used in Story 2.1+. [`shared/types/index.ts`]
- **[M1] `web` service startup race** — added `healthcheck` (`wget`) to `api` service; updated `web.depends_on` to `condition: service_healthy`. [`docker-compose.yml`]
- **[M2] Missing nginx forwarded headers** — added `X-Forwarded-For` and `X-Forwarded-Proto` to the `/api/` proxy block. [`frontend/nginx.conf`]
- **[M3] Test files excluded from type-checking** — removed `test` from `tsconfig.json` exclude, extended `include` to `["src/**/*", "test/**/*"]`, added `"types": ["vitest/globals"]`. [`backend/tsconfig.json`]
- **[M4] Health route** — replaced manual `GET /health` with `@fastify/under-pressure` (event loop delay, heap, RSS, ELU thresholds; auto 503 on pressure). [`backend/src/server.ts`]

**Noted (not fixed, next story considerations):**

- **[L1]** `cors: origin: true` — acceptable for MVP; lock to specific origin before any public deployment.
- **[L2]** Press Start 2P font defined in `@theme` but not applied to `body` by default — intentional for Story 1.1; Story 2.1 should apply it.

### Change Log

- **2026-02-24:** Initial implementation of Story 1.1 — complete project scaffolding. Vite + React + TS frontend, Fastify + TS backend, PostgreSQL Docker Compose stack. Migration runner verified with 6 Testcontainers integration tests (all pass).
- **2026-02-24:** Code review (AI) — 3 High, 4 Medium, 2 Low issues found and fixed. All 6 tests now pass. Story marked done.
