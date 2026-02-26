import type { Sql } from 'postgres'
import type { Task } from '../../types/tasks.js'

export const getTasks = (sql: Sql, userId: number): Promise<Task[]> =>
  sql<Task[]>`
    SELECT
      t.id,
      t.user_id AS "userId",
      t.title,
      t.is_completed AS "isCompleted",
      t.completed_at AS "completedAt",
      t.deadline,
      t.created_at AS "createdAt",
      t.updated_at AS "updatedAt",
      COALESCE(
        json_agg(
          json_build_object('id', l.id, 'name', l.name)
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
      ) AS labels
    FROM tasks t
    LEFT JOIN task_labels tl ON tl.task_id = t.id
    LEFT JOIN labels l ON l.id = tl.label_id
    WHERE t.user_id = ${userId}
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `

export const createTask = async (sql: Sql, userId: number, title: string): Promise<Task> => {
  const [task] = await sql<Task[]>`
    INSERT INTO tasks (user_id, title, is_completed)
    VALUES (${userId}, ${title}, false)
    RETURNING
      id,
      user_id AS "userId",
      title,
      is_completed AS "isCompleted",
      completed_at AS "completedAt",
      deadline,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `
  return task
}

export const completeTask = async (sql: Sql, taskId: number, userId: number): Promise<Task | undefined> => {
  const rows = await sql<Task[]>`
    UPDATE tasks
    SET is_completed = true, completed_at = NOW(), updated_at = NOW()
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING
      id,
      user_id AS "userId",
      title,
      is_completed AS "isCompleted",
      completed_at AS "completedAt",
      deadline,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `
  return rows[0]
}

export const uncompleteTask = async (sql: Sql, taskId: number, userId: number): Promise<Task | undefined> => {
  const rows = await sql<Task[]>`
    UPDATE tasks
    SET is_completed = false, completed_at = NULL, updated_at = NOW()
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING
      id,
      user_id AS "userId",
      title,
      is_completed AS "isCompleted",
      completed_at AS "completedAt",
      deadline,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `
  return rows[0]
}

export const deleteTask = async (sql: Sql, taskId: number, userId: number): Promise<boolean> => {
  const rows = await sql`
    DELETE FROM tasks
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING id
  `
  return rows.length > 0
}

export const updateTaskTitle = async (sql: Sql, taskId: number, userId: number, title: string): Promise<Task | undefined> => {
  const rows = await sql<Task[]>`
    UPDATE tasks
    SET title = ${title}, updated_at = NOW()
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING
      id,
      user_id AS "userId",
      title,
      is_completed AS "isCompleted",
      completed_at AS "completedAt",
      deadline,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `
  return rows[0]
}

export const updateTaskTitleAndDeadline = async (
  sql: Sql,
  taskId: number,
  userId: number,
  title: string,
  deadline: string | null,
): Promise<Task | undefined> => {
  const rows = await sql<Task[]>`
    UPDATE tasks
    SET title = ${title}, deadline = ${deadline}, updated_at = NOW()
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING
      id,
      user_id AS "userId",
      title,
      is_completed AS "isCompleted",
      completed_at AS "completedAt",
      deadline,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `
  return rows[0]
}

export const updateTaskDeadline = async (
  sql: Sql,
  taskId: number,
  userId: number,
  deadline: string | null,
): Promise<Task | undefined> => {
  const rows = await sql<Task[]>`
    UPDATE tasks
    SET deadline = ${deadline}, updated_at = NOW()
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING
      id,
      user_id AS "userId",
      title,
      is_completed AS "isCompleted",
      completed_at AS "completedAt",
      deadline,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `
  return rows[0]
}
