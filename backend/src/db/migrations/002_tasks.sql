-- 002_tasks.sql
-- Creates the tasks table (Story 2.1)
-- labels, task_labels, subtasks tables are added in Story 3.x

CREATE TABLE IF NOT EXISTS tasks (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  deadline     DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(user_id) WHERE is_completed = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(user_id, deadline) WHERE deadline IS NOT NULL;
