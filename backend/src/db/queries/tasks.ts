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
