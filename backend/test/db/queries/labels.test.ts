import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Sql } from 'postgres'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { createTestDb } from '../../helpers/db.js'
import {
    getLabelsByUser,
    attachLabelToTask,
    removeLabelFromTask,
    deleteLabelByUser,
} from '../../../src/db/queries/labels.js'

let sql: Sql
let container: StartedPostgreSqlContainer

beforeAll(async () => {
  const db = await createTestDb()
  sql = db.sql
  container = db.container
})

afterAll(async () => {
  await sql?.end()
  await container?.stop()
})

describe('getLabelsByUser', () => {
  it('returns empty array for new user', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('getlabels1@test.com', 'hash')
      RETURNING id
    `

    const labels = await getLabelsByUser(sql, user.id)
    expect(labels).toEqual([])
  })

  it('returns labels sorted alphabetically A→Z', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('getlabels2@test.com', 'hash')
      RETURNING id
    `

    await sql`INSERT INTO labels (user_id, name) VALUES (${user.id}, 'Zebra')`
    await sql`INSERT INTO labels (user_id, name) VALUES (${user.id}, 'Admin')`
    await sql`INSERT INTO labels (user_id, name) VALUES (${user.id}, 'Client')`

    const labels = await getLabelsByUser(sql, user.id)
    expect(labels.map(l => l.name)).toEqual(['Admin', 'Client', 'Zebra'])
  })

  it('only returns labels for requesting user', async () => {
    const [user1] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('getlabels3a@test.com', 'hash')
      RETURNING id
    `
    const [user2] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('getlabels3b@test.com', 'hash')
      RETURNING id
    `

    await sql`INSERT INTO labels (user_id, name) VALUES (${user1.id}, 'User1Label')`
    await sql`INSERT INTO labels (user_id, name) VALUES (${user2.id}, 'User2Label')`

    const labels = await getLabelsByUser(sql, user1.id)
    expect(labels).toHaveLength(1)
    expect(labels[0].name).toBe('User1Label')
  })
})

describe('attachLabelToTask', () => {
  it('creates new label and task_labels row', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('attach1@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user.id}, 'Test task')
      RETURNING id
    `

    const { label, created } = await attachLabelToTask(sql, task.id, user.id, 'Backend')

    expect(label.name).toBe('Backend')
    expect(label.userId).toBe(user.id)
    expect(label.id).toBeGreaterThan(0)
    expect(created).toBe(true)

    // Verify task_labels row exists
    const links = await sql`
      SELECT * FROM task_labels
      WHERE task_id = ${task.id} AND label_id = ${label.id}
    `
    expect(links).toHaveLength(1)
  })

  it('returns existing label if name already exists (no duplicate)', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('attach2@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user.id}, 'Test task')
      RETURNING id
    `

    const label1Result = await attachLabelToTask(sql, task.id, user.id, 'Frontend')
    const label2Result = await attachLabelToTask(sql, task.id, user.id, 'Frontend')

    const label1 = label1Result.label
    const label2 = label2Result.label

    expect(label1.id).toBe(label2.id)
    expect(label1Result.created).toBe(true)
    expect(label2Result.created).toBe(false)

    // Verify only one label exists
    const labels = await sql`SELECT * FROM labels WHERE user_id = ${user.id} AND name = 'Frontend'`
    expect(labels).toHaveLength(1)
  })

  it('is idempotent on second attach of same label to same task (ON CONFLICT DO NOTHING)', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('attach3@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user.id}, 'Test task')
      RETURNING id
    `

    await attachLabelToTask(sql, task.id, user.id, 'Admin')
    await attachLabelToTask(sql, task.id, user.id, 'Admin')

    // Verify only one task_labels row exists
    const links = await sql`
      SELECT * FROM task_labels WHERE task_id = ${task.id}
    `
    expect(links).toHaveLength(1)
  })

  it('throws TASK_NOT_FOUND when task does not exist', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('attach4@test.com', 'hash')
      RETURNING id
    `

    await expect(
      attachLabelToTask(sql, 99999, user.id, 'Label')
    ).rejects.toThrow('TASK_NOT_FOUND')
  })

  it('throws TASK_NOT_FOUND when task belongs to another user', async () => {
    const [user1] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('attach5a@test.com', 'hash')
      RETURNING id
    `
    const [user2] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('attach5b@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user1.id}, 'User1 task')
      RETURNING id
    `

    await expect(
      attachLabelToTask(sql, task.id, user2.id, 'Label')
    ).rejects.toThrow('TASK_NOT_FOUND')
  })
})

