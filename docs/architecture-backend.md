# Architecture — Backend (API)

> Part: `backend` | Type: REST API | Generated: 2026-02-27 (rescan) | Scan: Quick (read from source)

---

## Executive Summary

The backend is a **Fastify 5 REST API** written in TypeScript. It uses a **plugin-based architecture** (Fastify's native plugin system) to compose the application from isolated units: database connection, JWT authentication, CORS, rate-limiting, and route modules. Data persistence uses raw **PostgreSQL 16** via the lightweight `postgres` (pg3) driver. Schema migrations run at startup. Input/output schemas are declared using **TypeBox** and enforced by Fastify's built-in AJV validator.

---

## Technology Stack

| Category | Technology | Version | Notes |
|---|---|---|---|
| Framework | Fastify | ^5.7.4 | Plugin-based, high-performance |
| Language | TypeScript | ^5.9.3 | ESM output |
| Runtime | Node.js | (LTS) | `tsx` for dev, compiled JS for prod |
| Database | PostgreSQL | 16 | |
| DB driver | postgres (pg3) | ^3.4.8 | Tagged-template SQL, connection pooling |
| Auth (JWT) | @fastify/jwt | ^10.0.0 | HS256, 30-day expiry, stored in HttpOnly cookie |
| Auth (cookie) | @fastify/cookie | ^11.0.2 | |
| CORS | @fastify/cors | ^11.2.0 | `credentials: true` |
| Schema validation | @sinclair/typebox | ^0.34.48 | + @fastify/type-provider-typebox |
| Load management | @fastify/under-pressure | ^9.0.3 | Exposes `/health` route |
| OpenAPI docs | @fastify/swagger | ^9.7.0 | OpenAPI 3.x spec generation |
| Swagger UI | @fastify/swagger-ui | ^5.2.5 | Interactive docs at `/docs` |
| Password hashing | bcrypt | ^6.0.0 | Cost factor: **12** |
| Logging | Pino | ^10.3.1 | via Fastify built-in |
| Unit/integration testing | Vitest | ^4.0.18 | |
| DB in tests | @testcontainers/postgresql | ^11.12.0 | Spins up a real Postgres in Docker |

---

## Architecture Pattern

**Plugin-based layered API:**

```
server.ts (buildServer factory)
    ├─ Plugins (registered first)
    │   ├─ @fastify/swagger        — OpenAPI 3.x schema generation
    │   ├─ @fastify/swagger-ui     — Interactive docs at GET /docs
    │   ├─ @fastify/cors           — Cross-origin policy (origin: true, credentials: true)
    │   ├─ @fastify/cookie         — Cookie parsing
    │   ├─ @fastify/jwt            — JWT verification (cookie: 'token')
    │   ├─ @fastify/under-pressure — Health check + back-pressure (GET /health)
    │   └─ db.plugin (custom)      — Decorates fastify.sql with Postgres client
    │
    ├─ Decorators
    │   └─ fastify.authenticate     — preHandler that calls request.jwtVerify()
    │
    └─ Routes (all under /api prefix)
        ├─ /api/auth/**        → routes/auth.ts
        ├─ /api/tasks/**       → routes/tasks.ts
        ├─ /api/labels/**      → routes/labels.ts
        └─ /api/tasks/*/subtasks → routes/subtasks.ts
```

The `buildServer(jwtSecret, sqlOverride?)` factory function allows tests to inject a test-scoped database connection.

---

## Source Structure

```
backend/src/
├── server.ts                  # buildServer() factory + main() bootstrap (listens on PORT)
│
├── plugins/
│   └── db.ts                  # Fastify plugin — decorates instance with fastify.sql (postgres client)
│
├── routes/
│   ├── auth.ts                # POST /auth/register, POST /auth/login, POST /auth/logout
│   ├── tasks.ts               # GET /tasks, POST /tasks, PATCH /tasks/:id, DELETE /tasks/:id
│   ├── labels.ts              # GET /labels, POST /labels, DELETE /labels/:id, task label attach/detach
│   └── subtasks.ts            # POST /tasks/:id/subtasks, PATCH /subtasks/:id, DELETE /subtasks/:id
│
├── db/
│   ├── client.ts              # getSqlClient() — creates postgres connection using DATABASE_URL
│   ├── migrate.ts             # runMigrations() — applies SQL migration files in order
│   ├── migrations/
│   │   ├── 001_init.sql       # users table (id, email, password_hash, created_at)
│   │   ├── 002_tasks.sql      # tasks table (id, user_id FK, title, completed, created_at, deadline)
│   │   └── 003_enrichment.sql # labels, task_labels (join table), subtasks tables
│   └── queries/
│       ├── auth.ts            # SQL queries: find user by email, insert user
│       ├── tasks.ts           # SQL queries: list, insert, update, delete tasks
│       ├── labels.ts          # SQL queries: label CRUD + task_label attach/detach
│       └── subtasks.ts        # SQL queries: subtask CRUD
│
└── types/
    └── (TypeBox schemas, shared TypeScript interfaces)
```

---

## Data Layer

### ORM / Query Approach

Raw SQL via the **`postgres` (pg3)** tagged-template driver. No ORM is used. All queries are in `db/queries/` files, keeping data access isolated from route logic.

```typescript
// Example pattern in db/queries/tasks.ts
export async function listTasks(sql: Sql, userId: string) {
  return sql`
    SELECT * FROM tasks WHERE user_id = ${userId} ORDER BY created_at DESC
  `
}
```

### Connection Management

- `getSqlClient()` reads `DATABASE_URL` from environment
- The database plugin decorates the Fastify instance with `fastify.sql`
- Tests inject a Testcontainers-managed Postgres via `sqlOverride`

### Migrations

Migrations run automatically at startup via `runMigrations()` (called in `main()`). Migration files are plain SQL, applied in numeric order (`001_`, `002_`, `003_`). See [data-models-backend.md](./data-models-backend.md) for schema details.

---

## Authentication

| Aspect | Details |
|---|---|
| Strategy | JWT (HS256) stored in HttpOnly cookie named `token` |
| Library | `@fastify/jwt` + `@fastify/cookie` |
| Secret | `JWT_SECRET` environment variable |
| Expiry | **30 days** (`expiresIn: '30d'`, `maxAge: 2592000`) |
| Cookie flags | `httpOnly: true`, `sameSite: 'strict'`, `secure: true` (production only), `path: '/'` |
| Verification | `fastify.authenticate` decorator — calls `request.jwtVerify()` |
| Password hashing | bcrypt, **cost factor 12** |
| Registration | `POST /api/auth/register` — hashes password, inserts user, **auto-logs in** (sets JWT cookie on 201) |
| Login | `POST /api/auth/login` — verifies hash, signs JWT, sets cookie |
| Current user | `GET /api/auth/me` — returns `{ id, email }` from JWT payload |
| Logout | `POST /api/auth/logout` — clears cookie (idempotent; succeeds even with absent/expired cookie) |

Protected routes call `request.jwtVerify()` (or a preHandler hook) to authenticate.

---

## Schema Validation

All route schemas (request params, body, querystring, response) are declared using **TypeBox** shapes and passed to Fastify's `schema` route option. Fastify uses AJV under the hood for validation and serialization. The `@fastify/type-provider-typebox` plugin provides full TypeScript type inference from TypeBox schemas.

---

## Health Check

`@fastify/under-pressure` exposes `GET /health` and monitors:

| Metric | Limit |
|---|---|
| Event loop delay | 1 000 ms |
| Heap used | 100 MB |
| RSS | 150 MB |
| Event loop utilisation | 98% |

Docker Compose uses `wget -qO- http://127.0.0.1:3001/health` as the health check.

---

## OpenAPI Documentation

`@fastify/swagger` generates an OpenAPI 3.x schema from all TypeBox route schemas.
`@fastify/swagger-ui` serves an interactive Swagger UI at **`GET /docs`**.

API tags: `Auth`, `Tasks`, `Labels`, `Subtasks`.
Security scheme: `cookieAuth` (`apiKey` in cookie `token`).

---

## Environment Variables

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgres://user:pass@db:5432/bmad_todo` | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | `supersecretchangeme` | JWT signing secret |
| `NODE_ENV` | ⬜ | `production` | Logging level (info in prod, debug in dev) |
| `PORT` | ⬜ | `3001` | HTTP listen port (default: 3001) |

See [`.env.example`](../.env.example) in the project root.

---

## Testing

| Layer | Tool | Notes |
|---|---|---|
| Unit / integration | Vitest + Testcontainers | Real Postgres spun up per test suite |
| E2E (full stack) | Playwright | `e2e/` directory, runs against Docker Compose stack |

```bash
# Run backend tests (requires Docker daemon for Testcontainers)
cd backend && npm test

# Watch mode
npm run test:watch
```

Testcontainers uses Colima socket by default:
`DOCKER_HOST=unix://$HOME/.colima/default/docker.sock`

---

## Build & Production

```bash
# Development (tsx — transpiles on the fly)
cd backend && npm run dev

# Production build (tsc → dist/)
npm run build
npm start   # node dist/src/server.js
```

Production Docker image: `backend/Dockerfile`. Runs as compiled JS, no tsx in production.
