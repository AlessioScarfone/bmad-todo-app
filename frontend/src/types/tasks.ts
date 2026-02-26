export interface Task {
  id: number
  userId: number
  title: string
  isCompleted: boolean
  completedAt: string | null
  deadline: string | null
  createdAt: string
  updatedAt: string
  labels: { id: number; name: string }[]
}
