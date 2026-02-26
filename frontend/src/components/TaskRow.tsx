import { useState, useRef, useEffect } from 'react'
import { useLabels } from '../hooks/useLabels'
import { useAttachLabel, useToggleTask, useUpdateTask, useDeleteTask, useRemoveLabel, useSetDeadline } from '../hooks/useTasks'
import type { Task } from '../types/tasks'
import { SubtaskPanel } from './SubtaskPanel'

interface TaskRowProps {
  task: Task
}

type FailedLabelAction
  = { type: 'attach'; name: string }
  | { type: 'remove'; labelId: number }

function formatDeadline(isoDate: string): string {
  // Append T12:00:00 to avoid UTC/local timezone boundary issues
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function TaskRow({ task }: TaskRowProps) {
  const toggleTask = useToggleTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const setDeadline = useSetDeadline()
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

  // Deadline state
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false)
  const [deadlineError, setDeadlineError] = useState<string | null>(null)
  const [lastDeadlineArgs, setLastDeadlineArgs] = useState<{ id: number; deadline: string | null } | null>(null)

  // Subtask panel state
  const [subtasksOpen, setSubtasksOpen] = useState(false)

  // Label state
  const [isAddingLabel, setIsAddingLabel] = useState(false)
  const [labelInput, setLabelInput] = useState('')
  const [labelError, setLabelError] = useState<string | null>(null)
  const [failedLabelAction, setFailedLabelAction] = useState<FailedLabelAction | null>(null)
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
    setFailedLabelAction(null)
    removeLabel.mutate(
      { taskId: task.id, labelId },
      {
        onError: () => {
          setLabelError('Failed to remove label. Please try again.')
          setFailedLabelAction({ type: 'remove', labelId })
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
    setFailedLabelAction(null)
    attachLabel.mutate(
      { taskId: task.id, name: trimmed },
      {
        onSuccess: () => {
          setLabelInput('')
          setIsAddingLabel(false)
        },
        onError: () => {
          setLabelError('Failed to attach label. Please try again.')
          setFailedLabelAction({ type: 'attach', name: trimmed })
        },
      },
    )
  }

  const handleRetryLabel = () => {
    if (!failedLabelAction) return

    setLabelError(null)

    if (failedLabelAction.type === 'attach') {
      attachLabel.mutate(
        { taskId: task.id, name: failedLabelAction.name },
        {
          onSuccess: () => {
            setFailedLabelAction(null)
            setLabelInput('')
            setIsAddingLabel(false)
          },
          onError: () => {
            setLabelError('Failed to attach label. Please try again.')
          },
        },
      )
      return
    }

    removeLabel.mutate(
      { taskId: task.id, labelId: failedLabelAction.labelId },
      {
        onSuccess: () => {
          setFailedLabelAction(null)
        },
        onError: () => {
          setLabelError('Failed to remove label. Please try again.')
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

  // ---------- deadline handlers ----------
  const handleSetDeadline = (deadline: string | null) => {
    setDeadlineError(null)
    const args = { id: task.id, deadline }
    setLastDeadlineArgs(args)
    setDeadline.mutate(args, {
      onError: () => {
        setDeadlineError('Deadline update failed.')
      },
    })
  }

  const handleRetryDeadline = () => {
    if (!lastDeadlineArgs) return
    setDeadlineError(null)
    setDeadline.mutate(lastDeadlineArgs, {
      onError: () => {
        setDeadlineError('Deadline update failed.')
      },
    })
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

      {/* Deadline section */}
      <div className="mt-1 ml-6 flex flex-wrap items-center gap-2 text-[11px]">
        {task.deadline && (
          <div className="flex items-center gap-1 text-[#aaa]">
            <span aria-label={`Deadline: ${formatDeadline(task.deadline)}`}>
              📅 {formatDeadline(task.deadline)}
            </span>
            <button
              type="button"
              aria-label="Remove deadline"
              onClick={() => handleSetDeadline(null)}
              disabled={setDeadline.isPending}
              className="text-[#666] hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ×
            </button>
          </div>
        )}
        {!task.deadline && !showDeadlinePicker && (
          <button
            type="button"
            aria-label={`Set deadline for ${task.title}`}
            onClick={() => setShowDeadlinePicker(true)}
            disabled={setDeadline.isPending}
            className="text-[#666] hover:text-[#f0f0f0] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📅
          </button>
        )}
        {showDeadlinePicker && (
          <input
            type="date"
            aria-label={`Set deadline for ${task.title}`}
            autoFocus
            className="border border-[#2a2a2a] bg-[#1c1c1c] px-1 py-0.5 text-[11px] text-[#f0f0f0] outline-none focus:border-[#00ff88]"
            onChange={e => {
              if (e.target.value) {
                handleSetDeadline(e.target.value)
              }
              // Close picker on any change event (including clear): avoids picker staying
              // open indefinitely when the user clears the input via keyboard (M3 fix)
              setShowDeadlinePicker(false)
            }}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.preventDefault()
                setShowDeadlinePicker(false)
              }
            }}
            onBlur={() => setShowDeadlinePicker(false)}
          />
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
              aria-label={`Retry saving ${task.title}`}
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
            aria-label={`Retry saving ${task.title}`}
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
        <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400 flex items-center gap-2">
          <span>{labelError}</span>
          <button
            type="button"
            onClick={handleRetryLabel}
            aria-label={`Retry saving ${task.title}`}
            className="underline hover:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* Deadline error */}
      {deadlineError && (
        <div role="alert" className="mt-1 ml-6 text-[11px] text-red-400 flex items-center gap-2">
          <span>{deadlineError}</span>
          <button
            type="button"
            onClick={handleRetryDeadline}
            aria-label={`Retry saving ${task.title}`}
            className="underline hover:text-red-300"
          >
            Retry
          </button>
        </div>
      )}

      {/* Subtask toggle button */}
      <div className="mt-1 ml-6">
        <button
          type="button"
          onClick={() => setSubtasksOpen(open => !open)}
          aria-expanded={subtasksOpen}
          aria-label={`${subtasksOpen ? 'Collapse' : 'Expand'} subtasks for "${task.title}"`}
          className="text-[11px] text-[#555] hover:text-[#00ff88] font-mono"
        >
          {subtasksOpen ? '▲ Subtasks' : '▼ Subtasks'}
        </button>
      </div>

      {/* Subtask panel — NO auto-complete logic (FR20) */}
      {subtasksOpen && <SubtaskPanel taskId={task.id} />}
    </li>
  )
}

