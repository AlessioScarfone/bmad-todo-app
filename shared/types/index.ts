import { Type, Static } from '@sinclair/typebox'

// ─── User ────────────────────────────────────────────────────────────────────

export const UserSchema = Type.Object({
  id: Type.Number(),
  email: Type.String({ format: 'email' }),
  created_at: Type.String({ format: 'date-time' }),
})

export type User = Static<typeof UserSchema>

// ─── Auth — Request/Response schemas ─────────────────────────────────────────

export const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email', minLength: 1 }),
  password: Type.String({ minLength: 8 }),
})

export type RegisterBody = Static<typeof RegisterBodySchema>

export const AuthUserSchema = Type.Object({
  id: Type.Number(),
  email: Type.String(),
})

export type AuthUser = Static<typeof AuthUserSchema>

// ─── Task (placeholder — full schema added in Story 2.1) ─────────────────────

export const TaskSchema = Type.Object({
  id: Type.Number(),
  title: Type.String(),
  is_completed: Type.Boolean(),
  created_at: Type.String({ format: 'date-time' }),
})

export type Task = Static<typeof TaskSchema>

// ─── Subtask (placeholder) ────────────────────────────────────────────────────

export const SubtaskSchema = Type.Object({
  id: Type.Number(),
  task_id: Type.Number(),
  title: Type.String(),
  completed: Type.Boolean(),
})

export type Subtask = Static<typeof SubtaskSchema>

// ─── Label (placeholder) ─────────────────────────────────────────────────────

export const LabelSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  color: Type.String(),
})

export type Label = Static<typeof LabelSchema>

// ─── Error Response ───────────────────────────────────────────────────────────

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Number(),
})

export type ErrorResponse = Static<typeof ErrorResponseSchema>
