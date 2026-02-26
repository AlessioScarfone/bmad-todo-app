import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SubtaskPanel } from '../../src/components/SubtaskPanel'
import type { Subtask } from '../../src/types/tasks'

// Mock the entire useTasks module — SubtaskPanel depends on these hooks
vi.mock('../../src/hooks/useTasks', () => ({
  useSubtasks: vi.fn(),
  useCreateSubtask: vi.fn(),
  useToggleSubtask: vi.fn(),
  useDeleteSubtask: vi.fn(),
}))

import * as useTasks from '../../src/hooks/useTasks'

function makeSubtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: 1,
    taskId: 10,
    title: 'Test subtask',
    isCompleted: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    isPending: false,
    ...overrides,
  }
}

function setupMocks(subtasks: Subtask[] = [], isLoading = false) {
  vi.mocked(useTasks.useSubtasks).mockReturnValue({
    data: subtasks,
    isLoading,
  } as ReturnType<typeof useTasks.useSubtasks>)
  vi.mocked(useTasks.useCreateSubtask).mockReturnValue(makeMutation() as ReturnType<typeof useTasks.useCreateSubtask>)
  vi.mocked(useTasks.useToggleSubtask).mockReturnValue(makeMutation() as ReturnType<typeof useTasks.useToggleSubtask>)
  vi.mocked(useTasks.useDeleteSubtask).mockReturnValue(makeMutation() as ReturnType<typeof useTasks.useDeleteSubtask>)
}

