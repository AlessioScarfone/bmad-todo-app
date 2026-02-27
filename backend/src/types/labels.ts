import { Type, type Static } from '@sinclair/typebox'

export const LabelSchema = Type.Object({
  id:   Type.Integer(),
  name: Type.String(),
})

export type Label = Static<typeof LabelSchema>
