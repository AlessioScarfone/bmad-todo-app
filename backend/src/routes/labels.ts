import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import {
  attachLabelToTask,
  deleteLabelByUser,
  getLabelById,
  getLabelsByUser,
  removeLabelFromTask,
} from '../db/queries/labels.js'
import { LabelSchema } from '../types/labels.js'
import { ErrorSchema } from '../types/common.js'

const labelRoutes: FastifyPluginAsync = async fastify => {
  const f = fastify.withTypeProvider<TypeBoxTypeProvider>()

  f.get(
    '/labels',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Labels'],
        response: {
          200: Type.Array(LabelSchema),
        },
      },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const labels = await getLabelsByUser(fastify.sql, userId)
      return reply.status(200).send(labels)
    },
  )

  f.post(
    '/tasks/:id/labels',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Labels'],
        params: Type.Object({ id: Type.Integer({ minimum: 1 }) }),
        body: Type.Object({
          name: Type.String({ minLength: 1, maxLength: 64 }),
        }),
        response: {
          200: LabelSchema,
          201: LabelSchema,
          400: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const taskId = req.params.id
      const name = req.body.name.trim()

      if (name.length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'BAD_REQUEST',
          message: 'Label name must not be empty or blank',
        })
      }

      try {
        const { label, created } = await attachLabelToTask(fastify.sql, taskId, userId, name)
        return reply.status(created ? 201 : 200).send({
          id: label.id,
          name: label.name,
        })
      } catch (error) {
        if (error instanceof Error && error.message === 'TASK_NOT_FOUND') {
          return reply.status(404).send({
            statusCode: 404,
            error: 'NOT_FOUND',
            message: 'Task not found',
          })
        }

        throw error
      }
    },
  )

  f.delete(
    '/tasks/:id/labels/:labelId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Labels'],
        params: Type.Object({
          id: Type.Integer({ minimum: 1 }),
          labelId: Type.Integer({ minimum: 1 }),
        }),
        response: {
          204: Type.Null(),
          404: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const taskId = req.params.id
      const labelId = req.params.labelId
      const removed = await removeLabelFromTask(fastify.sql, taskId, labelId, userId)

      if (!removed) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Label not attached to task',
        })
      }

      return reply.status(204).send(null)
    },
  )

  f.delete(
    '/labels/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Labels'],
        params: Type.Object({ id: Type.Integer({ minimum: 1 }) }),
        response: {
          204: Type.Null(),
          403: ErrorSchema,
          404: ErrorSchema,
        },
      },
    },
    async (req, reply) => {
      const userId = (req.user as { id: number }).id
      const labelId = req.params.id

      const label = await getLabelById(fastify.sql, labelId)
      if (!label) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Label not found',
        })
      }

      if (label.userId !== userId) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'FORBIDDEN',
          message: 'Label not found or not owned by user',
        })
      }

      const deleted = await deleteLabelByUser(fastify.sql, labelId, userId)
      if (!deleted) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Label not found',
        })
      }

      return reply.status(204).send(null)
    },
  )
}

export default fp(labelRoutes, {
  name: 'label-routes',
  dependencies: ['db-plugin'],
  encapsulate: true,
})
