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
    labels: [],
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

describe('TaskRow — inline edit mode (Story 2.4)', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('edit icon button is present in the DOM (AC1)', () => {
    const task = makeTask({ title: 'My task' })
    renderWithQuery(<TaskRow task={task} />, [task])
    expect(screen.getByRole('button', { name: /edit task title/i })).toBeInTheDocument()
  })

  it('pressing Enter on the focused task row enters edit mode (AC1 keyboard-native path)', async () => {
    const task = makeTask({ title: 'Row task' })
    renderWithQuery(<TaskRow task={task} />, [task])
    const row = screen.getByRole('listitem')
    row.focus()
    await userEvent.keyboard('{Enter}')
    const input = screen.getByRole('textbox', { name: /edit task title: row task/i })
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).value).toBe('Row task')
  })

  it('clicking edit icon enters edit mode — input appears with current title (AC1)', async () => {
    const task = makeTask({ title: 'My task' })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /edit task title/i }))
    const input = screen.getByRole('textbox', { name: /edit task title: my task/i })
    expect(input).toBeInTheDocument()
    expect((input as HTMLInputElement).value).toBe('My task')
  })

  it('pressing Enter in input fires useUpdateTask mutation with new title (AC2)', async () => {
    const task = makeTask({ id: 50, title: 'Old title' })
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValueOnce({ ...task, title: 'New title' })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /edit task title/i }))
    const input = screen.getByRole('textbox', { name: /edit task title: old title/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'New title')
    await userEvent.keyboard('{Enter}')
    expect(spy).toHaveBeenCalledWith('/tasks/50', { title: 'New title' })
  })

  it('pressing Escape exits edit mode without firing mutation (AC3)', async () => {
    const task = makeTask({ id: 51, title: 'Original' })
    const spy = vi.spyOn(apiModule.api, 'patch')
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /edit task title/i }))
    const input = screen.getByRole('textbox', { name: /edit task title: original/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'Cancelled change')
    await userEvent.keyboard('{Escape}')
    expect(spy).not.toHaveBeenCalled()
    // Input gone, original title shown
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.getByText('Original')).toBeInTheDocument()
  })

  it('empty title shows validation hint, does not fire mutation (AC5)', async () => {
    const task = makeTask({ id: 52, title: 'Some task' })
    const spy = vi.spyOn(apiModule.api, 'patch')
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /edit task title/i }))
    const input = screen.getByRole('textbox', { name: /edit task title: some task/i })
    await userEvent.clear(input)
    await userEvent.keyboard('{Enter}')
    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/title must not be empty/i)
  })

  it('mutation failure shows inline error and Retry button (AC4)', async () => {
    const task = makeTask({ id: 53, title: 'Task to edit' })
    vi.spyOn(apiModule.api, 'patch').mockRejectedValueOnce(new Error('Server error'))
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([task])
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /edit task title/i }))
    const input = screen.getByRole('textbox', { name: /edit task title: task to edit/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'Failed attempt')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry edit/i })).toBeInTheDocument()
  })

  it('Retry re-opens edit mode with the failed title pre-populated (AC4)', async () => {
    const task = makeTask({ id: 54, title: 'Task' })
    vi.spyOn(apiModule.api, 'patch').mockRejectedValueOnce(new Error('fail'))
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([task])
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /edit task title/i }))
    const input = screen.getByRole('textbox', { name: /edit task title: task/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'Attempted title')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => screen.getByRole('button', { name: /retry edit/i }))
    await userEvent.click(screen.getByRole('button', { name: /retry edit/i }))
    // Edit mode re-opened with failed title
    const retryInput = screen.getByRole('textbox')
    expect((retryInput as HTMLInputElement).value).toBe('Attempted title')
  })

  it('Story 2.3 checkbox still works after adding edit mode (AC1 regression)', async () => {
    const task = makeTask({ id: 55, isCompleted: false })
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValueOnce({ ...task, isCompleted: true })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('checkbox'))
    expect(spy).toHaveBeenCalledWith('/tasks/55/complete')
  })

  it('Story 2.3 dismiss still works (regression)', async () => {
    const task = makeTask({ id: 56, isCompleted: false })
    vi.spyOn(apiModule.api, 'patch').mockRejectedValueOnce(new Error('fail'))
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => screen.getByRole('alert'))
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('TaskRow — delete with confirmation (Story 2.5)', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('delete icon is present in the DOM with correct aria-label (AC1)', () => {
    const task = makeTask({ title: 'My task' })
    renderWithQuery(<TaskRow task={task} />, [task])
    expect(screen.getByRole('button', { name: /delete task/i })).toBeInTheDocument()
  })

  it('clicking delete icon enters confirm state — Cancel button appears (AC1, AC3)', async () => {
    const task = makeTask({ id: 60 })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /delete task/i }))
    expect(screen.getByRole('button', { name: /cancel delete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
  })

  it('clicking Cancel exits confirm state without firing delete mutation (AC3)', async () => {
    const task = makeTask({ id: 61 })
    const spy = vi.spyOn(apiModule.api, 'delete')
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /delete task/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel delete/i }))
    expect(spy).not.toHaveBeenCalled()
    // Confirm strip gone, delete icon visible again
    expect(screen.queryByRole('button', { name: /cancel delete/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete task/i })).toBeInTheDocument()
  })

  it('clicking Confirm fires delete mutation with the task ID (AC2)', async () => {
    const task = makeTask({ id: 62 })
    const spy = vi.spyOn(apiModule.api, 'delete').mockResolvedValue(undefined)
    const { queryClient } = renderWithQuery(<TaskRow task={task} />, [task])
    // Remove task from cache so the component unmounts cleanly after delete
    queryClient.setQueryData(['tasks'], [task])
    await userEvent.click(screen.getByRole('button', { name: /delete task/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    expect(spy).toHaveBeenCalledWith('/tasks/62')
  })

  it('mutation failure shows inline delete error with Retry button (AC4)', async () => {
    const task = makeTask({ id: 63 })
    vi.spyOn(apiModule.api, 'delete').mockRejectedValue(new Error('server error'))
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([task])
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /delete task/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /retry delete/i })).toBeInTheDocument()
  })

  it('Retry button re-enters confirm state (AC4)', async () => {
    const task = makeTask({ id: 64 })
    vi.spyOn(apiModule.api, 'delete').mockRejectedValue(new Error('fail'))
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([task])
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /delete task/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => screen.getByRole('button', { name: /retry delete/i }))
    await userEvent.click(screen.getByRole('button', { name: /retry delete/i }))
    // Confirm state re-entered
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel delete/i })).toBeInTheDocument()
  })

  it('existing Story 2.3 checkbox toggle still works (regression)', async () => {
    const task = makeTask({ id: 65, isCompleted: false })
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValueOnce({ ...task, isCompleted: true })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('checkbox'))
    expect(spy).toHaveBeenCalledWith('/tasks/65/complete')
  })

  it('existing Story 2.4 edit icon still works (regression)', async () => {
    const task = makeTask({ id: 66, title: 'Edit me' })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /edit task title/i }))
    const input = screen.getByRole('textbox', { name: /edit task title: edit me/i })
    expect(input).toBeInTheDocument()
  })

  it('Cancel clears deleteError so error does not persist after cancel (AC3 regression)', async () => {
    const task = makeTask({ id: 67 })
    vi.spyOn(apiModule.api, 'delete').mockRejectedValue(new Error('fail'))
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([task])
    renderWithQuery(<TaskRow task={task} />, [task])

    // Step 1: trigger error
    await userEvent.click(screen.getByRole('button', { name: /delete task/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => screen.getByRole('button', { name: /retry delete/i }))

    // Step 2: click Retry → re-enters confirm state
    await userEvent.click(screen.getByRole('button', { name: /retry delete/i }))
    expect(screen.getByRole('button', { name: /cancel delete/i })).toBeInTheDocument()

    // Step 3: click Cancel → confirm strip gone AND error cleared
    await userEvent.click(screen.getByRole('button', { name: /cancel delete/i }))
    expect(screen.queryByRole('button', { name: /cancel delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // Delete icon is back
    expect(screen.getByRole('button', { name: /delete task/i })).toBeInTheDocument()
  })

  it('Enter on focused row does NOT enter edit mode when in confirm-delete state (H1 regression)', async () => {
    const task = makeTask({ id: 68, title: 'Keyboard test' })
    const spy = vi.spyOn(apiModule.api, 'patch')
    renderWithQuery(<TaskRow task={task} />, [task])

    // Enter confirm-delete state
    await userEvent.click(screen.getByRole('button', { name: /delete task/i }))
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()

    // Press Enter on the row — should NOT open edit mode
    const row = screen.getByRole('listitem')
    row.focus()
    await userEvent.keyboard('{Enter}')

    // No textbox (edit mode) should appear
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    // Confirm strip still showing
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    // No patch call (not in edit mode)
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('Story 3.1 — label management', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders label pills for tasks with labels', () => {
    const task = makeTask({
      id: 80,
      labels: [
        { id: 1, name: 'Backend' },
        { id: 2, name: 'Admin' },
      ],
    })
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])

    renderWithQuery(<TaskRow task={task} />, [task])

    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByLabelText('Label: Backend')).toBeInTheDocument()
  })

  it('clicking a label remove button calls remove label endpoint with taskId and labelId', async () => {
    const task = makeTask({
      id: 81,
      labels: [{ id: 10, name: 'Client' }],
    })
    const delSpy = vi.spyOn(apiModule.api, 'delete').mockResolvedValue(undefined)
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])

    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /remove label client/i }))

    expect(delSpy).toHaveBeenCalledWith('/tasks/81/labels/10')
  })

  it('shows add label affordance and opens input when clicked', async () => {
    const task = makeTask({ id: 82 })
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])

    renderWithQuery(<TaskRow task={task} />, [task])

    const addButton = screen.getByRole('button', { name: 'Add label' })
    expect(addButton).toBeInTheDocument()

    await userEvent.click(addButton)

    const input = screen.getByRole('combobox', { name: 'Add label' })
    expect(input).toBeInTheDocument()
  })

  it('typing label and pressing Enter calls attach label endpoint with taskId and name', async () => {
    const task = makeTask({ id: 83 })
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])
    const postSpy = vi.spyOn(apiModule.api, 'post').mockResolvedValue({ id: 50, name: 'Ops' })

    renderWithQuery(<TaskRow task={task} />, [task])

    await userEvent.click(screen.getByRole('button', { name: 'Add label' }))
    const input = screen.getByRole('combobox', { name: 'Add label' })
    await userEvent.type(input, 'Ops')
    await userEvent.keyboard('{Enter}')

    expect(postSpy).toHaveBeenCalledWith('/tasks/83/labels', { name: 'Ops' })
  })

  it('pressing Escape closes label input without mutation', async () => {
    const task = makeTask({ id: 84 })
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])
    const postSpy = vi.spyOn(apiModule.api, 'post')

    renderWithQuery(<TaskRow task={task} />, [task])

    await userEvent.click(screen.getByRole('button', { name: 'Add label' }))
    const input = screen.getByRole('combobox', { name: 'Add label' })
    await userEvent.type(input, 'Will cancel')
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('combobox', { name: 'Add label' })).not.toBeInTheDocument()
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('shows inline label error with retry affordance when attach fails', async () => {
    const task = makeTask({ id: 85 })
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])
    vi.spyOn(apiModule.api, 'post').mockRejectedValueOnce(new Error('fail'))

    renderWithQuery(<TaskRow task={task} />, [task])

    await userEvent.click(screen.getByRole('button', { name: 'Add label' }))
    const input = screen.getByRole('combobox', { name: 'Add label' })
    await userEvent.type(input, 'Urgent')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry label action' })).toBeInTheDocument()
  })

  it('retry on failed attach attempts the same attach again', async () => {
    const task = makeTask({ id: 86 })
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])
    const postSpy = vi
      .spyOn(apiModule.api, 'post')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ id: 77, name: 'Urgent' })

    renderWithQuery(<TaskRow task={task} />, [task])

    await userEvent.click(screen.getByRole('button', { name: 'Add label' }))
    const input = screen.getByRole('combobox', { name: 'Add label' })
    await userEvent.type(input, 'Urgent')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry label action' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Retry label action' }))

    expect(postSpy).toHaveBeenCalledTimes(2)
    expect(postSpy).toHaveBeenNthCalledWith(1, '/tasks/86/labels', { name: 'Urgent' })
    expect(postSpy).toHaveBeenNthCalledWith(2, '/tasks/86/labels', { name: 'Urgent' })
  })

  it('retry on failed remove attempts the same remove again', async () => {
    const task = makeTask({
      id: 87,
      labels: [{ id: 12, name: 'Client' }],
    })
    vi.spyOn(apiModule.api, 'get').mockResolvedValue([])
    const delSpy = vi
      .spyOn(apiModule.api, 'delete')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined)

    renderWithQuery(<TaskRow task={task} />, [task])

    await userEvent.click(screen.getByRole('button', { name: /remove label client/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry label action' })).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Retry label action' }))

    expect(delSpy).toHaveBeenCalledTimes(2)
    expect(delSpy).toHaveBeenNthCalledWith(1, '/tasks/87/labels/12')
    expect(delSpy).toHaveBeenNthCalledWith(2, '/tasks/87/labels/12')
  })
})

