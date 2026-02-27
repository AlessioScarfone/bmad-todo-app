import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import postgres, { type Sql } from 'postgres'
import { runMigrations } from '../../src/db/migrate.js'

export interface TestDb {
  sql: Sql
  container: StartedPostgreSqlContainer
}

export async function createTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start()

  const sql = postgres({
    host: container.getHost(),
    port: container.getMappedPort(5432),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getPassword(),
    max: 5,
    types: {
      date: {
        to: 1082,
        from: [1082],
        serialize: (x: string) => x,
        parse: (x: string) => x,
      },
    },
  })

  await runMigrations(sql)

  return { sql, container }
}
