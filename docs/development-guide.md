# Development Guide

> Generated: 2026-02-27 | Scan: Quick

---

## Prerequisites

| Tool | Required | Notes |
|---|---|---|
| Node.js | ✅ LTS (≥20) | `node --version` |
| npm | ✅ (bundled with Node) | `npm --version` |
| Docker | ✅ | For running the database locally or the full stack |
| Docker Compose | ✅ | `docker compose version` or `docker-compose version` |
| Colima (macOS) | Optional | If using Colima instead of Docker Desktop |

---

## Repository Setup

```bash
git clone <repo-url>
cd bmad-todo-app
cp .env.example .env
# Edit .env with your desired credentials (or keep defaults for local dev)
```

---

## Environment Variables

Copy `.env.example` to `.env` and adjust:

```dotenv
# Database
POSTGRES_USER=bmad_user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=bmad_todo

# API
JWT_SECRET=supersecretchangeme
NODE_ENV=development
PORT=3001
```

---

## Option A: Full Stack with Docker Compose (recommended)

The fastest way to run everything together:

```bash
docker-compose up --build
```

Services started:
- **PostgreSQL** on (internal) port 5432
- **Backend API** on port 3001 → `http://localhost:3001`
- **Frontend** on port 3000 → `http://localhost:3000`

To stop:
```bash
docker-compose down
# To also remove the database volume:
docker-compose down -v
```

---

## Option B: Backend in Local Dev

Run the Fastify backend locally with hot-reload. Requires a running PostgreSQL (e.g. via Docker).

### Start PostgreSQL only

```bash
docker-compose up db
```

### Install deps and run backend

```bash
cd backend
npm install
npm run dev     # tsx src/server.ts (reloads on file change)
```

Backend available at `http://localhost:3001`.

Database migrations run automatically on startup.

---

## Option C: Frontend in Local Dev

Run the Vite dev server (HMR). Requires the backend to be running (Option A or B).

```bash
cd frontend
npm install
npm run dev     # Vite dev server
```

Frontend available at `http://localhost:5173` (Vite default port).

> Note: When running frontend locally against the Docker backend, verify the API base URL is set correctly (check `frontend/src/lib/` for the fetch client base URL configuration).

---

## Testing

### Backend

Backend integration tests use **Testcontainers** — they spin up a real PostgreSQL instance in Docker.

**Requirements:** Docker daemon must be accessible.

```bash
cd backend
npm test                # Vitest run (one-shot)
npm run test:watch      # Vitest watch mode
```

If using **Colima** on macOS:
```bash
# The DOCKER_HOST is already set in npm test script:
# DOCKER_HOST=unix://$HOME/.colima/default/docker.sock
```

### Frontend

```bash
cd frontend
npm test                # Vitest run (jsdom environment)
npm run test:watch      # Watch mode
```

### E2E (Playwright)

Requires the full Docker Compose stack to be running first.

```bash
# 1. Start stack
docker-compose up --build -d

# 2. Install Playwright
cd e2e
npm install
npx playwright install chromium

# 3. Run tests
npm test                # Headless
npm run test:headed     # Visible browser
npm run test:ui         # Interactive Playwright UI
npm run test:report     # Show last HTML report
```

---

## Linting

```bash
# Frontend
cd frontend && npm run lint

# Backend (if eslint configured)
cd backend && npm run lint
```

---

## Build

### Frontend production build

```bash
cd frontend
npm run build
# Output: frontend/dist/
```

### Backend production build

```bash
cd backend
npm run build
# Output: backend/dist/
npm start   # node dist/src/server.js
```

---

## Project Scripts Reference

### Backend (`backend/package.json`)

| Script | Command | Description |
|---|---|---|
| `dev` | `tsx src/server.ts` | Dev server with hot reload |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/src/server.js` | Run production build |
| `test` | `vitest run` (+ DOCKER_HOST env) | Run tests once |
| `test:watch` | `vitest` | Watch mode |

### Frontend (`frontend/package.json`)

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Vite dev server (HMR) |
| `build` | `tsc -b && vite build` | TypeScript check + Vite bundle |
| `preview` | `vite preview` | Preview production build locally |
| `lint` | `eslint .` | ESLint |
| `test` | `vitest run` | Run tests once |
| `test:watch` | `vitest` | Watch mode |

### E2E (`e2e/package.json`)

| Script | Command | Description |
|---|---|---|
| `test` | `playwright test` | Run all tests headlessly |
| `test:ui` | `playwright test --ui` | Playwright interactive UI |
| `test:headed` | `playwright test --headed` | Visible browser |
| `test:report` | `playwright show-report` | Open last HTML report |
