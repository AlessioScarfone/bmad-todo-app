# Project Documentation Index — bmad-todo-app

> Generated: 2026-02-27 | Scan: Quick (rescan — verified from source)
> Primary entry point for AI-assisted development

---

## Project Overview

- **Name:** bmad-todo-app
- **Type:** Multi-part (frontend SPA + backend REST API + E2E tests)
- **Primary Language:** TypeScript (all parts)
- **Architecture:** Multi-tier SPA — React 19 ↔ Fastify 5 REST API ↔ PostgreSQL 16
- **Orchestration:** Docker Compose

---

## Quick Reference

### Parts

| Part | Root | Type | Primary Tech |
|---|---|---|---|
| **frontend** | `frontend/` | Web SPA | React 19, Vite, Tailwind CSS v4, TanStack Query v5, Radix UI |
| **backend** | `backend/` | REST API | Fastify 5, TypeScript, PostgreSQL 16, TypeBox, @fastify/jwt |
| **e2e** | `e2e/` | Test suite | Playwright, @axe-core/playwright |
| **infra** | `/` (root) | Infrastructure | Docker Compose, Nginx (frontend container) |

### Entry Points

| Service | Entry point | Dev command |
|---|---|---|
| Frontend | `frontend/src/main.tsx` | `cd frontend && npm run dev` |
| Backend | `backend/src/server.ts` | `cd backend && npm run dev` |
| Full stack | `docker-compose.yml` | `docker-compose up --build` |

### Ports

| Service | Dev port | Description |
|---|---|---|
| Frontend | 3000 | React SPA (or 5173 with Vite dev server) |
| Backend API | 3001 | Fastify REST API |
| Health check | 3001/health | `@fastify/under-pressure` |

---

## Generated Documentation

### Core Documentation

- [Project Overview](./project-overview.md) — Summary, tech stack table, feature list, links to planning artifacts
- [Integration Architecture](./integration-architecture.md) — How frontend ↔ backend ↔ database communicate, Docker Compose network diagram
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory tree for all parts

### Frontend

- [Architecture — Frontend](./architecture-frontend.md) — React SPA architecture, component hierarchy, routing, state management, auth flow
- [Component Inventory — Frontend](./component-inventory-frontend.md) — All components, hooks, Radix UI primitives, design utilities

### Backend

- [Architecture — Backend](./architecture-backend.md) — Fastify plugin architecture, data layer, auth, schema validation, health check
- [API Contracts — Backend](./api-contracts-backend.md) — All REST endpoints (auth, tasks, labels, subtasks) with request/response shapes
- [Data Models — Backend](./data-models-backend.md) — PostgreSQL schema (users, tasks, labels, task_labels, subtasks), ERD, query organization

### Development & Operations

- [Development Guide](./development-guide.md) — Prerequisites, local dev options (Docker / local), test commands, script reference
- [Deployment Guide](./deployment-guide.md) — Docker Compose deployment, environment variables, health checks, migrations, logs

---

## Existing Documentation (in repo)

| Document | Location | Description |
|---|---|---|
| E2E README | [e2e/README.md](../e2e/README.md) | E2E test setup and usage |
| Frontend README | [frontend/README.md](../frontend/README.md) | Vite/React template notes + ESLint config |

---

## BMAD Planning Artifacts

Comprehensive planning documents from the BMAD development process:

| Document | Path | Description |
|---|---|---|
| Product Brief | [product-brief](../_bmad-output/planning-artifacts/product-brief-bmad-todo-app-2026-02-23.md) | Initial product brief |
| PRD | [prd.md](../_bmad-output/planning-artifacts/prd.md) | Product Requirements Document |
| UX Design Spec | [ux-design-specification.md](../_bmad-output/planning-artifacts/ux-design-specification.md) | UX design decisions |
| Architecture | [architecture.md](../_bmad-output/planning-artifacts/architecture.md) | Technical architecture decisions |
| Epics & Stories | [epics.md](../_bmad-output/planning-artifacts/epics.md) | Epics breakdown |
| Sprint Status | [sprint-status.yaml](../_bmad-output/implementation-artifacts/sprint-status.yaml) | Current implementation status |

---

## Getting Started

### Run the full application

```bash
cp .env.example .env      # Configure environment
docker-compose up --build # Start all services
# → Frontend: http://localhost:3000
# → API:      http://localhost:3001
```

### Run tests

```bash
# Backend unit/integration tests
cd backend && npm test

# Frontend unit/component tests
cd frontend && npm test

# E2E tests (requires full stack running)
cd e2e && npm test
```

---

## AI Usage Tips

- **For frontend tasks:** Start with [architecture-frontend.md](./architecture-frontend.md) + [component-inventory-frontend.md](./component-inventory-frontend.md)
- **For backend/API tasks:** Start with [architecture-backend.md](./architecture-backend.md) + [api-contracts-backend.md](./api-contracts-backend.md)
- **For data/schema tasks:** Start with [data-models-backend.md](./data-models-backend.md)
- **For full-stack features:** Read integration-architecture.md + both part architectures
- **For new feature planning:** Reference [PRD](../_bmad-output/planning-artifacts/prd.md) and [Epics](../_bmad-output/planning-artifacts/epics.md)
- **For understanding UI/UX intent:** Read [UX Design Specification](../_bmad-output/planning-artifacts/ux-design-specification.md)

---

*State file: [project-scan-report.json](./project-scan-report.json)*
