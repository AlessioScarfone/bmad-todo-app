-- 003_enrichment.sql
-- Epic 3: Task Enrichment — Labels, Deadlines & Subtasks
-- Creates labels, task_labels, and subtasks tables

-- Labels table: normalized per user
CREATE TABLE IF NOT EXISTS labels (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  UNIQUE(user_id, name)
);

-- Task-label many-to-many join table
CREATE TABLE IF NOT EXISTS task_labels (
  task_id   INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id  INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- Subtasks table: flat structure (one level only)
CREATE TABLE IF NOT EXISTS subtasks (
  id            SERIAL PRIMARY KEY,
  task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  is_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
