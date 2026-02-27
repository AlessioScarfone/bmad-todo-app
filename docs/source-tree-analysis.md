# Source Tree Analysis

> Generated: 2026-02-27 (rescan) | Scan: Quick (read from source)

---

## Repository Root

```
bmad-todo-app/                          # Monorepo root
├── .env                                # Local environment variables (gitignored)
├── .env.example                        # Environment variable reference
├── .gitignore
├── docker-compose.yml                  # Orchestrates: db / api / web services
├── notes.md                            # Developer notes / process log
│
├── frontend/                           # ← PART: web SPA (React + Vite)
├── backend/                            # ← PART: REST API (Fastify + PostgreSQL)
├── e2e/                                # ← PART: End-to-end tests (Playwright)
│
├── docs/                               # AI-readable project documentation (this folder)
│
├── _bmad-output/                       # BMAD workflow artifacts
│   ├── planning-artifacts/             # PRD, architecture, epics, UX design
│   └── implementation-artifacts/       # Sprint stories (1-1 through 5-4)
│
└── .github/
    ├── copilot-instructions.md         # BMAD session config for Copilot
    ├── agents/                         # BMAD agent definitions (.agent.md files)
    └── prompts/                        # BMAD workflow prompt files (.prompt.md files)
```

---

## Frontend (`frontend/`)

```
frontend/
├── Dockerfile                          # Production image: Vite build → Nginx alpine
├── nginx.conf                          # Nginx config: SPA fallback (try_files … /index.html)
├── index.html                          # Vite HTML entry (injects <script src="/src/main.tsx">)
├── package.json                        # Dependencies, scripts (dev/build/lint/test)
├── vite.config.ts                      # Vite config (React plugin, test config)
├── vitest.config.ts                    # Vitest config (jsdom environment, setup files)
├── tsconfig.json / tsconfig.app.json   # TypeScript config
├── tailwind.config.ts                  # Tailwind CSS v4 config
├── postcss.config.js                   # PostCSS config (Tailwind + Autoprefixer)
├── eslint.config.js                    # ESLint flat config
│
├── public/                             # Static public assets (served as-is)
│
├── src/                                # Application source
│   ├── main.tsx                        # ★ Entry point — React.createRoot + providers
│   ├── App.tsx                         # Root component (Router + QueryClientProvider)
│   ├── App.css / index.css             # Global styles + Tailwind directives
│   │
│   ├── pages/                          # Route-level components
│   │   ├── LoginPage.tsx               # /login — login form, email pre-fill
│   │   ├── RegisterPage.tsx            # /register — registration form
│   │   └── TaskListPage.tsx            # / (protected) — main task management view
│   │
│   ├── components/                     # Reusable UI components
│   │   ├── AppHeader.tsx               # Top bar: app name, user email, logout button
│   │   ├── TaskCountDisplay.tsx        # "3/5" completed/total display
│   │   ├── TaskRow.tsx                 # Task item: checkbox, title (editable), labels, deadline, delete
│   │   ├── SubtaskPanel.tsx            # Collapsible subtask list per task
│   │   ├── InlineTaskInput.tsx         # Inline create-task form (Enter to submit)
│   │   ├── FilterBar.tsx               # Filter controls: label / status / deadline
│   │   ├── SortDropdown.tsx            # Sort order picker (created, title, deadline, etc.)
│   │   ├── SkeletonTaskRow.tsx         # Loading placeholder
│   │   ├── EmptyState.tsx              # Shown when task list is empty
│   │   ├── ErrorBoundary.tsx           # React error boundary
│   │   └── ProtectedRoute.tsx          # Auth guard — redirects to /login
│   │
│   ├── hooks/                          # Data hooks (TanStack Query wrappers)
│   │   ├── useAuth.ts                  # Auth state: user, login(), logout(), register()
│   │   ├── useTasks.ts                 # Tasks: list, create, update, delete, toggle, set deadline
│   │   └── useLabels.ts                # Labels: list, create, delete, attach/detach from task
│   │
│   ├── lib/                            # Shared utilities
│   │   ├── api.ts                      # Typed fetch wrapper — BASE='/api', credentials:'include'
│   │   └── auth.ts                     # Email pre-fill helpers — localStorage key 'bmad_todo_email'
│   │
│   ├── types/                          # TypeScript types & interfaces
│   │   ├── tasks.ts                    # Task, Subtask interfaces (camelCase, matches API JSON)
│   │   └── auth.ts                     # User interface
│   │
│   └── assets/                         # Bundled assets (SVG, images)
│
└── test/                               # Unit & component tests
    └── (*.test.tsx / *.spec.tsx files)
```

