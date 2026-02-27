import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import { EmptyState } from '../components/EmptyState'
import { InlineTaskInput } from '../components/InlineTaskInput'
import { TaskRow } from '../components/TaskRow'
import { SkeletonTaskRow } from '../components/SkeletonTaskRow'
import { FilterBar } from '../components/FilterBar'
import type { SortOption } from '../components/SortDropdown'

export default function TaskListPage() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()

  // Filter state — UI-only, session-only, never persisted (AC6 / PRD architecture rule)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'done'>('all')
  const [deadlineFilter, setDeadlineFilter] = useState(false)
  const [labelFilter, setLabelFilter] = useState<string | null>(null)

  // Sort state — UI-only, session-only, never persisted (AC8 / Story 4.2)
  const [sortOption, setSortOption] = useState<SortOption>('none')

  // Task count derived from the FULL (unfiltered) task list — header always reflects total (architecture rule)
  const completedTasks = tasks.filter(t => t.isCompleted).length
  const totalTasks = tasks.length

  // Apply filters client-side on the TanStack Query cache — NO API call (project-context.md rule)
  const filteredTasks = tasks
    .filter(t =>
      statusFilter === 'all'
        ? true
        : statusFilter === 'done'
          ? t.isCompleted
          : !t.isCompleted,
    )
    .filter(t => !deadlineFilter || t.deadline !== null)
    .filter(t => labelFilter === null || t.labels.some(l => l.name === labelFilter))

  // Apply sort AFTER filters — spread to avoid mutating the TanStack Query cache array
  const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
    switch (sortOption) {
      case 'label-asc': {
        // Tasks with no labels sort to the bottom (\uffff is > any printable char)
        const aLabel = a.labels.map(l => l.name).sort()[0] ?? '\uffff'
        const bLabel = b.labels.map(l => l.name).sort()[0] ?? '\uffff'
        return aLabel.localeCompare(bLabel)
      }
      case 'deadline-asc': {
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
      case 'status-incomplete-first':
        // false (0) sorts before true (1) — incomplete tasks appear first
        return Number(a.isCompleted) - Number(b.isCompleted)
      default:
        return 0 // 'none' — preserve server order (created_at DESC)
    }
  })

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <AppHeader
        userEmail={user?.email}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
      />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Inline creation row — always visible at top (AC1 / UX spec) */}
        <InlineTaskInput />

        {/* Filter and sort bar — always visible, zero interaction cost (UX spec / Story 4.1 AC1 + Story 4.2 AC1) */}
        <FilterBar
          tasks={tasks}
          activeStatusFilter={statusFilter}
          activeDeadlineFilter={deadlineFilter}
          activeLabelFilter={labelFilter}
          activeSortOption={sortOption}
          onStatusChange={setStatusFilter}
          onDeadlineChange={setDeadlineFilter}
          onLabelChange={setLabelFilter}
          onSortChange={setSortOption}
        />

        {/* Task list, skeleton loading state, filtered empty state, or no-tasks empty state */}
        {isLoading ? (
          <ul className="mt-4 space-y-1" aria-label="Loading tasks" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTaskRow key={i} />
            ))}
          </ul>
        ) : tasks.length === 0 ? (
          <EmptyState />
        ) : filteredTasks.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-12 text-center"
          >
            <p className="font-pixel text-[8px] text-[#888] leading-loose">
              No tasks match this filter.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-1" aria-label="Task list">
            {sortedFilteredTasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

