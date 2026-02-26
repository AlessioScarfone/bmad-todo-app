import { useState, useRef, useEffect } from 'react'
import { useLabels } from '../hooks/useLabels'
import { useAttachLabel, useToggleTask, useUpdateTask, useDeleteTask, useRemoveLabel } from '../hooks/useTasks'
import type { Task } from '../types/tasks'

interface TaskRowProps {
  task: Task
}

export function TaskRow({ task }: TaskRowProps) {
  const toggleTask = useToggleTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const attachLabel = useAttachLabel()
  const removeLabel = useRemoveLabel()

  // Toggle error state
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [lastTask, setLastTask] = useState<Task>(task)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)
  const [editError, setEditError] = useState<string | null>(null)
  const [failedTitle, setFailedTitle] = useState<string | null>(null)

  // Delete state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Label state
  const [isAddingLabel, setIsAddingLabel] = useState(false)
  const [labelInput, setLabelInput] = useState('')
  const [labelError, setLabelError] = useState<string | null>(null)
  const { data: allLabels = [] } = useLabels(isAddingLabel)

  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
    }
  }, [isEditing])

  // Keep editValue in sync if task.title changes externally (e.g. server reconciliation)
  // No effect needed: editValue is initialized from task.title and is reset in enterEditMode,
  // so it will reflect the latest title when editing starts.
  
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
    // Enter on the row (not in edit mode, not in confirm-delete mode) enters edit mode
    if (e.key === 'Enter' && !isEditing && !isConfirmingDelete && e.target === e.currentTarget) {
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

  const handleRemoveLabel = (labelId: number) => {
    setLabelError(null)
    removeLabel.mutate(
      { taskId: task.id, labelId },
      {
        onError: () => {
          setLabelError('Failed to remove label. Please try again.')
        },
      },
    )
  }

  const submitLabel = () => {
    const trimmed = labelInput.trim()
    if (trimmed.length === 0) {
      setLabelError('Label must not be empty')
      return
    }

    setLabelError(null)
    attachLabel.mutate(
      { taskId: task.id, name: trimmed },
      {
        onSuccess: () => {
          setLabelInput('')
          setIsAddingLabel(false)
        },
        onError: () => {
          setLabelError('Failed to attach label. Please try again.')
        },
      },
    )
  }

  const handleLabelInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitLabel()
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setLabelInput('')
      setLabelError(null)
      setIsAddingLabel(false)
    }
  }

  const ariaLabel = task.isCompleted
    ? `Mark ${task.title} as not done`
    : `Mark ${task.title} as done`

  const suggestionOptions = allLabels.filter(label => {
    const alreadyAttached = task.labels.some(taskLabel => taskLabel.id === label.id)
    const input = labelInput.trim().toLowerCase()

    if (alreadyAttached) {
      return false
    }

    if (input.length === 0) {
      return true
    }

    return label.name.toLowerCase().includes(input)
  })

  const labelDatalistId = `task-${task.id}-labels`

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

        {/* Delete icon — shown on hover, hidden during edit or confirm state */}
        {!isEditing && !isConfirmingDelete && (
          <button
            onClick={() => { setDeleteError(null); setIsConfirmingDelete(true) }}
            aria-label="Delete task"
            className="opacity-0 group-hover:opacity-100 text-[#888] hover:text-red-400 motion-safe:transition-opacity px-1"
          >
            ✕
          </button>
        )}

        {/* Confirm delete strip */}
        {isConfirmingDelete && (
          <span className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-red-400">Delete?</span>
            <button
              onClick={() => {
                setIsConfirmingDelete(false)
                deleteTask.mutate(task.id, {
                  onError: () => setDeleteError('Failed to delete task. Please try again.'),
                })
              }}
              aria-label="Confirm delete task"
              className="text-[11px] text-red-400 underline hover:text-red-300"
            >
              Confirm
            </button>
            <button
              onClick={() => { setIsConfirmingDelete(false); setDeleteError(null) }}
              aria-label="Cancel delete"
              className="text-[11px] text-[#888] underline hover:text-[#f0f0f0]"
            >
              Cancel
            </button>
          </span>
        )}
      </div>

      <div className="mt-2 ml-6 flex flex-wrap items-center gap-2">
        {task.labels.map(label => (
          <span
            key={label.id}
            aria-label={`Label: ${label.name}`}
            className="inline-flex items-center gap-1 rounded border border-[#2a2a2a] px-2 py-0.5 text-[11px]"
          >
            {label.name}
            <button
              type="button"
              onClick={() => handleRemoveLabel(label.id)}
              aria-label={`Remove label ${label.name}`}
              className="text-[#888] hover:text-red-400"
            >
              ✕
            </button>
          </span>
        ))}

        {!isAddingLabel ? (
          <button
            type="button"
            aria-label="Add label"
            onClick={() => {
              setLabelError(null)
              setIsAddingLabel(true)
            }}
            className="text-[11px] text-[#888] underline hover:text-[#f0f0f0]"
          >
            + Label
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={handleLabelInputKeyDown}
              aria-label="Add label"
              list={labelDatalistId}
              className="w-36 border border-[#2a2a2a] bg-[#1c1c1c] px-1 py-0.5 text-[11px] text-[#f0f0f0] outline-none focus:border-[#00ff88]"
            />
            <datalist id={labelDatalistId}>
              {suggestionOptions.map(label => (
                <option key={label.id} value={label.name} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={submitLabel}
              className="text-[11px] text-[#888] underline hover:text-[#f0f0f0]"
            >
              Add
            </button>
          </div>
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

      {/* Delete error (inline, with Retry) */}
      {deleteError && (
        <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400 flex items-center gap-2">
          <span>{deleteError}</span>
          <button
            onClick={() => { setDeleteError(null); setIsConfirmingDelete(true) }}
            className="underline hover:text-red-300"
            aria-label="Retry delete"
          >
            Retry
          </button>
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

      {labelError && (
        <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400">
          {labelError}
        </div>
      )}
    </li>
  )
}

