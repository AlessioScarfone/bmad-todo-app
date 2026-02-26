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
  labels:      Type.Array(Type.Object({ id: Type.Integer(), name: Type.String() }), { default: [] }),
})

export type Task = Static<typeof TaskSchema>

export const CreateTaskBodySchema = Type.Object({
  title: Type.String({ minLength: 1 }),
})

export type CreateTaskBody = Static<typeof CreateTaskBodySchema>

export const UpdateTaskBodySchema = Type.Partial(
  Type.Object({
    title:    Type.String({ minLength: 1 }),
    deadline: Type.Union([Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), Type.Null()]),
  }),
  { additionalProperties: false },
)

export type UpdateTaskBody = Static<typeof UpdateTaskBodySchema>
