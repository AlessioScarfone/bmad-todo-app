import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { useToggleTask, useCreateTask } from '../../src/hooks/useTasks'
import * as apiModule from '../../src/lib/api'
import type { Task } from '../../src/types/tasks'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    userId: 1,
    title: 'Test task',
    isCompleted: false,
    completedAt: null,
    deadline: null,
    createdAt: '2026-02-25T10:00:00.000Z',
    updatedAt: '2026-02-25T10:00:00.000Z',
    ...overrides,
  }
}

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// useToggleTask
// ---------------------------------------------------------------------------

describe('useToggleTask', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  it('calls /complete endpoint when task is currently incomplete', async () => {
    const task = makeTask({ id: 10, isCompleted: false })
    queryClient.setQueryData(['tasks'], [task])
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValue({ ...task, isCompleted: true })

    const { result } = renderHook(() => useToggleTask(), { wrapper: createWrapper(queryClient) })
    await act(async () => { result.current.mutate(task) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith('/tasks/10/complete')
  })

  it('calls /uncomplete endpoint when task is currently complete', async () => {
    const task = makeTask({ id: 11, isCompleted: true })
    queryClient.setQueryData(['tasks'], [task])
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValue({ ...task, isCompleted: false })

    const { result } = renderHook(() => useToggleTask(), { wrapper: createWrapper(queryClient) })
    await act(async () => { result.current.mutate(task) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(spy).toHaveBeenCalledWith('/tasks/11/uncomplete')
  })

  it('optimistically flips isCompleted in cache before server responds', async () => {
    const task = makeTask({ id: 12, isCompleted: false })
    queryClient.setQueryData(['tasks'], [task])

    // Slow API — we check the cache before it resolves
    let resolveApi!: (v: Task) => void
    const pendingRes = new Promise<Task>(r => { resolveApi = r })
    vi.spyOn(apiModule.api, 'patch').mockReturnValue(pendingRes)

    const { result } = renderHook(() => useToggleTask(), { wrapper: createWrapper(queryClient) })

    act(() => { result.current.mutate(task) })

    // onMutate runs (nearly) synchronously — wait for optimistic update
    await waitFor(() => {
      const cached = queryClient.getQueryData<Task[]>(['tasks'])
      expect(cached?.[0].isCompleted).toBe(true)
    })

    // Now resolve the API call to not leave the promise hanging
    resolveApi({ ...task, isCompleted: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('replaces task in cache with server-confirmed data on success', async () => {
    const task = makeTask({ id: 13, isCompleted: false })
    const serverTask: Task = {
      ...task,
      isCompleted: true,
      completedAt: '2026-02-25T12:00:00.000Z',
      updatedAt: '2026-02-25T12:00:00.000Z',
    }
    queryClient.setQueryData(['tasks'], [task])
    vi.spyOn(apiModule.api, 'patch').mockResolvedValue(serverTask)

    const { result } = renderHook(() => useToggleTask(), { wrapper: createWrapper(queryClient) })
    await act(async () => { result.current.mutate(task) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = queryClient.getQueryData<Task[]>(['tasks'])
    expect(cached?.[0].updatedAt).toBe('2026-02-25T12:00:00.000Z')
    expect(cached?.[0].completedAt).toBe('2026-02-25T12:00:00.000Z')
    expect(cached?.[0].isCompleted).toBe(true)
  })

  it('ends in error state when API call fails', async () => {
    const task = makeTask({ id: 14, isCompleted: false })
    queryClient.setQueryData(['tasks'], [task])
    vi.spyOn(apiModule.api, 'patch').mockRejectedValue(new Error('network error'))
    // Mock GET so invalidateQueries refetch does not throw unhandled rejection
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([task])

    const { result } = renderHook(() => useToggleTask(), { wrapper: createWrapper(queryClient) })
    await act(async () => { result.current.mutate(task) })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('network error')
  })
})

// ---------------------------------------------------------------------------
// useCreateTask
// ---------------------------------------------------------------------------

describe('useCreateTask', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    queryClient.setQueryData(['tasks'], [] as Task[])
  })

  it('adds an optimistic task with a negative temp ID to the front of the cache', async () => {
    const serverTask = makeTask({ id: 99, title: 'New task', userId: 5 })

    // Slow API — resolve manually so we can inspect the intermediate cache state
    let resolveApi!: (v: Task) => void
    const pendingRes = new Promise<Task>(r => { resolveApi = r })
    vi.spyOn(apiModule.api, 'post').mockReturnValue(pendingRes)

    const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper(queryClient) })

    // Start mutation — do NOT await so we can read the optimistic cache
    act(() => { result.current.mutate('New task') })

    // onMutate runs synchronously after cancelQueries — wait for optimistic update
    await waitFor(() => {
      const cached = queryClient.getQueryData<Task[]>(['tasks'])
      // optimistic task should be the only entry and have a negative ID
      expect(cached).toHaveLength(1)
      expect(cached![0].id).toBeLessThan(0)
      expect(cached![0].title).toBe('New task')
    })

    // Resolve the API so the mutation finishes cleanly
    resolveApi(serverTask)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('trims the title in the optimistic task', async () => {
    const serverTask = makeTask({ id: 100, title: 'Trimmed', userId: 5 })

    let resolveApi!: (v: Task) => void
    const pendingRes = new Promise<Task>(r => { resolveApi = r })
    vi.spyOn(apiModule.api, 'post').mockReturnValue(pendingRes)

    const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper(queryClient) })

    act(() => { result.current.mutate('  Trimmed  ') })

    await waitFor(() => {
      const cached = queryClient.getQueryData<Task[]>(['tasks'])
      expect(cached?.[0].title).toBe('Trimmed')
    })

    resolveApi(serverTask)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('replaces the optimistic temp task with the server-confirmed task on success', async () => {
    const serverTask = makeTask({ id: 55, title: 'Server task', userId: 7 })
    vi.spyOn(apiModule.api, 'post').mockResolvedValue(serverTask)

    const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper(queryClient) })
    await act(async () => { result.current.mutate('Server task') })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = queryClient.getQueryData<Task[]>(['tasks'])
    expect(cached).toHaveLength(1)
    expect(cached![0].id).toBe(55)
    expect(cached![0].userId).toBe(7)
    // No negative (temp) IDs remain
    expect(cached!.every(t => t.id > 0)).toBe(true)
  })

  it('rolls back cache to previous state on error', async () => {
    // Pre-populate cache with an existing task
    const existingTask = makeTask({ id: 1, title: 'Existing' })
    queryClient.setQueryData(['tasks'], [existingTask])

    vi.spyOn(apiModule.api, 'post').mockRejectedValue(new Error('server error'))
    // Mock GET so invalidateQueries refetch does not throw unhandled rejection
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([existingTask])

    const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper(queryClient) })
    await act(async () => { result.current.mutate('Failed task') })
    await waitFor(() => expect(result.current.isError).toBe(true))

    // onError rolls back — the pre-existing task should still be the only item
    // (after invalidation refetch settles with our mocked GET response)
    await waitFor(() => {
      const cached = queryClient.getQueryData<Task[]>(['tasks'])
      expect(cached?.find(t => t.title === 'Failed task')).toBeUndefined()
    })
  })

  it('ends in error state when API call fails', async () => {
    vi.spyOn(apiModule.api, 'post').mockRejectedValue(new Error('network error'))
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])

    const { result } = renderHook(() => useCreateTask(), { wrapper: createWrapper(queryClient) })
    await act(async () => { result.current.mutate('Bad task') })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe('network error')
  })
})
