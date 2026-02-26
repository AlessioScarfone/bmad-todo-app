import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { useDeleteLabel, useLabels } from '../../src/hooks/useLabels'
import * as apiModule from '../../src/lib/api'

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useLabels', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  it('fetches from /api/labels and returns label array', async () => {
    const labels = [
      { id: 1, userId: 10, name: 'Backend' },
      { id: 2, userId: 10, name: 'Admin' },
    ]

    const getSpy = vi.spyOn(apiModule.api, 'get').mockResolvedValue(labels)

    const { result } = renderHook(() => useLabels(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/labels')
    expect(result.current.data).toEqual(labels)
  })
})

describe('useDeleteLabel', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  it('invalidates labels and tasks on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    vi.spyOn(apiModule.api, 'delete').mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteLabel(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync(5)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['labels'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tasks'] })
  })
})
