# Deployment Guide

> Generated: 2026-02-27 | Scan: Quick

---

## Architecture

The application is fully containerised. Docker Compose defines three services:

| Service | Image | Exposes |
|---|---|---|
| `db` | `postgres:16-alpine` | Internal port 5432 |
| `api` | Built from `backend/Dockerfile` | Host port `3001` |
| `web` | Built from `frontend/Dockerfile` | Host port `3000` |

---

## Prerequisites

- Docker (with Compose plugin or standalone `docker-compose`)
- `.env` file configured (see Environment Variables below)

---

## Environment Variables

Create a `.env` file at the project root (use `.env.example` as template):

```dotenv
# Database
POSTGRES_USER=bmad_user
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=bmad_todo

# API
JWT_SECRET=<random-256-bit-string>
NODE_ENV=production
PORT=3001
```

> ⚠️ **Security:** Change all default values before deploying. Generate a strong `JWT_SECRET` (e.g. `openssl rand -hex 32`).

---

## Build & Run

### First start (builds images from source)

```bash
docker-compose up --build -d
```

### Subsequent starts (no rebuild needed unless code changed)

```bash
docker-compose up -d
```

### Stop all services

```bash
docker-compose down
```

### Stop and remove database volume (⚠️ destroys data)

```bash
docker-compose down -v
```

---

## Service Startup Order

Docker Compose enforces startup order via health checks:

```
1. db     → waits until PostgreSQL accepts connections (pg_isready)
2. api    → waits until db is healthy, then runs migrations and starts Fastify
3. web    → waits until api is healthy (/health endpoint returns 200)
```

### Health Checks

| Service | Check command | Interval | Retries |
|---|---|---|---|
| `db` | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` | 5s | 5 |
| `api` | `wget -qO- http://127.0.0.1:3001/health` | 10s | 5 (start_period: 15s) |
| `web` | (none — depends on `api` healthy) | — | — |

---

## Database Migrations

Migrations run **automatically** when the `api` container starts (`runMigrations()` is called in `server.ts` `main()`). Migration files are baked into the Docker image at build time.

Migration files (applied in order):
1. `001_init.sql` — users table
2. `002_tasks.sql` — tasks table
3. `003_enrichment.sql` — labels, task_labels, subtasks tables

Migrations are idempotent (`CREATE TABLE IF NOT EXISTS` pattern).

---

## Container Images

### Backend (`backend/Dockerfile`)

```
FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "dist/src/server.js"]
```

### Frontend (`frontend/Dockerfile`)

Multi-stage build:
1. **Build stage:** `node:lts-alpine` → `npm run build` → outputs `dist/`
2. **Serve stage:** `nginx:alpine` → copies `dist/` → serves on port 80

Nginx config (`frontend/nginx.conf`) includes `try_files $uri /index.html` for SPA client-side routing.

---

## Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f db
docker-compose logs -f web
```

---

## Rebuilding After Code Changes

```bash
# Rebuild a specific service only
docker-compose up --build api

# Rebuild both app services
docker-compose up --build api web
```

---

## Data Persistence

The PostgreSQL data is stored in a named Docker volume `db_data`:

```yaml
volumes:
  db_data:
```

This volume persists across `docker-compose down` (without `-v`). To reset the database, run `docker-compose down -v`.

---

## Accessing Services

| Service | URL | Notes |
|---|---|---|
| Frontend (web UI) | `http://localhost:3000` | React SPA via Nginx |
| Backend API | `http://localhost:3001` | Fastify REST API |
| Health check | `http://localhost:3001/health` | `@fastify/under-pressure` |
| Database | `localhost:5432` | Not exposed by default (internal only) |

> The database port (`5432`) is not mapped to the host in the default `docker-compose.yml`. To expose it for local debugging, add `ports: ["5432:5432"]` to the `db` service.
