import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import { EmptyState } from '../components/EmptyState'
import { InlineTaskInput } from '../components/InlineTaskInput'
import { TaskRow } from '../components/TaskRow'
import { FilterBar } from '../components/FilterBar'

export default function TaskListPage() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()

  // Filter state — UI-only, session-only, never persisted (AC6 / PRD architecture rule)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'done'>('all')
  const [deadlineFilter, setDeadlineFilter] = useState(false)
  const [labelFilter, setLabelFilter] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <AppHeader
        userEmail={user?.email}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
      />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Inline creation row — always visible at top (AC1 / UX spec) */}
        <InlineTaskInput />

        {/* Filter bar — always visible, zero interaction cost (UX spec / Story 4.1 AC1) */}
        <FilterBar
          tasks={tasks}
          activeStatusFilter={statusFilter}
          activeDeadlineFilter={deadlineFilter}
          activeLabelFilter={labelFilter}
          onStatusChange={setStatusFilter}
          onDeadlineChange={setDeadlineFilter}
          onLabelChange={setLabelFilter}
        />

        {/* Task list, filtered empty state, or no-tasks empty state */}
        {isLoading ? null : tasks.length === 0 ? (
          <EmptyState />
        ) : filteredTasks.length === 0 ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-12 text-center"
          >
            <p className="font-pixel text-[8px] text-[#555] leading-loose">
              No tasks match this filter.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-1" aria-label="Task list">
            {filteredTasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

