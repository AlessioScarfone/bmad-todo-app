import { Type, type Static } from '@sinclair/typebox'

export const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email', minLength: 1 }),
  password: Type.String({ minLength: 8 }),
})

export type RegisterBody = Static<typeof RegisterBodySchema>

export const LoginBodySchema = Type.Object({
  email: Type.String({ format: 'email', minLength: 1 }),
  password: Type.String({ minLength: 1 }),
})

export type LoginBody = Static<typeof LoginBodySchema>

export const AuthUserSchema = Type.Object({
  id: Type.Number(),
  email: Type.String(),
})

export type AuthUser = Static<typeof AuthUserSchema>
