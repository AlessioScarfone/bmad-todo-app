# Project Overview — bmad-todo-app

> Generated: 2026-02-27 | Scan: Quick | Mode: rescan (read from source)

## Summary

**bmad-todo-app** is a full-stack task management web application built with a multi-tier architecture: a React SPA frontend, a Fastify REST API backend, and a PostgreSQL database. All services are containerised and orchestrated with Docker Compose.

The app was developed as a BMAD-method showcase project, following a complete product lifecycle: Product Brief → PRD → UX Design → Architecture → Epics/Stories → Implementation.

---

## Repository Structure

| Type | Value |
|---|---|
| **Repository type** | Multi-part (front + back + e2e + infra) |
| **Primary language** | TypeScript (all parts) |
| **Package manager** | npm (separate package.json per part) |

## Parts at a Glance

| Part | Root | Project Type | Purpose |
|---|---|---|---|
| `frontend` | `frontend/` | Web SPA | React 19 user interface |
| `backend` | `backend/` | REST API | Fastify 5 + PostgreSQL data layer |
| `e2e` | `e2e/` | Test suite | Playwright end-to-end tests |
| infra | `/` (root) | Infrastructure | Docker Compose + Nginx config |

---

## Technology Stack Summary

### Frontend (`frontend/`)

| Category | Technology | Version |
|---|---|---|
| Framework | React | ^19.2.0 |
| Build tool | Vite | ^6.x (via @vitejs/plugin-react) |
| Language | TypeScript | ~5.9.3 |
| Styling | Tailwind CSS | ^4.2.1 |
| Component lib | Radix UI (headless) | various |
| Server state | TanStack Query | ^5.90.21 |
| Routing | React Router | ^7.13.1 |
| Unit testing | Vitest + Testing Library | ^4.0.18 / ^16.3.2 |

### Backend (`backend/`)

| Category | Technology | Version |
|---|---|---|
| Framework | Fastify | ^5.7.4 |
| Language | TypeScript | ^5.9.3 |
| Database | PostgreSQL | 16 (Docker image) |
| DB driver | postgres (pg3) | ^3.4.8 |
| Auth | @fastify/jwt + @fastify/cookie | ^10 / ^11 |
| Schema validation | @sinclair/typebox | ^0.34.48 |
| API docs | @fastify/swagger + @fastify/swagger-ui | ^9.7.0 / ^5.2.5 |
| Unit/integration testing | Vitest + Testcontainers | ^4.0.18 / ^11.12.0 |

### E2E (`e2e/`)

| Category | Technology | Version |
|---|---|---|
| Test runner | Playwright | ^1.42.0 |
| Accessibility checks | @axe-core/playwright | ^4.11.1 |

### Infrastructure (root)

| Category | Technology |
|---|---|
| Orchestration | Docker Compose v3 |
| Frontend serving | Nginx (alpine, inside container) |
| DB image | postgres:16-alpine |

---

## Architecture Pattern

**Multi-tier SPA with REST API:**

```
Browser
  └─ React SPA (port 3000 in dev / via Nginx in prod)
       └─ REST API calls (Fetch / TanStack Query)
            └─ Fastify API (port 3001)
                 └─ PostgreSQL 16 (port 5432, internal Docker network)
```

Authentication uses **HttpOnly JWTs stored in cookies** (`@fastify/jwt` + `@fastify/cookie`). The frontend never handles the token directly — the cookie is sent automatically with every request.

---

## Key Features

- User registration and login with persisted sessions (JWT cookie)
- Email pre-fill on return after logout
- Task list: create, complete/un-complete, edit title, delete
- Live task count display (e.g. `3/5`)
- Labels: attach and remove per task
- Deadlines: set and remove per task
- Subtasks: add, complete, delete
- Filter task list by label, status, and deadline
- Sort task list
- Full keyboard navigation
- WCAG 2.1 AA accessibility compliance
- Prefers-reduced-motion support
- Sub-second UI state reflection (optimistic updates)
- Inline error feedback with retry

---

## Planning Artifacts

Comprehensive BMAD planning documents are available in [`_bmad-output/planning-artifacts/`](../_bmad-output/planning-artifacts/):

| Document | Path |
|---|---|
| Product Brief | `_bmad-output/planning-artifacts/product-brief-bmad-todo-app-2026-02-23.md` |
| PRD | `_bmad-output/planning-artifacts/prd.md` |
| UX Design Specification | `_bmad-output/planning-artifacts/ux-design-specification.md` |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` |
| Epics & Stories | `_bmad-output/planning-artifacts/epics.md` |

Implementation stories (sprint backlog) are in [`_bmad-output/implementation-artifacts/`](../_bmad-output/implementation-artifacts/).

---

## Getting Started

See [development-guide.md](./development-guide.md) for local dev setup.
See [deployment-guide.md](./deployment-guide.md) for Docker Compose deployment.
See [index.md](./index.md) for the full documentation index.
