import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InlineTaskInput } from '../../src/components/InlineTaskInput'
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return { queryClient, ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>) }
}

describe('InlineTaskInput', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders an enabled input and Add button (AC1)', () => {
    renderWithQuery(<InlineTaskInput />)
    expect(screen.getByRole('textbox', { name: /new task title/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /submit new task/i })).toBeEnabled()
  })

  it('shows inline validation hint when Enter pressed with empty title — no API call (AC2)', async () => {
    const spy = vi.spyOn(apiModule.api, 'post')
    renderWithQuery(<InlineTaskInput />)
    await userEvent.click(screen.getByRole('textbox', { name: /new task title/i }))
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent(/cannot be empty/i)
    expect(spy).not.toHaveBeenCalled()
  })

  it('shows validation hint for whitespace-only title — no API call (AC2)', async () => {
    const spy = vi.spyOn(apiModule.api, 'post')
    renderWithQuery(<InlineTaskInput />)
    await userEvent.type(screen.getByRole('textbox', { name: /new task title/i }), '   ')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('calls api.post with trimmed title on Enter (AC1, AC3)', async () => {
    const spy = vi.spyOn(apiModule.api, 'post').mockResolvedValueOnce(makeTask({ title: 'Buy milk' }))
    renderWithQuery(<InlineTaskInput />)
    await userEvent.type(screen.getByRole('textbox', { name: /new task title/i }), '  Buy milk  ')
    await userEvent.keyboard('{Enter}')
    expect(spy).toHaveBeenCalledWith('/tasks', { title: 'Buy milk' })
  })

  it('clears input after successful submit (AC1)', async () => {
    vi.spyOn(apiModule.api, 'post').mockResolvedValueOnce(makeTask())
    renderWithQuery(<InlineTaskInput />)
    const input = screen.getByRole('textbox', { name: /new task title/i }) as HTMLInputElement
    await userEvent.type(input, 'New task')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(input.value).toBe(''))
  })

  it('shows retry affordance on network error (AC4)', async () => {
    vi.spyOn(apiModule.api, 'post').mockRejectedValueOnce(new Error('Network error'))
    renderWithQuery(<InlineTaskInput />)
    await userEvent.type(screen.getByRole('textbox', { name: /new task title/i }), 'Some task')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('retries the mutation when Retry is clicked (AC4)', async () => {
    const spy = vi
      .spyOn(apiModule.api, 'post')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(makeTask())
    renderWithQuery(<InlineTaskInput />)
    await userEvent.type(screen.getByRole('textbox', { name: /new task title/i }), 'Retry task')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => screen.getByRole('button', { name: /retry/i }))
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('clears error state when Dismiss is clicked — rollback already applied (AC4)', async () => {
    vi.spyOn(apiModule.api, 'post').mockRejectedValueOnce(new Error('Network error'))
    renderWithQuery(<InlineTaskInput />)
    await userEvent.type(screen.getByRole('textbox', { name: /new task title/i }), 'Will fail')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => screen.getByRole('button', { name: /dismiss/i }))
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('task count derives from cache — no extra GET /tasks call on success (AC5)', async () => {
    const postSpy = vi.spyOn(apiModule.api, 'post').mockResolvedValueOnce(makeTask({ id: 42 }))
    const getSpy = vi.spyOn(apiModule.api, 'get')
    const { queryClient } = renderWithQuery(<InlineTaskInput />)
    queryClient.setQueryData(['tasks'], [])
    await userEvent.type(screen.getByRole('textbox', { name: /new task title/i }), 'Count check')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(postSpy).toHaveBeenCalled())
    // onSuccess reconciles cache directly — no invalidation, so no extra GET /api/tasks (AC5)
    expect(getSpy).not.toHaveBeenCalled()
  })

  it('optimistic task appears at top of list before server responds (AC1)', async () => {
    let resolveCreate!: (task: Task) => void
    const deferred = new Promise<Task>(r => { resolveCreate = r })
    vi.spyOn(apiModule.api, 'post').mockReturnValueOnce(deferred)

    const { queryClient } = renderWithQuery(<InlineTaskInput />)
    const existing = makeTask({ id: 1, title: 'Existing task' })
    queryClient.setQueryData(['tasks'], [existing])

    await userEvent.type(screen.getByRole('textbox', { name: /new task title/i }), 'New top task')
    await userEvent.keyboard('{Enter}')

    // Optimistic insert should be at index 0 before server has responded
    await waitFor(() => {
      const tasks = queryClient.getQueryData<Task[]>(['tasks'])
      expect(tasks?.[0].title).toBe('New top task')
      expect(tasks?.[1].title).toBe('Existing task')
    })

    // Settle the deferred promise cleanly
    await act(async () => {
      resolveCreate(makeTask({ id: 99, title: 'New top task' }))
    })
  })
})
