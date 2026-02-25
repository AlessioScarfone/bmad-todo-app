import { useState } from 'react'
import { useToggleTask } from '../hooks/useTasks'
import type { Task } from '../types/tasks'

interface TaskRowProps {
  task: Task
}

export function TaskRow({ task }: TaskRowProps) {
  const toggleTask = useToggleTask()
  const [error, setError] = useState<string | null>(null)
  const [lastTask, setLastTask] = useState<Task>(task)

  const handleToggle = () => {
    setLastTask(task)
    setError(null)
    toggleTask.mutate(task, {
      onError: () => {
        setError('Failed to update task. Please try again.')
      },
    })
  }

  const handleRetry = () => {
    setError(null)
    toggleTask.mutate(lastTask, {
      onError: () => {
        setError('Failed to update task. Please try again.')
      },
    })
  }

  const handleDismiss = () => {
    setError(null)
  }

  const ariaLabel = task.isCompleted
    ? `Mark ${task.title} as not done`
    : `Mark ${task.title} as done`

  return (
    <li className="px-3 py-2 border-l-2 border-[#2a2a2a] bg-[#1c1c1c] hover:border-l-[#00ff88] font-mono text-[13px] text-[#f0f0f0] motion-safe:transition-colors">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={handleToggle}
          disabled={toggleTask.isPending}
          aria-label={ariaLabel}
          className="accent-[#00ff88] motion-safe:transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span
          className={
            task.isCompleted
              ? 'line-through text-gray-400'
              : ''
          }
        >
          {task.title}
        </span>
      </div>
      {error && (
        <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400 flex items-center gap-2">
          <span>{error}</span>
          <button
            onClick={handleRetry}
            className="underline hover:text-red-300"
            aria-label="Retry"
          >
            Retry
          </button>
          <button
            onClick={handleDismiss}
            className="underline hover:text-red-300"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
    </li>
  )
}
