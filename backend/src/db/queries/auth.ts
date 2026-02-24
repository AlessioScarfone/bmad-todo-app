import type { Sql } from 'postgres';

export async function getUserByEmail(sql: Sql, email: string) {
  const [user] = await sql<{ id: number; email: string; password_hash: string }[]>`
    SELECT id, email, password_hash
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `

  return user
}

export async function createUser(sql: Sql, email: string, passwordHash: string) {
  const [user] = await sql<{ id: number; email: string }[]>`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email
  `

  return user
}