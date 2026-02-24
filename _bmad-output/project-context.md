---
project_name: 'bmad-todo-app'
user_name: 'Alessio'
date: '2026-02-24'
sections_completed: ['technology_stack', 'language_specific_rules', 'framework_specific_rules', 'testing_rules', 'code_quality_rules', 'critical_rules']
status: 'complete'
rule_count: 42
optimized_for_llm: true
existing_patterns_found: 27
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React + TypeScript | 19.2.0 / ~5.9.3 |
| Build tool | Vite | 7.3.1 |
| Client routing | React Router DOM | 7.13.1 |
| Server state / optimistic UI | TanStack Query | 5.90.21 |
| Design system | Custom components — Tailwind CSS + Radix UI primitives | Tailwind 4.2.1 |
| Backend framework | Fastify | 5.7.4 |
| Schema validation | TypeBox + @fastify/type-provider-typebox | 0.34.48 / 6.1.0 |
| Database | PostgreSQL 16 (`postgres:16-alpine`) | 16 |
| Query layer | `postgres` npm (raw SQL, tagged templates) | 3.4.8 |
| Password hashing | bcrypt | 6.0.0 (12 rounds) |
| Unit/integration tests | Vitest + Testcontainers | 4.0.18 / 11.12.0 |
| E2E tests | Playwright | against Docker Compose stack |
| Deployment | Docker Compose | 3 services: db, api, web |

**Version constraint notes:**
- Both packages use `"type": "module"` — ESM only; no CommonJS `require()` anywhere
- Backend TypeScript source files must use `.js` extensions in all imports (e.g., `import { sql } from './db/client.js'`)
- Tailwind CSS v4: uses `@tailwindcss/vite` plugin, NOT PostCSS-only; config is `tailwind.config.ts`
- No third-party UI component library — all components are hand-rolled with Tailwind utility classes + Radix UI headless primitives

---

## Language-Specific Rules

### TypeScript

- **Strict mode is on** — `"strict": true` in both `tsconfig.json` files. Never use `any`; use `unknown` and narrow, or define a TypeBox schema.
- **ESM imports in backend source** — always include `.js` extension (e.g., `import { sql } from './db/client.js'`), even though the source file is `.ts`. TypeScript resolves this correctly with `moduleResolution: bundler`.
- **No default exports in backend query/plugin files** — `db/queries/*.ts` and `plugins/*.ts` use named exports only. Route files export a Fastify plugin via `export default fp(...)`.
- **TypeBox schema naming** — schemas are `PascalCase` + `Schema` suffix (e.g., `RegisterBodySchema`). Derived types via `Static<typeof XyzSchema>` are named `PascalCase` without suffix (e.g., `type RegisterBody = Static<typeof RegisterBodySchema>`).
- **No inline type definitions** — types must live in `backend/src/types/` (TypeBox schemas) or `frontend/src/types/` (plain TS interfaces). Never define a domain type inline in a route handler or component file.
- **No cross-package imports** — frontend never imports from backend and vice versa. API response shapes are kept in sync manually by convention.

### Async / Error Handling (backend)

- All Fastify route handlers are `async` functions — always `return` the reply value; never use callbacks.
- Database constraint violations are caught by checking `err instanceof postgres.PostgresError && err.code === '23505'` — do not catch generic errors and swallow them silently.
- Auth routes **must never log `req.body`** — password data must never appear in logs; enforce this with an explicit comment in each auth route handler.

### Imports

- Prefer named imports everywhere. No `import * as` patterns.
- Shared Fastify instance types (`FastifyRequest`, `FastifyReply`) are imported from `'fastify'`, not from plugin packages.

---

## Framework-Specific Rules

### Fastify (backend)

- **TypeBox type provider must be activated per-route-plugin** — call `fastify.withTypeProvider<TypeBoxTypeProvider>()` inside each route plugin to get full request/response type inference. The default `fastify` instance is untyped.
- **Route plugins use `fastify-plugin` (`fp`) wrapping** — each route file wraps its plugin with `fp()` so Fastify decorators (`fastify.sql`, `fastify.authenticate`) are visible across scope.
- **Authentication via `preHandler` hook** — protected routes declare `{ preHandler: [fastify.authenticate] }` in route options. `fastify.authenticate` is decorated on the root instance in `server.ts`.
- **Error response shape is always `{ statusCode, error, message }`** — no exceptions. Route-level `setErrorHandler` formats validation errors into this shape; the global handler catches everything else.
- **Only `db/queries/*.ts` files issue SQL** — route handlers call query functions; never call `fastify.sql` directly inline inside a route handler.

