import { useState, useRef, useEffect } from 'react'
import { useToggleTask, useUpdateTask } from '../hooks/useTasks'
import type { Task } from '../types/tasks'

interface TaskRowProps {
  task: Task
}

export function TaskRow({ task }: TaskRowProps) {
  const toggleTask = useToggleTask()
  const updateTask = useUpdateTask()

  // Toggle error state
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [lastTask, setLastTask] = useState<Task>(task)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const [editError, setEditError] = useState<string | null>(null)
  const [failedTitle, setFailedTitle] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  // Keep editValue in sync if task.title changes externally (e.g. server reconciliation)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(task.title)
    }
  }, [task.title, isEditing])

  // ---------- toggle handlers ----------
  const handleToggle = () => {
    setLastTask(task)
    setToggleError(null)
    toggleTask.mutate(task, {
      onError: () => {
        setToggleError('Failed to update task. Please try again.')
      },
    })
  }

  const handleToggleRetry = () => {
    setToggleError(null)
    toggleTask.mutate(lastTask, {
      onError: () => {
        setToggleError('Failed to update task. Please try again.')
      },
    })
  }

  const handleToggleDismiss = () => {
    setToggleError(null)
  }

  // ---------- edit handlers ----------
  const enterEditMode = () => {
    setEditValue(task.title)
    setEditError(null)
    setFailedTitle(null)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setEditValue(task.title)
    setEditError(null)
    setIsEditing(false)
  }

  const submitEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed.length === 0) {
      setEditError('Title must not be empty')
      return
    }
    setEditError(null)
    setIsEditing(false)
    updateTask.mutate(
      { id: task.id, title: trimmed },
      {
        onError: () => {
          setFailedTitle(trimmed)
          setEditError('Failed to update title.')
        },
      },
    )
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    // Enter on the row (not in edit mode) enters edit mode
    if (e.key === 'Enter' && !isEditing && e.target === e.currentTarget) {
      e.preventDefault()
      enterEditMode()
    }
  }

  const handleRetryEdit = () => {
    setEditError(null)
    setEditValue(failedTitle ?? task.title)
    setFailedTitle(null)
    setIsEditing(true)
  }

  const ariaLabel = task.isCompleted
    ? `Mark ${task.title} as not done`
    : `Mark ${task.title} as done`

  return (
    <li
      // tabIndex={0} makes the row focusable so Enter-on-row (AC1) is reachable via keyboard
      tabIndex={0}
      className="group px-3 py-2 border-l-2 border-[#2a2a2a] bg-[#1c1c1c] hover:border-l-[#00ff88] font-mono text-[13px] text-[#f0f0f0] motion-safe:transition-colors focus:outline-none focus:border-l-[#00ff88]"
      onKeyDown={handleRowKeyDown}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={handleToggle}
          disabled={toggleTask.isPending}
          aria-label={ariaLabel}
          className="accent-[#00ff88] motion-safe:transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-label={`Edit task title: ${task.title}`}
            className="flex-1 border-2 border-black bg-[#1c1c1c] font-mono text-[13px] text-[#f0f0f0] px-1 outline-none focus:border-[#00ff88]"
          />
        ) : (
          <span
            className={`flex-1 ${task.isCompleted ? 'line-through text-gray-400' : ''}`}
          >
            {task.title}
          </span>
        )}

        {!isEditing && (
          <button
            onClick={enterEditMode}
            aria-label="Edit task title"
            className="opacity-0 group-hover:opacity-100 text-[#888] hover:text-[#f0f0f0] motion-safe:transition-opacity px-1"
          >
            ✎
          </button>
        )}
      </div>

      {/* Edit validation / error */}
      {editError && (
        <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400 flex items-center gap-2">
          <span>{editError}</span>
          {failedTitle !== null && (
            <button
              onClick={handleRetryEdit}
              className="underline hover:text-red-300"
              aria-label="Retry edit"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Toggle error */}
      {toggleError && (
        <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400 flex items-center gap-2">
          <span>{toggleError}</span>
          <button
            onClick={handleToggleRetry}
            className="underline hover:text-red-300"
            aria-label="Retry"
          >
            Retry
          </button>
          <button
            onClick={handleToggleDismiss}
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