// ---------------------------------------------------------------------------
// Story 3.2 — deadline management
// ---------------------------------------------------------------------------

describe('Story 3.2 — deadline management', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('displays a formatted deadline when task.deadline is set (AC3)', () => {
    const task = makeTask({ id: 90, deadline: '2026-03-15' })
    renderWithQuery(<TaskRow task={task} />, [task])
    // '15 Mar 2026' format (en-GB)
    expect(screen.getByText(/15 Mar 2026/i)).toBeInTheDocument()
  })

  it('clicking the × button calls useSetDeadline with { id, deadline: null } (AC2)', async () => {
    const task = makeTask({ id: 91, deadline: '2026-03-15' })
    const spy = vi.spyOn(apiModule.api, 'patch').mockResolvedValue({ ...task, deadline: null, labels: [] })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: 'Remove deadline' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith('/tasks/91', { deadline: null }))
  })

  it('renders the 📅 trigger button when task has no deadline (AC1)', () => {
    const task = makeTask({ id: 92, deadline: null })
    renderWithQuery(<TaskRow task={task} />, [task])
    expect(screen.getByRole('button', { name: /set deadline for/i })).toBeInTheDocument()
  })

  it('clicking 📅 trigger shows a date input (AC1)', async () => {
    const task = makeTask({ id: 93, deadline: null })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /set deadline for/i }))
    // In jsdom, input[type="date"] does not get role "textbox" — query directly
    expect(document.querySelector('input[type="date"]')).toBeInTheDocument()
  })

  it('pressing Escape on date input closes picker without mutation (AC1)', async () => {
    const task = makeTask({ id: 94, deadline: null })
    const spy = vi.spyOn(apiModule.api, 'patch')
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: /set deadline for/i }))
    const dateInput = document.querySelector('input[type="date"]') as HTMLElement
    expect(dateInput).toBeInTheDocument()
    await userEvent.type(dateInput, '{Escape}')
    expect(spy).not.toHaveBeenCalled()
    // Date input should be gone after Escape
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument()
  })

  it('retry affordance renders when deadline mutation fails; clicking retry re-calls mutation (AC4)', async () => {
    const task = makeTask({ id: 95, deadline: '2026-04-01' })
    const spy = vi.spyOn(apiModule.api, 'patch')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ ...task, deadline: null, labels: [] })
    renderWithQuery(<TaskRow task={task} />, [task])
    await userEvent.click(screen.getByRole('button', { name: 'Remove deadline' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry deadline action' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Retry deadline action' }))
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
