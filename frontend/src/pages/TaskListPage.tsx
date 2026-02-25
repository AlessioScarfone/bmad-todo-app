import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import { EmptyState } from '../components/EmptyState'
import { InlineTaskInput } from '../components/InlineTaskInput'
import { TaskRow } from '../components/TaskRow'

export default function TaskListPage() {
  const { user } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()

  // Task count derived client-side — no extra API call (architecture rule)
  const completedTasks = tasks.filter(t => t.isCompleted).length
  const totalTasks = tasks.length

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

        {/* Task list or empty state */}
        {isLoading ? null : tasks.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="mt-4 space-y-1" aria-label="Task list">
            {tasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