### React + TanStack Query (frontend)

- **All server state via TanStack Query** — no `useState` + `useEffect` for data fetching. No Axios; use native `fetch` wrapped in `frontend/src/lib/api.ts`.
- **All task mutations use the optimistic UI pattern** — `onMutate` applies the optimistic update and returns `{ previous }`; `onError` rolls back via `queryClient.setQueryData`; `onSettled` invalidates the query.
- **Query keys are arrays** — use `['tasks']`, `['labels']`, `['auth']`. Never string-only query keys.
- **Filter/sort state is `useState` in `TaskListPage`** — applied client-side on the cache result. `GET /api/tasks` query params exist for future use but are NOT sent in MVP.
- **No global state library** — no Zustand, Redux, or React Context for app state. TanStack Query cache is the source of truth for server data; `useState`/`useReducer` handles UI state locally.
- **All API calls go through `lib/api.ts`** — never call `fetch` directly in a component or hook.
- **Frontend uses relative `/api/...` paths only** — never hardcode a backend host or port. nginx proxies `/api/*` → `api:3001`.

### Radix UI + Tailwind CSS (frontend components)

- **Radix UI provides behavior/accessibility; Tailwind provides all visual styles** — never apply inline styles; use utility classes only.
- **Use `clsx` + `tailwind-merge` (`cn()` helper) for conditional classes** — never manually concatenate class strings.
- **`prefers-reduced-motion`** — wrap transition utilities in `motion-safe:` Tailwind variant; never apply unconditional CSS transitions.
- **Task completion does NOT auto-complete the parent task** — when all subtasks are completed the parent remains incomplete. Hard business rule (FR requirement); never add auto-complete logic.

---

## Testing Rules

### Test File Organization

- **Tests live in `test/` mirroring `src/` — never co-located with source files.**
  - `backend/src/db/queries/tasks.ts` → `backend/test/db/queries/tasks.test.ts`
  - `backend/src/routes/auth.ts` → `backend/test/routes/auth.test.ts`
  - `frontend/src/components/TaskRow.tsx` → `frontend/test/components/TaskRow.test.tsx`
- Vitest `include` patterns: `['test/**/*.test.ts']` (backend), `['test/**/*.test.tsx?']` (frontend).

### Backend Integration Tests

- **Never mock the database** — backend integration tests use a real `postgres:16-alpine` container via Testcontainers. SQL constraints, `ON CONFLICT DO UPDATE`, and `RETURNING` clauses must be validated against the real engine.
- **`createTestDb()` is the only test DB helper** — defined in `backend/test/helpers/db.ts`. Starts a container, runs migrations, returns `{ sql, container }`. Always `await container.stop()` in `afterAll`.
- **Run backend tests with specific env vars** — `TESTCONTAINERS_RYUK_DISABLED=true` and `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock` are pre-set in `backend/package.json` scripts; do not strip them.
- **One DB container per test file** — use `beforeAll`/`afterAll` per file, not `beforeEach`.

### Frontend Tests

- Vitest runs in `jsdom`/`happy-dom` mode — no real network requests. Mock `lib/api.ts` at the module level in frontend tests.

### Coverage

- Target ≥70% meaningful coverage. Primary targets: `db/queries/*.ts` and auth middleware. UI component coverage is secondary.

### E2E Tests (Playwright)

- Playwright tests run against the full `docker-compose up` stack at `http://localhost:3000`.
- `playwright.config.ts` sets `baseURL: 'http://localhost:3000'` — never hardcode URLs in test files.
- `docker-compose up --build -d` must be running before `npx playwright test`.

---

## Code Quality & Style Rules

### Naming Conventions

