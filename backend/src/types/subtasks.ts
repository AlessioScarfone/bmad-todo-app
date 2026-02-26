import { Type, Static } from '@sinclair/typebox'

export const SubtaskSchema = Type.Object({
  id: Type.Integer(),
  taskId: Type.Integer(),
  title: Type.String(),
  isCompleted: Type.Boolean(),
  createdAt: Type.String(), // ISO 8601
})
export type Subtask = Static<typeof SubtaskSchema>

export const CreateSubtaskBodySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 500 }),
})
export type CreateSubtaskBody = Static<typeof CreateSubtaskBodySchema>

export const UpdateSubtaskBodySchema = Type.Object({
  isCompleted: Type.Boolean(),
})
export type UpdateSubtaskBody = Static<typeof UpdateSubtaskBodySchema>
