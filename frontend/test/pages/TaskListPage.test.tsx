import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TaskListPage from '../../src/pages/TaskListPage'
import * as useTasksModule from '../../src/hooks/useTasks'
import * as useAuthModule from '../../src/hooks/useAuth'
import type { Task } from '../../src/types/tasks'

// Minimal mock for useAuth — TaskListPage only uses user.email
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

// Mock useTasks — we'll override per test
vi.mock('../../src/hooks/useTasks', () => ({
  useTasks: vi.fn(),
  useCreateTask: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useToggleTask: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateTask: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteTask: vi.fn(() => ({ mutate: vi.fn() })),
  useAttachLabel: vi.fn(() => ({ mutate: vi.fn() })),
  useRemoveLabel: vi.fn(() => ({ mutate: vi.fn() })),
  useSetDeadline: vi.fn(() => ({ mutate: vi.fn() })),
  useLabels: vi.fn(() => ({ data: [] })),
}))

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

function renderTaskListPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    queryClient,
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <TaskListPage />
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  }
}

describe('TaskListPage — loading and display states', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Default: authenticated user
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: 1, email: 'user@test.com' },
      isLoading: false,
      isAuthenticated: true,
      error: null,
    })
  })

  it('shows 4 skeleton rows when isLoading is true (AC4)', () => {
    vi.spyOn(useTasksModule, 'useTasks').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useTasksModule.useTasks>)

    renderTaskListPage()

    // The loading list should be present with aria-busy
    const loadingList = screen.getByRole('list', { name: /loading tasks/i })
    expect(loadingList).toBeInTheDocument()
    expect(loadingList).toHaveAttribute('aria-busy', 'true')

    // Exactly 4 list items (skeleton rows)
    const items = loadingList.querySelectorAll('li')
    expect(items).toHaveLength(4)
  })

  it('shows the EmptyState when tasks array is empty and not loading (AC4)', () => {
    vi.spyOn(useTasksModule, 'useTasks').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTasksModule.useTasks>)

    renderTaskListPage()

    // EmptyState text (from EmptyState component)
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('shows task list when data is loaded (AC4)', () => {
    const task = makeTask({ title: 'My important task' })
    vi.spyOn(useTasksModule, 'useTasks').mockReturnValue({
      data: [task],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTasksModule.useTasks>)

    renderTaskListPage()

    expect(screen.getByText('My important task')).toBeInTheDocument()
  })

  it('does not show skeleton rows when data is loaded', () => {
    const task = makeTask({ title: 'Loaded task' })
    vi.spyOn(useTasksModule, 'useTasks').mockReturnValue({
      data: [task],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTasksModule.useTasks>)

    renderTaskListPage()

    // No "Loading tasks" list should be present
    expect(screen.queryByRole('list', { name: /loading tasks/i })).not.toBeInTheDocument()
  })

  it('task count is derived from cache — no extra API call (AC2)', () => {
    // Task count display (N/M) is rendered in AppHeader via completedTasks/totalTasks
    // which are derived from the tasks array in TaskListPage — not from a separate API call.
    // This test verifies the count display reflects the data from useTasks directly.
    const tasks = [
      makeTask({ id: 1, title: 'Task 1', isCompleted: true }),
      makeTask({ id: 2, title: 'Task 2', isCompleted: false }),
      makeTask({ id: 3, title: 'Task 3', isCompleted: true }),
    ]
    vi.spyOn(useTasksModule, 'useTasks').mockReturnValue({
      data: tasks,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useTasksModule.useTasks>)

    renderTaskListPage()

    // TaskCountDisplay renders "completed/total" — should be "2/3"
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })
})
