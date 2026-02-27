import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FilterBar } from '../../src/components/FilterBar'
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

const defaultProps = {
  tasks: [],
  activeStatusFilter: 'all' as const,
  activeDeadlineFilter: false,
  activeLabelFilter: null,
  activeSortOption: 'none' as const,
  onStatusChange: vi.fn(),
  onDeadlineChange: vi.fn(),
  onLabelChange: vi.fn(),
  onSortChange: vi.fn(),
}

describe('FilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders status filter buttons — All, Active, Done', () => {
    render(<FilterBar {...defaultProps} />)

    expect(screen.getByRole('button', { name: /filter by status: all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter by status: active/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter by status: done/i })).toBeInTheDocument()
  })

  it('renders "Has deadline" filter button', () => {
    render(<FilterBar {...defaultProps} />)

    expect(screen.getByRole('button', { name: /filter: has deadline/i })).toBeInTheDocument()
  })

  it('renders label buttons for unique labels derived from tasks', () => {
    const tasks = [
      makeTask({ id: 1, labels: [{ id: 1, name: 'Backend' }, { id: 2, name: 'Frontend' }] }),
      makeTask({ id: 2, labels: [{ id: 1, name: 'Backend' }] }), // duplicate — should appear once
    ]

    render(<FilterBar {...defaultProps} tasks={tasks} />)

    expect(screen.getByRole('button', { name: /filter by label: backend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /filter by label: frontend/i })).toBeInTheDocument()
    // Only one "Backend" button despite two tasks having the label
    expect(screen.getAllByRole('button', { name: /filter by label: backend/i })).toHaveLength(1)
  })

  it('does not render label group when no tasks have labels', () => {
    const tasks = [makeTask({ labels: [] }), makeTask({ labels: [] })]

    render(<FilterBar {...defaultProps} tasks={tasks} />)

    // No label filter buttons should exist
    expect(screen.queryByRole('button', { name: /filter by label:/i })).not.toBeInTheDocument()
  })

  it('calls onStatusChange with "active" when Active button is clicked', async () => {
    const onStatusChange = vi.fn()
    render(<FilterBar {...defaultProps} onStatusChange={onStatusChange} />)

    await userEvent.click(screen.getByRole('button', { name: /filter by status: active/i }))

    expect(onStatusChange).toHaveBeenCalledWith('active')
  })

  it('calls onStatusChange with "done" when Done button is clicked', async () => {
    const onStatusChange = vi.fn()
    render(<FilterBar {...defaultProps} onStatusChange={onStatusChange} />)

    await userEvent.click(screen.getByRole('button', { name: /filter by status: done/i }))

    expect(onStatusChange).toHaveBeenCalledWith('done')
  })

  it('calls onStatusChange with "all" when clicking active Done filter (deselect)', async () => {
    const onStatusChange = vi.fn()
    render(<FilterBar {...defaultProps} activeStatusFilter="done" onStatusChange={onStatusChange} />)

    // Clicking the already-active "Done" button should reset to "all"
    await userEvent.click(screen.getByRole('button', { name: /filter by status: done/i }))

    expect(onStatusChange).toHaveBeenCalledWith('all')
  })

  it('calls onDeadlineChange(true) when "Has deadline" button is clicked (inactive)', async () => {
    const onDeadlineChange = vi.fn()
    render(<FilterBar {...defaultProps} activeDeadlineFilter={false} onDeadlineChange={onDeadlineChange} />)

    await userEvent.click(screen.getByRole('button', { name: /filter: has deadline/i }))

    expect(onDeadlineChange).toHaveBeenCalledWith(true)
  })

  it('calls onDeadlineChange(false) when "Has deadline" button is clicked (active — deselect)', async () => {
    const onDeadlineChange = vi.fn()
    render(<FilterBar {...defaultProps} activeDeadlineFilter={true} onDeadlineChange={onDeadlineChange} />)

    await userEvent.click(screen.getByRole('button', { name: /filter: has deadline/i }))

    expect(onDeadlineChange).toHaveBeenCalledWith(false)
  })

  it('calls onLabelChange with label name when a label button is clicked', async () => {
    const onLabelChange = vi.fn()
    const tasks = [makeTask({ labels: [{ id: 1, name: 'Bug' }] })]

    render(<FilterBar {...defaultProps} tasks={tasks} activeLabelFilter={null} onLabelChange={onLabelChange} />)

    await userEvent.click(screen.getByRole('button', { name: /filter by label: bug/i }))

    expect(onLabelChange).toHaveBeenCalledWith('Bug')
  })

  it('calls onLabelChange(null) when active label button is clicked (deselect)', async () => {
    const onLabelChange = vi.fn()
    const tasks = [makeTask({ labels: [{ id: 1, name: 'Bug' }] })]

    render(<FilterBar {...defaultProps} tasks={tasks} activeLabelFilter="Bug" onLabelChange={onLabelChange} />)

    await userEvent.click(screen.getByRole('button', { name: /filter by label: bug/i }))

    expect(onLabelChange).toHaveBeenCalledWith(null)
  })

  it('active status button has aria-pressed="true"; inactive buttons have aria-pressed="false"', () => {
    render(<FilterBar {...defaultProps} activeStatusFilter="done" />)

    const doneBtn = screen.getByRole('button', { name: /filter by status: done/i })
    const allBtn = screen.getByRole('button', { name: /filter by status: all/i })
    const activeBtn = screen.getByRole('button', { name: /filter by status: active/i })

    expect(doneBtn).toHaveAttribute('aria-pressed', 'true')
    expect(allBtn).toHaveAttribute('aria-pressed', 'false')
    expect(activeBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('active label button has aria-pressed="true"', () => {
    const tasks = [makeTask({ labels: [{ id: 1, name: 'Feature' }] })]
    render(<FilterBar {...defaultProps} tasks={tasks} activeLabelFilter="Feature" />)

    const labelBtn = screen.getByRole('button', { name: /filter by label: feature/i })
    expect(labelBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('active deadline button has aria-pressed="true"', () => {
    render(<FilterBar {...defaultProps} activeDeadlineFilter={true} />)

    const deadlineBtn = screen.getByRole('button', { name: /filter: has deadline/i })
    expect(deadlineBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('label buttons are sorted alphabetically', () => {
    const tasks = [
      makeTask({ labels: [{ id: 1, name: 'Zebra' }, { id: 2, name: 'Alpha' }] }),
    ]

    render(<FilterBar {...defaultProps} tasks={tasks} />)

    const labelButtons = screen.getAllByRole('button', { name: /filter by label:/i })
    expect(labelButtons[0]).toHaveAttribute('aria-label', 'Filter by label: Alpha')
    expect(labelButtons[1]).toHaveAttribute('aria-label', 'Filter by label: Zebra')
  })
})
