import { useState, type KeyboardEvent } from 'react'
import { useCreateTask } from '../hooks/useTasks'

export function InlineTaskInput() {
  const [title, setTitle] = useState('')
  const [validationError, setValidationError] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [pendingTitle, setPendingTitle] = useState<string | null>(null)

  const { mutate: createTask, isPending } = useCreateTask()

  function submit(titleToSubmit: string) {
    const trimmed = titleToSubmit.trim()

    // AC2 — client-side validation: empty/whitespace → no API call
    if (!trimmed) {
      setValidationError(true)
      return
    }

    setValidationError(false)
    setNetworkError(null)
    setPendingTitle(null)

    createTask(trimmed, {
      onSuccess: () => {
        setTitle('')
      },
      onError: () => {
        // AC4 — network failure: show retry affordance
        setNetworkError('Failed to create task.')
        setPendingTitle(trimmed)
      },
    })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // AC1 — Enter submits
    if (e.key === 'Enter') {
      submit(title)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    if (validationError) setValidationError(false)
  }

  function handleRetry() {
    if (pendingTitle) {
      setNetworkError(null)
      submit(pendingTitle)
    }
  }

  function handleDismiss() {
    // AC4 — abandon retry → rollback already applied by onError in mutation
    setNetworkError(null)
    setPendingTitle(null)
    setTitle('')
  }

  return (
    <div className="border-2 border-[#e0e0e0] bg-[#1c1c1c]">
      <div className="flex gap-2 p-3">
        <input
          type="text"
          value={title}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          className="flex-1 font-mono text-[13px] text-[#f0f0f0] placeholder-[#555] outline-none bg-transparent"
          aria-label="New task title"
          aria-describedby={validationError ? 'task-title-error' : undefined}
          disabled={isPending}
        />
        <button
          type="button"
          onClick={() => submit(title)}
          className="font-pixel text-[8px] px-2 border-2 border-[#00ff88] text-[#00ff88] bg-transparent hover:bg-[#00ff88] hover:text-[#0f0f0f] motion-safe:transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Submit new task"
          disabled={isPending}
        >
          Add
        </button>
      </div>

      {/* AC2 — inline validation hint */}
      {validationError && (
        <p
          id="task-title-error"
          className="px-3 pb-2 font-mono text-[11px] text-[#ff4444]"
          role="alert"
        >
          Task title cannot be empty.
        </p>
      )}

      {/* AC4 — inline error with retry / dismiss */}
      {networkError && (
        <div className="px-3 pb-2 flex items-center gap-2" role="alert">
          <span className="font-mono text-[11px] text-[#ff4444]">{networkError}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="font-pixel text-[8px] px-2 border border-[#e0e0e0] text-[#f0f0f0] bg-transparent hover:border-[#00ff88] hover:text-[#00ff88] motion-safe:transition-colors"
            aria-label="Retry"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="font-pixel text-[8px] text-[#888] underline hover:text-[#f0f0f0] motion-safe:transition-colors"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
