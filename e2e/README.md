# E2E Tests — bmad-todo-app

Playwright end-to-end test suite that runs against the **full Docker Compose stack**.

> Architecture reference: ADR-005 — Testing Stack

---

## Prerequisites

The full stack must be running before executing tests:

```bash
docker-compose up --build
```

All three services must be healthy:
- `db` — PostgreSQL 16-alpine
- `api` — Fastify backend on port 3001
- `web` — nginx serving the Vite frontend on port 3000

---

## Setup

```bash
cd e2e
npm install
npx playwright install chromium
```

---

## Running tests

| Command | Description |
|---|---|
| `npm test` | Run all tests headlessly |
| `npm run test:headed` | Run in a visible browser window |
| `npm run test:ui` | Open the Playwright interactive UI |
| `npm run test:report` | Show the last HTML test report |

---

## Structure

```
e2e/
├── playwright.config.ts      # baseURL: http://localhost:3000
├── helpers/
│   └── auth.ts               # Shared registration/login helpers + uniqueEmail()
└── tests/
    ├── auth.spec.ts           # Registration, login, session continuity, email pre-fill, logout
    ├── tasks.spec.ts          # Create task, validation, persistence (Stories 2.1, 2.2)
    ├── count.spec.ts          # Task count display — FR21 (Stories 2.1, 2.2)
    ├── subtasks.spec.ts       # Subtask management — all skipped (Story 3.3, backlog)
    └── filters.spec.ts        # Filtering & sorting — all skipped (Stories 4.1–4.2, backlog)
```

---

## Implementation status

| Spec file | Stories covered | Status |
|---|---|---|
| `auth.spec.ts` | 1.2, 1.3, 1.4 | ✅ Active |
| `tasks.spec.ts` | 2.1, 2.2 — active; 2.3, 2.4, 2.5 — skipped | ✅ Active (partial) |
| `count.spec.ts` | 2.1, 2.2 — active; 2.3 — skipped | ✅ Active (partial) |
| `subtasks.spec.ts` | 3.3 | ⏭ All skipped (backlog) |
| `filters.spec.ts` | 4.1, 4.2 | ⏭ All skipped (backlog) |

---

## Test isolation

Each test creates its own user with a `uniqueEmail()` (`test-<timestamp>-<random>@example.com`).
Tests run **serially** (`workers: 1`) to keep DB state predictable.
