# Integration Architecture

> Generated: 2026-02-27 (rescan) | Scan: Quick (read from source)

---

## Overview

**bmad-todo-app** is a multi-part project with three runtime services:

| Service | Container | Port (host) | Port (internal) |
|---|---|---|---|
| `db` | postgres:16-alpine | — | 5432 |
| `api` | backend/Dockerfile | 3001 | 3001 |
| `web` | frontend/Dockerfile | 3000 | 80 |

---

## Integration Points

### 1. Frontend → Backend (REST API)

| Aspect | Details |
|---|---|
| **From** | `web` (frontend React SPA) |
| **To** | `api` (backend Fastify) |
| **Protocol** | HTTP/1.1, JSON |
| **Dev API path** | `/api/*` (relative — Vite proxy forwards to `http://localhost:3001` in dev) |
| **Prod API path** | `/api/*` (relative — Nginx `web` container proxies to `http://api:3001`) |
| **Auth** | HttpOnly cookie `token` (JWT HS256) sent automatically |
| **CORS** | `@fastify/cors` with `origin: true, credentials: true` |
| **Transport** | `fetch()` with `credentials: 'include'` (via `lib/api.ts` wrapper) |

The frontend never reads the JWT token directly — it's an opaque HttpOnly cookie managed entirely by the browser and the backend.

**Data flow for a typical request:**
```
React component
  └─ calls hook (useTasks, useLabels, etc.)
       └─ TanStack Query → fetch(url, { credentials: 'include' })
            └─ HTTP request with cookie header
                 └─ Fastify route handler
                      └─ request.jwtVerify() (validates cookie)
                           └─ db/queries/*.ts (SQL via postgres driver)
                                └─ PostgreSQL 16
```

---

### 2. Backend → Database (PostgreSQL)

| Aspect | Details |
|---|---|
| **From** | `api` (Fastify backend) |
| **To** | `db` (PostgreSQL 16) |
| **Protocol** | PostgreSQL wire protocol |
| **Dev URL** | `DATABASE_URL` env var (set in `.env`) |
| **Prod URL** | `postgres://user:pass@db:5432/bmad_todo` (Docker network) |
| **Library** | `postgres` (pg3) tagged-template driver |
| **Connection** | Single pool managed by `getSqlClient()` |

---

### 3. Docker Compose Service Dependencies

```
web → api (depends_on: api healthcheck)
api → db  (depends_on: db healthcheck)
```

Services start in order: `db` first (healthy) → `api` (healthy, runs migrations) → `web`. The API health check endpoint (`GET /health`) is used by both Docker Compose and external monitoring.

---

### 4. E2E Tests → Full Stack

```
Playwright (host machine) → http://localhost:3000 (web container)
                          → http://localhost:3001 (api container, for direct API calls in test helpers)
```

The E2E test suite (`e2e/`) runs against the **full Docker Compose stack** which must be running before executing tests. Test helpers in `e2e/helpers/auth.ts` may call the API directly to set up test state.

---

## Authentication Flow (Cross-Service)

```
Register/Login:
  Browser  ──POST /auth/login──►  Fastify API  ──SET-COOKIE token──►  Browser
  Browser  ──(all subsequent requests with cookie)──►  Fastify API (jwtVerify)

Logout:
  Browser  ──POST /auth/logout──►  Fastify API  ──CLEAR-COOKIE token──►  Browser
  Browser  ──redirect to /login──►  LoginPage (email pre-filled from localStorage)
```

---

## Network Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Docker Compose network                                       │
│                                                               │
│  ┌──────────────┐  HTTP :3001  ┌──────────────────────────┐  │
│  │  web service  │◄────────────►│  api service (Fastify)   │  │
│  │  Nginx :80    │              │  PORT=3001                │  │
│  │  (SPA bundle) │              └──────────────────────────┘  │
│  └──────────────┘                         │ postgres :5432     │
│         │                        ┌────────▼─────────────────┐ │
│         │ host port 3000         │  db service (PostgreSQL)  │ │
│         │                        │  postgres:16-alpine        │ │
│         │                        └──────────────────────────┘ │
└─────────┼───────────────────────────────────────────────────┘
          │
       Browser
       (host machine)
       port 3000 (web)
       port 3001 (api, for dev / E2E)
```

---

## Shared Environment Variables

Set in `.env` (from `.env.example`):

| Variable | Used By |
|---|---|
| `POSTGRES_USER` | `db`, `api` (via DATABASE_URL) |
| `POSTGRES_PASSWORD` | `db`, `api` (via DATABASE_URL) |
| `POSTGRES_DB` | `db`, `api` (via DATABASE_URL) |
| `JWT_SECRET` | `api` |
| `NODE_ENV` | `api` |
| `PORT` | `api` (default 3001) |
