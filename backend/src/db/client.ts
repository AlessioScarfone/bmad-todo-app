import postgres, { type Sql } from 'postgres'

function createSqlClient(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
  })
}

let cachedSql: Sql | undefined

export function getSqlClient(): Sql {
  if (cachedSql) {
    return cachedSql
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  cachedSql = createSqlClient(databaseUrl)
  return cachedSql
}
