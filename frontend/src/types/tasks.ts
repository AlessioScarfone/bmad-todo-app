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

export interface Subtask {
  id: number
  taskId: number
  title: string
  isCompleted: boolean
  createdAt: string // ISO 8601
}