| Element | Convention | Example |
|---|---|---|
| SQL tables | lowercase plural | `tasks`, `users`, `labels`, `subtasks`, `task_labels` |
| SQL columns | `snake_case` | `user_id`, `is_completed`, `completed_at`, `deadline` |
| SQL foreign keys | `{singular_table}_id` | `user_id`, `task_id`, `label_id` |
| SQL indexes | `idx_{table}_{column(s)}` | `idx_tasks_user_id`, `idx_tasks_completed` |
| SQL migrations | zero-padded sequence | `001_init.sql`, `002_add_deadline_index.sql` |
| React component files | `PascalCase.tsx` | `TaskRow.tsx`, `AppHeader.tsx` |
| Hook / util files | `camelCase.ts` | `useTasks.ts`, `api.ts` |
| React components | `PascalCase` | `TaskRow`, `SubtaskPanel` |
| Hooks | `use` prefix | `useTasks`, `useAuth` |
| Functions | `camelCase` | `getTasksByUser`, `createLabel` |
| Constants | `SCREAMING_SNAKE_CASE` | `JWT_COOKIE_NAME`, `MAX_LABEL_LENGTH` |
| TypeBox schemas | `PascalCase` + `Schema` | `TaskSchema`, `CreateTaskBodySchema` |
| TypeBox types | `PascalCase` via `Static<>` | `type Task = Static<typeof TaskSchema>` |

### API Response Format

- **JSON body field names: `camelCase`** — `isCompleted`, `completedAt`, `userId`. Never `snake_case` in JSON responses.
- **Dates: ISO 8601 strings always** — `"2026-02-23T09:00:00.000Z"`. Date-only fields: `"2026-02-23"`. Never Unix timestamps.
- **Booleans: `true`/`false`** — never `1`/`0`.
- **Success — single resource:** return object directly, no wrapper: `{ "id": 1, "title": "..." }`
- **Success — collection:** return array directly: `[{ "id": 1 }, { "id": 2 }]`
- **Error — all routes:** `{ "statusCode": 404, "error": "NOT_FOUND", "message": "Task not found" }`

### Code Organization

- **`backend/src/db/queries/`** — one file per domain (`tasks.ts`, `auth.ts`, `labels.ts`, `subtasks.ts`); named async functions only, no classes, no default exports.
- **`backend/src/routes/`** — one file per resource; each exports a Fastify plugin via `export default fp(...)`.
- **`backend/src/types/`** — TypeBox schemas (single source of truth for backend validation and type inference).
- **`frontend/src/types/`** — plain TS interfaces mirroring API response shapes; kept in sync with backend manually.
- **`frontend/src/lib/api.ts`** — typed `fetch` wrapper; all HTTP calls go through here.
- **`frontend/src/lib/auth.ts`** — `localStorage` email helpers only (key: `bmad_todo_email`).

---

## Critical Don't-Miss Rules

### Security

- **JWT in `httpOnly` cookie only** — never store token in `localStorage` or `sessionStorage`. Cookie name: `token`; flags: `httpOnly`, `SameSite=Strict`, `Secure`.
- **Per-user isolation on every query** — every SQL query on user-owned data must include `WHERE user_id = ${userId}`. No exceptions, no admin bypass.
- **bcrypt at 12 rounds** — never change the cost factor without explicit instruction.
- **Auth routes never log `req.body`** — enforce with an explicit comment in each auth route handler.

### Data Model

- **`tasks.updated_at` requires explicit `SET updated_at = NOW()`** — no DB trigger exists. Every `UPDATE tasks` query must set this column manually.
- **Labels normalised per user** — `UNIQUE(user_id, name)` constraint. Use `ON CONFLICT DO NOTHING` when inserting; never blindly insert duplicates.
- **Subtasks are flat (one level only)** — `subtasks.task_id` references `tasks.id` directly; there is no `parent_subtask_id` and this must never be added.
- **Task count is client-side** — `tasks.filter(t => t.is_completed).length`. Never add a server endpoint for this.

### Anti-Patterns — Never Produce

- ❌ `{ "data": { ... } }` wrapper in API success responses — return resources directly
- ❌ JWT token in `localStorage` — `httpOnly` cookie only
- ❌ Auto-completing parent task when all subtasks complete — explicitly forbidden by spec
- ❌ `*.test.ts` / `*.test.tsx` files co-located with source — always mirror path under `test/`
- ❌ Unix timestamps in API responses — ISO 8601 strings only
- ❌ `any` in TypeScript — use `unknown` + narrowing or a TypeBox schema
- ❌ Domain types redefined inline in route handlers or components — always import from `types/`
- ❌ `fastify.sql` called directly inside a route handler — only `db/queries/*.ts` may issue SQL
- ❌ Hardcoded backend URLs in frontend — relative `/api/...` paths only
- ❌ `require()` anywhere — ESM only (`"type": "module"` is set in both packages)

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Refer to `_bmad-output/planning-artifacts/architecture.md` for deeper architectural context

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when the technology stack or patterns change
- Remove rules that become obvious over time

_Last Updated: 2026-02-24_
