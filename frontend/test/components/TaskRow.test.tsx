import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskRow } from '../../src/components/TaskRow'
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

function renderWithQuery(ui: React.ReactElement, initialTasks: Task[] = []) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  // Pre-populate the cache with tasks so toggle mutation can find/update them
  queryClient.setQueryData(['tasks'], initialTasks)
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  }
}

describe('TaskRow', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders the task title (AC1)', () => {
    const task = makeTask({ title: 'Buy groceries' })
    renderWithQuery(<TaskRow task={task} />, [task])
    expect(screen.getByText('Buy groceries')).toBeInTheDocument()
  })

  it('checkbox is unchecked when isCompleted is false (AC1)', () => {
    const task = makeTask({ isCompleted: false })
    renderWithQuery(<TaskRow task={task} />, [task])
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('checkbox is checked and title has line-through when isCompleted is true (AC3)', () => {
    const task = makeTask({ isCompleted: true })
    renderWithQuery(<TaskRow task={task} />, [task])
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
    const title = screen.getByText(task.title)
    expect(title.className).toMatch(/line-through/)
  })

  it('has correct aria-label when incomplete (AC1)', () => {
    const task = makeTask({ title: 'Write report', isCompleted: false })
    renderWithQuery(<TaskRow task={task} />, [task])
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-label', 'Mark Write report as done')
  })

  it('has correct aria-label when complete (AC3)', () => {
    const task = makeTask({ title: 'Write report', isCompleted: true })
    renderWithQuery(<TaskRow task={task} />, [task])
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-label', 'Mark Write report as not done')
  })

  it('clicking checkbox fires the toggle mutation (AC1)', async () => {
    const task = makeTask({ id: 42, isCompleted: false })
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValueOnce({ ...task, isCompleted: true })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('checkbox'))
    expect(spy).toHaveBeenCalledWith('/tasks/42/complete')
  })

  it('clicking checkbox on completed task fires uncomplete mutation (AC3)', async () => {
    const task = makeTask({ id: 43, isCompleted: true })
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValueOnce({ ...task, isCompleted: false })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('checkbox'))
    expect(spy).toHaveBeenCalledWith('/tasks/43/uncomplete')
  })

  it('Space key on the row triggers toggle (keyboard-native, AC1)', async () => {
    const task = makeTask({ id: 44, isCompleted: false })
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValueOnce({ ...task, isCompleted: true })
    renderWithQuery(<TaskRow task={task} />, [task])
    const checkbox = screen.getByRole('checkbox')
    checkbox.focus()
    await userEvent.keyboard(' ')
    expect(spy).toHaveBeenCalledWith('/tasks/44/complete')
  })

  it('shows inline error and retry button when mutation fails (AC4)', async () => {
    const task = makeTask({ id: 45, isCompleted: false })
    vi.spyOn(apiModule.api, 'patch').mockRejectedValueOnce(new Error('Network error'))
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
  })

  it('retry button re-fires the toggle (AC4)', async () => {
    const task = makeTask({ id: 46, isCompleted: false })
    const spy = vi
      .spyOn(apiModule.api, 'patch')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ ...task, isCompleted: true })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => screen.getByRole('button', { name: /retry/i }))
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('dismiss clears the inline error (AC4)', async () => {
    const task = makeTask({ id: 47, isCompleted: false })
    vi.spyOn(apiModule.api, 'patch').mockRejectedValueOnce(new Error('fail'))
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => screen.getByRole('alert'))
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
