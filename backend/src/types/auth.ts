import { Type, type Static } from '@sinclair/typebox'

export const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email', minLength: 1 }),
  password: Type.String({ minLength: 8 }),
})

export type RegisterBody = Static<typeof RegisterBodySchema>