describe('SubtaskPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders subtask list from useSubtasks', () => {
    const subtasks = [
      makeSubtask({ id: 1, title: 'First subtask' }),
      makeSubtask({ id: 2, title: 'Second subtask' }),
    ]
    setupMocks(subtasks)

    render(<SubtaskPanel taskId={10} />)

    expect(screen.getByText('First subtask')).toBeInTheDocument()
    expect(screen.getByText('Second subtask')).toBeInTheDocument()
  })

  it('renders empty state when no subtasks', () => {
    setupMocks([])

    render(<SubtaskPanel taskId={10} />)

    expect(screen.getByText(/no subtasks yet/i)).toBeInTheDocument()
  })

  it('renders loading state when isLoading is true', () => {
    setupMocks([], true)

    render(<SubtaskPanel taskId={10} />)

    expect(screen.getByText(/loading subtasks/i)).toBeInTheDocument()
  })

  it('calls useCreateSubtask.mutate on Enter key in input', async () => {
    setupMocks([])
    const mutateFn = vi.fn()
    vi.mocked(useTasks.useCreateSubtask).mockReturnValue(makeMutation({ mutate: mutateFn }) as ReturnType<typeof useTasks.useCreateSubtask>)

    render(<SubtaskPanel taskId={10} />)

    const input = screen.getByRole('textbox', { name: /new subtask title/i })
    await userEvent.type(input, 'My new subtask{Enter}')

    expect(mutateFn).toHaveBeenCalledWith(
      { title: 'My new subtask' },
      expect.any(Object),
    )
  })

  it('calls useCreateSubtask.mutate on Add button click', async () => {
    setupMocks([])
    const mutateFn = vi.fn()
    vi.mocked(useTasks.useCreateSubtask).mockReturnValue(makeMutation({ mutate: mutateFn }) as ReturnType<typeof useTasks.useCreateSubtask>)

    render(<SubtaskPanel taskId={10} />)

    const input = screen.getByRole('textbox', { name: /new subtask title/i })
    await userEvent.type(input, 'Click add subtask')
    fireEvent.click(screen.getByRole('button', { name: /add subtask/i }))

    expect(mutateFn).toHaveBeenCalledWith(
      { title: 'Click add subtask' },
      expect.any(Object),
    )
  })

  it('calls useToggleSubtask.mutate on checkbox click', async () => {
    const subtask = makeSubtask({ id: 5, title: 'Toggle me', isCompleted: false })
    setupMocks([subtask])
    const mutateFn = vi.fn()
    vi.mocked(useTasks.useToggleSubtask).mockReturnValue(makeMutation({ mutate: mutateFn }) as ReturnType<typeof useTasks.useToggleSubtask>)

    render(<SubtaskPanel taskId={10} />)

    const checkbox = screen.getByRole('checkbox', { name: /mark subtask "toggle me" as complete/i })
    fireEvent.click(checkbox)

    expect(mutateFn).toHaveBeenCalledWith({ subId: 5, isCompleted: true }, expect.any(Object))
  })

  it('calls useDeleteSubtask.mutate on delete button click', async () => {
    const subtask = makeSubtask({ id: 7, title: 'Delete me' })
    setupMocks([subtask])
    const mutateFn = vi.fn()
    vi.mocked(useTasks.useDeleteSubtask).mockReturnValue(makeMutation({ mutate: mutateFn }) as ReturnType<typeof useTasks.useDeleteSubtask>)

    render(<SubtaskPanel taskId={10} />)

    const deleteBtn = screen.getByRole('button', { name: /delete subtask "delete me"/i })
    fireEvent.click(deleteBtn)

    expect(mutateFn).toHaveBeenCalledWith({ subId: 7 }, expect.any(Object))
  })

  it('shows role="alert" error on create failure', async () => {
    setupMocks([])
    const mutateFn = vi.fn((_vars, callbacks: { onError?: (err: Error) => void }) => {
      callbacks.onError?.(new Error('Server error'))
    })
    vi.mocked(useTasks.useCreateSubtask).mockReturnValue(makeMutation({ mutate: mutateFn }) as ReturnType<typeof useTasks.useCreateSubtask>)

    render(<SubtaskPanel taskId={10} />)

    const input = screen.getByRole('textbox', { name: /new subtask title/i })
    await userEvent.type(input, 'Failing subtask{Enter}')

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toMatch(/server error/i)
  })

  it('renders completed subtask with line-through style', () => {
    const subtask = makeSubtask({ id: 1, title: 'Done subtask', isCompleted: true })
    setupMocks([subtask])

    render(<SubtaskPanel taskId={10} />)

    const title = screen.getByText('Done subtask')
    expect(title.className).toMatch(/line-through/)
  })

  it('shows role="alert" error on toggle failure', async () => {
    const subtask = makeSubtask({ id: 9, title: 'Toggle fail subtask', isCompleted: false })
    setupMocks([subtask])
    const mutateFn = vi.fn((_vars: unknown, callbacks: { onError?: (err: Error) => void }) => {
      callbacks.onError?.(new Error('Toggle failed'))
    })
    vi.mocked(useTasks.useToggleSubtask).mockReturnValue(makeMutation({ mutate: mutateFn }) as ReturnType<typeof useTasks.useToggleSubtask>)

    render(<SubtaskPanel taskId={10} />)

    const checkbox = screen.getByRole('checkbox', { name: /mark subtask "toggle fail subtask" as complete/i })
    fireEvent.click(checkbox)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toMatch(/toggle failed/i)
    expect(screen.getByRole('button', { name: /retry toggling subtask/i })).toBeInTheDocument()
  })

  it('does not render any subtask expand controls (no nesting — FR19)', () => {
    const subtask = makeSubtask({ id: 1, title: 'Flat subtask' })
    setupMocks([subtask])

    render(<SubtaskPanel taskId={10} />)

    // Only one textbox should exist (the "add new subtask" input — no subtask-level expand)
    const inputs = screen.getAllByRole('textbox')
    expect(inputs).toHaveLength(1)
  })

  it('shows role="alert" error on delete failure', async () => {
    const subtask = makeSubtask({ id: 11, title: 'Delete fail subtask' })
    setupMocks([subtask])
    const mutateFn = vi.fn((_vars: unknown, callbacks: { onError?: (err: Error) => void }) => {
      callbacks.onError?.(new Error('Delete failed'))
    })
    vi.mocked(useTasks.useDeleteSubtask).mockReturnValue(makeMutation({ mutate: mutateFn }) as ReturnType<typeof useTasks.useDeleteSubtask>)

    render(<SubtaskPanel taskId={10} />)

    const deleteBtn = screen.getByRole('button', { name: /delete subtask "delete fail subtask"/i })
    fireEvent.click(deleteBtn)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toMatch(/delete failed/i)
    expect(screen.getByRole('button', { name: /retry deleting subtask/i })).toBeInTheDocument()
  })
})
