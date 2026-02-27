import { Type, type Static } from '@sinclair/typebox'

export const ErrorSchema = Type.Object({
  statusCode: Type.Integer(),
  error:      Type.String(),
  message:    Type.String(),
})

export type ErrorResponse = Static<typeof ErrorSchema>
