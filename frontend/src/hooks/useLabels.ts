import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface Label {
  id: number
  userId: number
  name: string
}

export function useLabels(enabled = true) {
  return useQuery<Label[]>({
    queryKey: ['labels'],
    queryFn: () => api.get<Label[]>('/labels'),
    enabled,
  })
}

export function useDeleteLabel() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, number>({
    mutationFn: (id: number) => api.delete<void>(`/labels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
