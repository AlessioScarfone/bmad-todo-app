-- 001_init.sql
-- Creates the users table (Story 1.1)
-- tasks, labels, task_labels, subtasks tables are added in later stories

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