describe('removeLabelFromTask', () => {
  it('removes task_labels row, label remains in labels table', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('remove1@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user.id}, 'Test task')
      RETURNING id
    `

    const { label } = await attachLabelToTask(sql, task.id, user.id, 'Design')

    const result = await removeLabelFromTask(sql, task.id, label.id, user.id)
    expect(result).toBe(true)

    // Verify link is gone
    const links = await sql`
      SELECT * FROM task_labels
      WHERE task_id = ${task.id} AND label_id = ${label.id}
    `
    expect(links).toHaveLength(0)

    // Verify label still exists
    const labels = await sql`SELECT * FROM labels WHERE id = ${label.id}`
    expect(labels).toHaveLength(1)
  })

  it('returns false for non-existent link', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('remove2@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user.id}, 'Test task')
      RETURNING id
    `

    const result = await removeLabelFromTask(sql, task.id, 99999, user.id)
    expect(result).toBe(false)
  })

  it('respects ownership (cannot remove label from another user\'s task)', async () => {
    const [user1] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('remove3a@test.com', 'hash')
      RETURNING id
    `
    const [user2] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('remove3b@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user1.id}, 'User1 task')
      RETURNING id
    `

    const { label } = await attachLabelToTask(sql, task.id, user1.id, 'Security')

    const result = await removeLabelFromTask(sql, task.id, label.id, user2.id)
    expect(result).toBe(false)

    // Verify link still exists
    const links = await sql`
      SELECT * FROM task_labels
      WHERE task_id = ${task.id} AND label_id = ${label.id}
    `
    expect(links).toHaveLength(1)
  })
})

describe('deleteLabelByUser', () => {
  it('removes label and cascades to task_labels', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('delete1@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user.id}, 'Test task')
      RETURNING id
    `

    const { label } = await attachLabelToTask(sql, task.id, user.id, 'ToDelete')

    const result = await deleteLabelByUser(sql, label.id, user.id)
    expect(result).toBe(true)

    // Verify label is gone
    const labels = await sql`SELECT * FROM labels WHERE id = ${label.id}`
    expect(labels).toHaveLength(0)

    // Verify task_labels row is gone (CASCADE)
    const links = await sql`
      SELECT * FROM task_labels WHERE label_id = ${label.id}
    `
    expect(links).toHaveLength(0)
  })

  it('returns false for wrong userId', async () => {
    const [user1] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('delete2a@test.com', 'hash')
      RETURNING id
    `
    const [user2] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('delete2b@test.com', 'hash')
      RETURNING id
    `
    const [task] = await sql<{ id: number }[]>`
      INSERT INTO tasks (user_id, title)
      VALUES (${user1.id}, 'Test task')
      RETURNING id
    `

    const { label } = await attachLabelToTask(sql, task.id, user1.id, 'Protected')

    const result = await deleteLabelByUser(sql, label.id, user2.id)
    expect(result).toBe(false)

    // Verify label still exists
    const labels = await sql`SELECT * FROM labels WHERE id = ${label.id}`
    expect(labels).toHaveLength(1)
  })

  it('returns false for non-existent label', async () => {
    const [user] = await sql<{ id: number }[]>`
      INSERT INTO users (email, password_hash)
      VALUES ('delete3@test.com', 'hash')
      RETURNING id
    `

    const result = await deleteLabelByUser(sql, 99999, user.id)
    expect(result).toBe(false)
  })
})
