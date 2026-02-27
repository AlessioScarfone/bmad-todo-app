import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import {
  getSubtasksByTaskId,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from '../db/queries/subtasks.js'
import { CreateSubtaskBodySchema, UpdateSubtaskBodySchema, SubtaskSchema } from '../types/subtasks.js'
import { ErrorSchema } from '../types/common.js'

const subtaskRoutes: FastifyPluginAsync = async fastify => {
  const f = fastify.withTypeProvider<TypeBoxTypeProvider>()

  const taskParams = Type.Object({ id: Type.Integer({ minimum: 1 }) })
  const subtaskParams = Type.Object({
    id: Type.Integer({ minimum: 1 }),
    subId: Type.Integer({ minimum: 1 }),
  })

  // GET /api/tasks/:id/subtasks
  f.get(
    '/tasks/:id/subtasks',
    {
      preHandler: [fastify.authenticate],
      schema: { tags: ['Subtasks'], params: taskParams, response: { 200: Type.Array(SubtaskSchema) } },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const subtasks = await getSubtasksByTaskId(fastify.sql, req.params.id, userId)
      return reply.status(200).send(subtasks)
    },
  )

  // POST /api/tasks/:id/subtasks
  f.post(
    '/tasks/:id/subtasks',
    {
      preHandler: [fastify.authenticate],
      schema: { tags: ['Subtasks'], params: taskParams, body: CreateSubtaskBodySchema, response: { 201: SubtaskSchema, 400: ErrorSchema, 404: ErrorSchema } },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const title = req.body.title.trim()
      if (title.length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BAD_REQUEST',
          message: 'Subtask title must not be empty or blank',
        })
      }
      const subtask = await createSubtask(fastify.sql, req.params.id, userId, title)
      if (!subtask) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Task not found',
        })
      }
      return reply.status(201).send(subtask)
    },
  )

  // PATCH /api/tasks/:id/subtasks/:subId
  f.patch(
    '/tasks/:id/subtasks/:subId',
    {
      preHandler: [fastify.authenticate],
      schema: { tags: ['Subtasks'], params: subtaskParams, body: UpdateSubtaskBodySchema, response: { 200: SubtaskSchema, 404: ErrorSchema } },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const subtask = await updateSubtask(
        fastify.sql,
        req.params.id,
        userId,
        req.params.subId,
        req.body.isCompleted,
      )
      if (!subtask) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Subtask not found',
        })
      }
      return reply.status(200).send(subtask)
    },
  )

  // DELETE /api/tasks/:id/subtasks/:subId
  f.delete(
    '/tasks/:id/subtasks/:subId',
    {
      preHandler: [fastify.authenticate],
      schema: { tags: ['Subtasks'], params: subtaskParams, response: { 204: Type.Null(), 404: ErrorSchema } },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const deleted = await deleteSubtask(
        fastify.sql,
        req.params.id,
        userId,
        req.params.subId,
      )
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Subtask not found',
        })
      }
      return reply.status(204).send(null)
    },
  )
}

export default fp(subtaskRoutes, {
  name: 'subtask-routes',
  dependencies: ['db-plugin'],
  encapsulate: true,
})
