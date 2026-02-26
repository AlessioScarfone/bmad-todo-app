import type { Sql } from 'postgres'
import type { Subtask } from '../../types/subtasks.js'

// Hardcoded string constant — safe for sql.unsafe() as it is not user input
const SUBTASK_COLUMNS = `id, task_id AS "taskId", title, is_completed AS "isCompleted", created_at AS "createdAt"`

export const getSubtasksByTaskId = async (
  sql: Sql,
  taskId: number,
  userId: number,
): Promise<Subtask[]> => {
  // JOIN with tasks to enforce user ownership (NFR7)
  return sql<Subtask[]>`
    SELECT s.id, s.task_id AS "taskId", s.title, s.is_completed AS "isCompleted", s.created_at AS "createdAt"
    FROM subtasks s
    JOIN tasks t ON t.id = s.task_id
    WHERE s.task_id = ${taskId}
      AND t.user_id = ${userId}
    ORDER BY s.created_at ASC
  `
}

export const createSubtask = async (
  sql: Sql,
  taskId: number,
  userId: number,
  title: string,
): Promise<Subtask | undefined> => {
  // INSERT only if task exists and belongs to user — conditional INSERT via SELECT (NFR7)
  const rows = await sql<Subtask[]>`
    INSERT INTO subtasks (task_id, title)
    SELECT ${taskId}, ${title}
    WHERE EXISTS (
      SELECT 1 FROM tasks WHERE id = ${taskId} AND user_id = ${userId}
    )
    RETURNING ${sql.unsafe(SUBTASK_COLUMNS)}
  `
  return rows[0]
}

export const updateSubtask = async (
  sql: Sql,
  taskId: number,
  userId: number,
  subId: number,
  isCompleted: boolean,
): Promise<Subtask | undefined> => {
  // No updated_at column exists on subtasks table — do NOT attempt to SET it
  const rows = await sql<Subtask[]>`
    UPDATE subtasks
    SET is_completed = ${isCompleted}
    WHERE id = ${subId}
      AND task_id = ${taskId}
      AND EXISTS (
        SELECT 1 FROM tasks WHERE id = ${taskId} AND user_id = ${userId}
      )
    RETURNING ${sql.unsafe(SUBTASK_COLUMNS)}
  `
  return rows[0]
}

export const deleteSubtask = async (
  sql: Sql,
  taskId: number,
  userId: number,
  subId: number,
): Promise<{ id: number } | undefined> => {
  const rows = await sql<{ id: number }[]>`
    DELETE FROM subtasks
    WHERE id = ${subId}
      AND task_id = ${taskId}
      AND EXISTS (
        SELECT 1 FROM tasks WHERE id = ${taskId} AND user_id = ${userId}
      )
    RETURNING id
  `
  return rows[0]
}
