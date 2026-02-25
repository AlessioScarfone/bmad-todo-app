import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Task } from '../types/tasks'

type DeleteTaskContext = { previous: Task[] | undefined }

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => api.get<Task[]>('/tasks'),
    staleTime: 30_000, // 30s — avoids unnecessary refetches on tab focus
  })
}

type CreateTaskContext = { previous: Task[] | undefined; tempId: number }

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation<Task, Error, string, CreateTaskContext>({
    mutationFn: (title: string) => api.post<Task>('/tasks', { title }),

    onMutate: async (title: string) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      const tempId = -Date.now() // unique negative temp ID

      const optimisticTask: Task = {
        id: tempId,
        userId: -1, // placeholder — reconciled on success
        title: title.trim(),
        isCompleted: false,
        completedAt: null,
        deadline: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Optimistic insert at the top of the list (AC1, AC5)
      queryClient.setQueryData<Task[]>(['tasks'], old => [optimisticTask, ...(old ?? [])])

      return { previous, tempId }
    },

    onError: (_err, _title, context) => {
      // Rollback to previous state (AC4)
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previous)
      }
      // Re-sync with server after failure to ensure cache consistency
      // On success we do NOT invalidate — count is derived from cache alone (AC5)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },

    onSuccess: (serverTask, _title, context) => {
      // Replace optimistic task with server-confirmed task (AC1, AC3)
      // No invalidation here — avoids extra GET /api/tasks that would violate AC5
      // Fallback to [] (not [serverTask]) to avoid wiping the task list if cache is cold
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => (t.id === context?.tempId ? serverTask : t)) ?? [],
      )
    },
  })
}

type ToggleTaskContext = { previous: Task[] | undefined }

export function useToggleTask() {
  const queryClient = useQueryClient()

  return useMutation<Task, Error, Task, ToggleTaskContext>({
    mutationFn: (task: Task) => {
      const endpoint = task.isCompleted
        ? `/tasks/${task.id}/uncomplete`
        : `/tasks/${task.id}/complete`
      return api.patch<Task>(endpoint)
    },

    onMutate: async (task: Task) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] })

      const previous = queryClient.getQueryData<Task[]>(['tasks'])

      // Optimistically flip isCompleted for the affected task
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => (t.id === task.id ? { ...t, isCompleted: !t.isCompleted } : t)) ?? [],
      )

      return { previous }
    },

    onError: (_err, _task, context) => {
      // Rollback to previous state (AC4)
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previous)
      }
      // Re-sync with server after failure to ensure cache consistency
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },

    onSuccess: (serverTask) => {
      // Replace task in cache with server-confirmed task to reconcile
      // No invalidateQueries on success — avoids extra GET that violates <500ms requirement (AC2)
      // Fallback to [] (not [serverTask]) to avoid wiping the task list if cache is cold
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => (t.id === serverTask.id ? serverTask : t)) ?? [],
      )
    },
  })
}

type UpdateTaskContext = { previous: Task[] | undefined }

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation<Task, Error, { id: number; title: string }, UpdateTaskContext>({
    mutationFn: ({ id, title }) => api.patch<Task>(`/tasks/${id}`, { title }),

    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => (t.id === id ? { ...t, title } : t)) ?? [],
      )
      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previous)
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },

    onSuccess: (serverTask) => {
      // Replace task in cache with server-confirmed task
      // No invalidateQueries on success — avoids extra GET (AC2 optimistic requirement)
      // Safe fallback: ?? [] (not ?? [serverTask]) — avoids replacing the whole list with one
      // task when the cache is unexpectedly cold (established pattern from useToggleTask)
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => (t.id === serverTask.id ? serverTask : t)) ?? [],
      )
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, number, DeleteTaskContext>({
    mutationFn: (id: number) => api.delete<void>(`/tasks/${id}`),

    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.filter(t => t.id !== id) ?? [],
      )
      return { previous }
    },

    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previous)
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },

    onSuccess: () => {
      // Task already removed optimistically — no cache update needed
      // Do NOT call invalidateQueries on success (established pattern — avoids extra GET)
    },
  })
}
