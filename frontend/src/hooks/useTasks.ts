import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Task, Subtask } from '../types/tasks'

interface Label {
  id: number
  name: string
}

interface TaskMutationResponse extends Omit<Task, 'labels'> {
  labels?: Label[]
}

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

  return useMutation<TaskMutationResponse, Error, string, CreateTaskContext>({
    mutationFn: (title: string) => api.post<TaskMutationResponse>('/tasks', { title }),

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
        labels: [],
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
        old?.map(t => (t.id === context?.tempId ? { ...serverTask, labels: serverTask.labels ?? [] } : t)) ?? [],
      )
    },
  })
}

type ToggleTaskContext = { previous: Task[] | undefined }

export function useToggleTask() {
  const queryClient = useQueryClient()

  return useMutation<TaskMutationResponse, Error, Task, ToggleTaskContext>({
    mutationFn: (task: Task) => {
      const endpoint = task.isCompleted
        ? `/tasks/${task.id}/uncomplete`
        : `/tasks/${task.id}/complete`
      return api.patch<TaskMutationResponse>(endpoint)
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
        old?.map(t => (
          t.id === serverTask.id
            ? {
                ...serverTask,
                labels: serverTask.labels ?? t.labels,
              }
            : t
        )) ?? [],
      )
    },
  })
}

type UpdateTaskContext = { previous: Task[] | undefined }

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation<TaskMutationResponse, Error, { id: number; title: string }, UpdateTaskContext>({
    mutationFn: ({ id, title }) => api.patch<TaskMutationResponse>(`/tasks/${id}`, { title }),

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
        old?.map(t => (
          t.id === serverTask.id
            ? {
                ...serverTask,
                labels: serverTask.labels ?? t.labels,
              }
            : t
        )) ?? [],
      )
    },
  })
}

type AttachLabelContext = { previous: Task[] | undefined; taskId: number }

export function useAttachLabel() {
  const queryClient = useQueryClient()

  return useMutation<Label, Error, { taskId: number; name: string }, AttachLabelContext>({
    mutationFn: ({ taskId, name }) => api.post<Label>(`/tasks/${taskId}/labels`, { name }),

    onMutate: async ({ taskId, name }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      const optimisticLabel: Label = { id: -Date.now(), name }

      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(task => (
          task.id === taskId
            ? {
                ...task,
                labels: [...task.labels, optimisticLabel],
              }
            : task
        )) ?? [],
      )

      return { previous, taskId }
    },

    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previous)
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['labels'] })
    },
  })
}

type RemoveLabelContext = { previous: Task[] | undefined }

export function useRemoveLabel() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { taskId: number; labelId: number }, RemoveLabelContext>({
    mutationFn: ({ taskId, labelId }) => api.delete<void>(`/tasks/${taskId}/labels/${labelId}`),

    onMutate: async ({ taskId, labelId }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])

      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(task => (
          task.id === taskId
            ? {
                ...task,
                labels: task.labels.filter(label => label.id !== labelId),
              }
            : task
        )) ?? [],
      )

      return { previous }
    },

    onError: (_error, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Task[]>(['tasks'], context.previous)
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
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

type SetDeadlineContext = { previous: Task[] | undefined }

export function useSetDeadline() {
  const queryClient = useQueryClient()

  return useMutation<TaskMutationResponse, Error, { id: number; deadline: string | null }, SetDeadlineContext>({
    mutationFn: ({ id, deadline }) => api.patch<TaskMutationResponse>(`/tasks/${id}`, { deadline }),

    onMutate: async ({ id, deadline }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previous = queryClient.getQueryData<Task[]>(['tasks'])
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t => (t.id === id ? { ...t, deadline } : t)) ?? [],
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
      // Update cache with server-confirmed task — merge labels from existing cache entry
      // No invalidateQueries on success — avoids extra GET (established pattern)
      queryClient.setQueryData<Task[]>(['tasks'], old =>
        old?.map(t =>
          t.id === serverTask.id
            ? { ...serverTask, labels: serverTask.labels ?? t.labels }
            : t,
        ) ?? [],
      )
    },
  })
}

// ─── Subtask hooks ────────────────────────────────────────────────────────────

export function useSubtasks(taskId: number) {
  return useQuery<Subtask[]>({
    queryKey: ['subtasks', taskId],
    queryFn: () => api.get<Subtask[]>(`/tasks/${taskId}/subtasks`),
    staleTime: 30_000,
  })
}

type CreateSubtaskContext = { previous: Subtask[] | undefined }

export function useCreateSubtask(taskId: number) {
  const queryClient = useQueryClient()

  return useMutation<Subtask, Error, { title: string }, CreateSubtaskContext>({
    mutationFn: ({ title }) => api.post<Subtask>(`/tasks/${taskId}/subtasks`, { title }),

    onMutate: async ({ title }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })
      const previous = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])
      const optimistic: Subtask = {
        id: -Date.now(), // negative temp ID — guaranteed not to collide with real DB IDs
        taskId,
        title,
        isCompleted: false,
        createdAt: new Date().toISOString(),
      }
      queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old => [...(old ?? []), optimistic])
      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Subtask[]>(['subtasks', taskId], context.previous)
      }
    },

    onSuccess: (serverSubtask) => {
      // Replace the temporary optimistic entry (negative id) with the server-confirmed subtask
      queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old =>
        old?.map(s => (s.id < 0 && s.title === serverSubtask.title ? serverSubtask : s)) ?? [serverSubtask],
      )
    },
  })
}

type ToggleSubtaskContext = { previous: Subtask[] | undefined }

export function useToggleSubtask(taskId: number) {
  const queryClient = useQueryClient()

  return useMutation<Subtask, Error, { subId: number; isCompleted: boolean }, ToggleSubtaskContext>({
    mutationFn: ({ subId, isCompleted }) =>
      api.patch<Subtask>(`/tasks/${taskId}/subtasks/${subId}`, { isCompleted }),

    onMutate: async ({ subId, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })
      const previous = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])
      queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old =>
        old?.map(s => (s.id === subId ? { ...s, isCompleted } : s)) ?? [],
      )
      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Subtask[]>(['subtasks', taskId], context.previous)
      }
    },

    onSuccess: (serverSubtask) => {
      // NO auto-complete logic here — FR20: completing all subtasks does NOT complete the parent
      queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old =>
        old?.map(s => (s.id === serverSubtask.id ? serverSubtask : s)) ?? [],
      )
    },
  })
}

type DeleteSubtaskContext = { previous: Subtask[] | undefined }

export function useDeleteSubtask(taskId: number) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { subId: number }, DeleteSubtaskContext>({
    mutationFn: ({ subId }) => api.delete<void>(`/tasks/${taskId}/subtasks/${subId}`),

    onMutate: async ({ subId }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', taskId] })
      const previous = queryClient.getQueryData<Subtask[]>(['subtasks', taskId])
      queryClient.setQueryData<Subtask[]>(['subtasks', taskId], old =>
        old?.filter(s => s.id !== subId) ?? [],
      )
      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Subtask[]>(['subtasks', taskId], context.previous)
      }
    },
    // No onSuccess needed: item already removed from cache optimistically
  })
}
