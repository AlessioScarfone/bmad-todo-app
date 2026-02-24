import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import type { Sql } from 'postgres'

interface DbPluginOptions {
  sql: Sql
}

declare module 'fastify' {
  interface FastifyInstance {
    sql: Sql
  }
}

const dbPlugin: FastifyPluginAsync<DbPluginOptions> = async (fastify, opts) => {
  fastify.decorate('sql', opts.sql)
}

export default fp(dbPlugin, {
  name: 'db-plugin',
})