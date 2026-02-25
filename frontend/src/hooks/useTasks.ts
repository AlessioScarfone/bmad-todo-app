import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Task } from '../types/tasks'

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks'),
    staleTime: 30_000, // 30s — avoids unnecessary refetches on tab focus
  })
}
