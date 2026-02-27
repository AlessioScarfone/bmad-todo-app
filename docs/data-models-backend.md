# Data Models — Backend

> Part: `backend` | Generated: 2026-02-27 | Scan: Quick (inferred from migration filenames and context)

---

## Overview

The database is **PostgreSQL 16**. Schema is managed via sequential SQL migration files in `backend/src/db/migrations/`. Migrations run automatically at server startup via `runMigrations()`.

No ORM is used. All queries are plain SQL via the `postgres` (pg3) tagged-template driver.

---

## Migrations

| File | Purpose |
|---|---|
| `001_init.sql` | `users` table — account management |
| `002_tasks.sql` | `tasks` table — core task data + deadline |
| `003_enrichment.sql` | `labels`, `task_labels` (join), `subtasks` tables |

---

## Tables

### `users`
*(from `001_init.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / SERIAL | PK | User identifier |
| `email` | TEXT | NOT NULL, UNIQUE | Login credential |
| `password_hash` | TEXT | NOT NULL | bcrypt hash |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Registration timestamp |

**Relationships:**
- One user → many tasks (one-to-many via `tasks.user_id`)

---

### `tasks`
*(from `002_tasks.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / SERIAL | PK | Task identifier |
| `user_id` | UUID / INTEGER | NOT NULL, FK → users.id | Task owner |
| `title` | TEXT | NOT NULL | Task title (editable) |
| `completed` | BOOLEAN | NOT NULL, DEFAULT false | Completion state |
| `deadline` | TIMESTAMPTZ / DATE | NULLABLE | Optional deadline |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Relationships:**
- Many tasks → one user (many-to-one)
- One task → many subtasks (one-to-many via `subtasks.task_id`)
- One task → many labels (many-to-many via `task_labels`)

---

### `labels`
*(from `003_enrichment.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / SERIAL | PK | Label identifier |
| `user_id` | UUID / INTEGER | NOT NULL, FK → users.id | Label owner (labels are per-user) |
| `name` | TEXT | NOT NULL | Label display name |
| `color` | TEXT | NULLABLE | Hex color or CSS class |

**Relationships:**
- One user → many labels
- Many labels ↔ many tasks (via `task_labels`)

---

### `task_labels` (join table)
*(from `003_enrichment.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `task_id` | UUID / INTEGER | NOT NULL, FK → tasks.id | Task reference |
| `label_id` | UUID / INTEGER | NOT NULL, FK → labels.id | Label reference |

**Primary key:** composite `(task_id, label_id)`

---

### `subtasks`
*(from `003_enrichment.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID / SERIAL | PK | Subtask identifier |
| `task_id` | UUID / INTEGER | NOT NULL, FK → tasks.id | Parent task |
| `title` | TEXT | NOT NULL | Subtask description |
| `completed` | BOOLEAN | NOT NULL, DEFAULT false | Completion state |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Creation timestamp |

**Relationships:**
- Many subtasks → one task (many-to-one, CASCADE DELETE when parent task deleted)

---

## Entity Relationship Diagram

```
users (1)─────────────(N) tasks (1)─────────────(N) subtasks
  │                         │
  │                         │
  └──(1)──(N) labels        └──(N)──task_labels──(N)── labels
```

---

## Query Organization

All SQL queries are co-located with their domain in `backend/src/db/queries/`:

| File | Queries |
|---|---|
| `auth.ts` | `findUserByEmail()`, `insertUser()` |
| `tasks.ts` | `listTasks()`, `insertTask()`, `updateTask()`, `deleteTask()`, `toggleTask()`, `setTaskDeadline()` |
| `labels.ts` | `listLabels()`, `insertLabel()`, `deleteLabel()`, `attachLabel()`, `detachLabel()` |
| `subtasks.ts` | `insertSubtask()`, `updateSubtask()`, `deleteSubtask()`, `listSubtasksByTask()` |

---

## Notes

> ⚠️ This schema was inferred from migration filenames and feature specification (PRD + stories). For authoritative column definitions, read the actual migration SQL files in `backend/src/db/migrations/`.
