import type { Sql } from 'postgres'

export interface Label {
  id: number
  userId: number
  name: string
}

interface LabelWithCreated extends Label {
  created: boolean
}

export const getLabelsByUser = (sql: Sql, userId: number): Promise<Label[]> =>
  sql<Label[]>`
    SELECT
      id,
      user_id AS "userId",
      name
    FROM labels
    WHERE user_id = ${userId}
    ORDER BY name ASC
  `

export const attachLabelToTask = async (
  sql: Sql,
  taskId: number,
  userId: number,
  labelName: string,
): Promise<{ label: Label; created: boolean }> => {
  // 1. Verify task ownership (404 if not owned)
  const [task] = await sql`SELECT id FROM tasks WHERE id = ${taskId} AND user_id = ${userId}`
  if (!task) throw new Error('TASK_NOT_FOUND')

  // 2. Insert label if missing, otherwise fetch existing
  const [label] = await sql<LabelWithCreated[]>`
    WITH inserted AS (
      INSERT INTO labels (user_id, name)
      VALUES (${userId}, ${labelName})
      ON CONFLICT (user_id, name) DO NOTHING
      RETURNING id, user_id AS "userId", name, true AS created
    )
    SELECT id, "userId", name, created
    FROM inserted
    UNION ALL
    SELECT id, user_id AS "userId", name, false AS created
    FROM labels
    WHERE user_id = ${userId}
      AND name = ${labelName}
      AND NOT EXISTS (SELECT 1 FROM inserted)
    LIMIT 1
  `

  // 3. Attach to task (ignore if already attached)
  await sql`
    INSERT INTO task_labels (task_id, label_id)
    VALUES (${taskId}, ${label.id})
    ON CONFLICT DO NOTHING
  `

  return {
    label: {
      id: label.id,
      userId: label.userId,
      name: label.name,
    },
    created: label.created,
  }
}

export const removeLabelFromTask = async (
  sql: Sql,
  taskId: number,
  labelId: number,
  userId: number,
): Promise<boolean> => {
  const rows = await sql`
    DELETE FROM task_labels
    USING tasks
    WHERE task_labels.task_id = tasks.id
      AND task_labels.task_id = ${taskId}
      AND task_labels.label_id = ${labelId}
      AND tasks.user_id = ${userId}
    RETURNING task_labels.task_id
  `
  return rows.length > 0
}

export const deleteLabelByUser = async (
  sql: Sql,
  labelId: number,
  userId: number,
): Promise<boolean> => {
  const rows = await sql`
    DELETE FROM labels
    WHERE id = ${labelId} AND user_id = ${userId}
    RETURNING id
  `
  return rows.length > 0
}

export const getLabelById = async (
  sql: Sql,
  labelId: number,
): Promise<Label | undefined> => {
  const rows = await sql<Label[]>`
    SELECT
      id,
      user_id AS "userId",
      name
    FROM labels
    WHERE id = ${labelId}
  `

  return rows[0]
}
