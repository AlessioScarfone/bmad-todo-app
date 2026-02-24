import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import bcrypt from 'bcrypt'
import postgres from 'postgres'
import { RegisterBodySchema, LoginBodySchema } from '../types/auth.js'
import { createUser, getUserByEmail } from '../db/queries/auth.js'

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
    async (req, reply) => {
      const { email, password } = req.body

      const passwordHash = await bcrypt.hash(password, 12)

      try {
        const user = await createUser(fastify.sql, email, passwordHash)
        return reply.status(201).send(user)
      } catch (err) {
        if (err instanceof postgres.PostgresError && err.code === '23505') {
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

  f.post(
    '/auth/login',
    {
      schema: {
        body: LoginBodySchema,
      },
    },
    async (req, reply) => {
      const { email, password } = req.body
      // NEVER log req.body on auth routes

      const user = await getUserByEmail(fastify.sql, email)
      if (!user) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      const valid = await bcrypt.compare(password, user.password_hash)
      if (!valid) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        })
      }

      const token = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: '30d' },
      )

      return reply
        .setCookie('token', token, {
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 30 * 24 * 60 * 60,
        })
        .status(200)
        .send({ id: user.id, email: user.email })
    },
  )

  f.get(
    '/auth/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (req) => {
      const { id, email } = req.user
      return { id, email }
    },
  )
}

export default fp(authRoutes, {
  name: 'auth-routes',
  dependencies: ['db-plugin'],
  encapsulate: true,
})
