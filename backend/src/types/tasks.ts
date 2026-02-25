import { Type, type Static } from '@sinclair/typebox'

export const TaskSchema = Type.Object({
  id:          Type.Number(),
  userId:      Type.Number(),
  title:       Type.String(),
  isCompleted: Type.Boolean(),
  completedAt: Type.Union([Type.String(), Type.Null()]),
  deadline:    Type.Union([Type.String(), Type.Null()]),
  createdAt:   Type.String(),
  updatedAt:   Type.String(),
})

export type Task = Static<typeof TaskSchema>
