import type { Sql } from 'postgres'
import type { Task } from '../../types/tasks.js'

export const getTasks = (sql: Sql, userId: number): Promise<Task[]> =>
  sql<Task[]>`
    SELECT
      id,
      user_id AS "userId",
      title,
      is_completed AS "isCompleted",
      completed_at AS "completedAt",
      deadline,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM tasks
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
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