---

## Backend (`backend/`)

```
backend/
├── Dockerfile                          # Production image: tsc build → node
├── package.json                        # Dependencies, scripts (dev/build/start/test)
├── tsconfig.json                       # TypeScript config (ESM, strict)
├── vitest.config.ts                    # Vitest config
│
└── src/
    ├── server.ts                       # ★ Entry point — buildServer() factory + main() bootstrap
    │
    ├── plugins/
    │   └── db.ts                       # Fastify plugin: decorates fastify.sql with postgres client
    │
    ├── routes/                         # Route handlers (one file per resource)
    │   ├── auth.ts                     # POST /auth/register, /auth/login, /auth/logout
    │   ├── tasks.ts                    # GET/POST /tasks, PATCH/DELETE /tasks/:id
    │   ├── labels.ts                   # GET/POST/DELETE /labels, attach/detach from tasks
    │   └── subtasks.ts                 # POST /tasks/:id/subtasks, PATCH/DELETE /subtasks/:id
    │
    ├── db/
    │   ├── client.ts                   # getSqlClient() — reads DATABASE_URL, creates postgres pool
    │   ├── migrate.ts                  # runMigrations() — sequential SQL file execution
    │   ├── migrations/
    │   │   ├── 001_init.sql            # users table
    │   │   ├── 002_tasks.sql           # tasks table (+ deadline column)
    │   │   └── 003_enrichment.sql      # labels, task_labels, subtasks tables
    │   └── queries/
    │       ├── auth.ts                 # User lookup / insert queries
    │       ├── tasks.ts                # Task CRUD queries
    │       ├── labels.ts               # Label CRUD + join table queries
    │       └── subtasks.ts             # Subtask CRUD queries
    │
    └── types/
        └── (TypeBox schemas, augmented FastifyInstance type)
```

---

## E2E (`e2e/`)

```
e2e/
├── package.json                        # Playwright + axe-core dependencies
├── playwright.config.ts                # baseURL: http://localhost:3000, browser: Chromium
├── README.md                           # Setup and usage instructions
│
├── helpers/
│   └── auth.ts                         # Helpers: uniqueEmail(), registerUser(), loginUser()
│
└── tests/
    ├── auth.spec.ts                    # Registration, login, session persistence, email pre-fill, logout
    ├── tasks.spec.ts                   # Task CRUD flows
    ├── count.spec.ts                   # Task count display (FR21)
    ├── subtasks.spec.ts                # Subtask management
    ├── labels.spec.ts                  # Label attach/detach
    ├── deadlines.spec.ts               # Deadline set/remove
    ├── filters.spec.ts                 # Filter by label/status/deadline
    ├── keyboard-navigation.spec.ts     # Full keyboard nav coverage
    ├── accessibility.spec.ts           # axe-core WCAG 2.1 AA scan
    ├── performance.spec.ts             # Sub-second state reflection checks
    └── errors.spec.ts                  # Inline error feedback + retry
```

---

## Integration Points

```
frontend/src/lib/          ──HTTP (JSON + cookie)──►  backend/src/routes/
                                   :3001 (dev)
                                   :3001 (Docker internal network via docker-compose)

backend/src/db/client.ts  ──postgres protocol──►  postgres:5432
                                   (Docker internal network)
```
