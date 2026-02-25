import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { getTasks } from '../db/queries/tasks.js'

const taskRoutes: FastifyPluginAsync = async fastify => {
  const f = fastify.withTypeProvider<TypeBoxTypeProvider>()

  f.get(
    '/tasks',
    {
      preHandler: [fastify.authenticate],
      schema: {
        querystring: Type.Object({
          label: Type.Optional(Type.String()),
          status: Type.Optional(Type.String()),
          deadline: Type.Optional(Type.String()),
          sort: Type.Optional(Type.String()),
        }),
      },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const tasks = await getTasks(fastify.sql, userId)
      return reply.status(200).send(tasks)
    },
  )
}

export default fp(taskRoutes, {
  name: 'task-routes',
  dependencies: ['db-plugin'],
  encapsulate: true,
})
