import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import bcrypt from 'bcrypt'
import { Type } from '@sinclair/typebox'
import { createUser } from '../db/queries/auth.js'

const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email', minLength: 1 }),
  password: Type.String({ minLength: 8 }),
})

const authRoutes: FastifyPluginAsync = async fastify => {
  const f = fastify.withTypeProvider<TypeBoxTypeProvider>()

  f.setErrorHandler((err, _req, reply) => {
    const validationError = err as { validation?: unknown; message?: string }

    if (validationError.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'BAD_REQUEST',
        message: validationError.message ?? 'Invalid request body',
      })
    }

    throw err
  })

  f.post(
    '/auth/register',
    {
      schema: {
        body: RegisterBodySchema,
      },
    },
    async (req: { body: { email: string; password: string } }, reply) => {
      const { email, password } = req.body

      const passwordHash = await bcrypt.hash(password, 12)

      try {
        const user = await createUser(fastify.sql, email, passwordHash)
        return reply.status(201).send(user)
      } catch (err) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code?: string }).code === '23505'
        ) {
          return reply.status(409).send({
            statusCode: 409,
            error: 'CONFLICT',
            message: 'Email already in use',
          })
        }

        throw err
      }
    },
  )
}

export default fp(authRoutes, {
  name: 'auth-routes',
  dependencies: ['db-plugin'],
  encapsulate: true,
})