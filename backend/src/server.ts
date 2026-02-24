import Fastify from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import underPressure from '@fastify/under-pressure'
import type { Sql } from 'postgres'
import { fileURLToPath } from 'url'
import { getSqlClient } from './db/client.js'
import { runMigrations } from './db/migrate.js'
import dbPlugin from './plugins/db.js'
import authRoutes from './routes/auth.js'

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const NODE_ENV = process.env.NODE_ENV ?? 'production'

export function buildServer(jwtSecret: string, sqlOverride?: Sql) {
  const dbSql = sqlOverride ?? getSqlClient()

  const fastify = Fastify({
    logger: {
      level: NODE_ENV === 'production' ? 'info' : 'debug'
    },
  })

  // ─── Plugins ───────────────────────────────────────────────────────────────

  fastify.register(cors, {
    origin: true,
    credentials: true,
  })

  fastify.register(cookie)

  fastify.register(jwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  })

  fastify.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 100_000_000,
    maxRssBytes: 150_000_000,
    maxEventLoopUtilization: 0.98,
    exposeStatusRoute: {
      routeOpts: { logLevel: 'debug' },
      url: '/health',
    },
  })

  fastify.register(dbPlugin, {
    sql: dbSql,
  })

  fastify.register(authRoutes, {
    prefix: '/api',
  })

  // ─── Decorators ────────────────────────────────────────────────────────────

  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify()
      } catch {
        return reply.status(401).send({
          statusCode: 401,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        })
      }
    },
  )

  return fastify
}

// ─── Startup ─────────────────────────────────────────────────────────────────

async function start() {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  const fastify = buildServer(JWT_SECRET)
  try {
    await runMigrations(getSqlClient())
    fastify.log.info('Migrations complete')

    await fastify.listen({ port: PORT, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url)

if (isDirectExecution) {
  start()
}
