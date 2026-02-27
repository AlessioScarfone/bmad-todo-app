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
| `id` | `SERIAL` | PRIMARY KEY | User identifier (integer) |
| `email` | `TEXT` | NOT NULL, UNIQUE | Login credential |
| `password_hash` | `TEXT` | NOT NULL | bcrypt hash (cost factor: 12) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Registration timestamp |

**Relationships:**
- One user → many tasks (one-to-many via `tasks.user_id` CASCADE DELETE)
- One user → many labels (one-to-many via `labels.user_id` CASCADE DELETE)

---

### `tasks`
*(from `002_tasks.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | PRIMARY KEY | Task identifier (integer) |
| `user_id` | `INTEGER` | NOT NULL, FK → users.id ON DELETE CASCADE | Task owner |
| `title` | `TEXT` | NOT NULL | Task title (editable) |
| `is_completed` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Completion state |
| `completed_at` | `TIMESTAMPTZ` | NULLABLE | When task was completed (null if incomplete) |
| `deadline` | `DATE` | NULLABLE | Optional due date |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_tasks_user_id` on `(user_id)`
- `idx_tasks_completed` on `(user_id)` WHERE `is_completed = TRUE` (partial)
- `idx_tasks_deadline` on `(user_id, deadline)` WHERE `deadline IS NOT NULL` (partial)

**Relationships:**
- Many tasks → one user (CASCADE DELETE)
- One task → many subtasks (one-to-many via `subtasks.task_id`)
- One task → many labels (many-to-many via `task_labels`)

---

### `labels`
*(from `003_enrichment.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | PRIMARY KEY | Label identifier (integer) |
| `user_id` | `INTEGER` | NOT NULL, FK → users.id ON DELETE CASCADE | Label owner |
| `name` | `TEXT` | NOT NULL | Label display name |

**Unique constraint:** `UNIQUE(user_id, name)` — label names are unique per user.

> Note: No `color` column exists in the current schema (was in spec but not implemented).

**Relationships:**
- One user → many labels
- Many labels ↔ many tasks (via `task_labels`)

---

### `task_labels` (join table)
*(from `003_enrichment.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `task_id` | `INTEGER` | NOT NULL, FK → tasks.id ON DELETE CASCADE | Task reference |
| `label_id` | `INTEGER` | NOT NULL, FK → labels.id ON DELETE CASCADE | Label reference |

**Primary key:** composite `(task_id, label_id)`

---

### `subtasks`
*(from `003_enrichment.sql`)*

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `SERIAL` | PRIMARY KEY | Subtask identifier (integer) |
| `task_id` | `INTEGER` | NOT NULL, FK → tasks.id ON DELETE CASCADE | Parent task |
| `title` | `TEXT` | NOT NULL | Subtask description |
| `is_completed` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | Completion state |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Relationships:**
- Many subtasks → one task (CASCADE DELETE when parent task deleted)

---

## Entity Relationship Diagram

```
users (1)────────────────────(N) tasks (1)──────────────────────────(N) subtasks
  │                                │                                    (CASCADE)
  │ (CASCADE)                      │
  └──(1)──(N) labels               └──(N)──task_labels──(N)──────── labels
              (UNIQUE user_id+name)         (CASCADE both sides)
```

**TypeScript types (camelCase, as returned in API responses):**

```typescript
interface Task {
  id: number
  userId: number
  title: string
  isCompleted: boolean
  completedAt: string | null   // ISO 8601
  deadline: string | null      // "YYYY-MM-DD" (DATE)
  createdAt: string
  updatedAt: string
  labels: { id: number; name: string }[]
}

interface Subtask {
  id: number
  taskId: number
  title: string
  isCompleted: boolean
  createdAt: string
}
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

> ✅ This schema was read directly from SQL migration files in `backend/src/db/migrations/`. TypeScript interface shapes were read from `frontend/src/types/tasks.ts`.
