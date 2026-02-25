import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../hooks/useAuth'
import { useTasks } from '../hooks/useTasks'
import { EmptyState } from '../components/EmptyState'
import { InlineTaskInput } from '../components/InlineTaskInput'

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
              <li
                key={task.id}
                className="px-3 py-2 border-l-2 border-[#2a2a2a] bg-[#1c1c1c] hover:border-l-[#00ff88] font-mono text-[13px] text-[#f0f0f0] motion-safe:transition-colors"
              >
                {task.title}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

