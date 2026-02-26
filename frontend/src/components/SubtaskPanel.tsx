import { useState, useRef } from 'react'
import { useSubtasks, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from '../hooks/useTasks'

interface SubtaskPanelProps {
  taskId: number
}

export function SubtaskPanel({ taskId }: SubtaskPanelProps) {
  const { data: subtasks = [], isLoading } = useSubtasks(taskId)
  const createSubtask = useCreateSubtask(taskId)
  const toggleSubtask = useToggleSubtask(taskId)
  const deleteSubtask = useDeleteSubtask(taskId)

  const [newTitle, setNewTitle] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleCreate = () => {
    const title = newTitle.trim()
    if (!title) return
    setCreateError(null)
    createSubtask.mutate(
      { title },
      {
        onSuccess: () => setNewTitle(''),
        onError: (err) => setCreateError(err.message ?? 'Failed to add subtask'),
      },
    )
  }

  if (isLoading) {
    return <div className="pl-8 py-2 text-sm text-[#888]">Loading subtasks…</div>
  }

  return (
    <div className="pl-8 pt-2 pb-3 space-y-1" role="list" aria-label="Subtasks">
      {subtasks.map(subtask => (
        <div key={subtask.id} role="listitem" className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={subtask.isCompleted}
            onChange={() =>
              toggleSubtask.mutate({ subId: subtask.id, isCompleted: !subtask.isCompleted })
            }
            aria-label={`Mark subtask "${subtask.title}" as ${subtask.isCompleted ? 'incomplete' : 'complete'}`}
            className="h-4 w-4 cursor-pointer accent-[#00ff88]"
          />
          <span
            className={
              subtask.isCompleted
                ? 'line-through text-[#666] text-[12px] font-mono'
                : 'text-[12px] font-mono text-[#d0d0d0]'
            }
          >
            {subtask.title}
          </span>
          <button
            onClick={() => deleteSubtask.mutate({ subId: subtask.id })}
            aria-label={`Delete subtask "${subtask.title}"`}
            className="ml-auto text-[#555] hover:text-red-400 text-xs"
          >
            ×
          </button>
        </div>
      ))}

      {subtasks.length === 0 && (
        <p className="text-[11px] text-[#555] italic font-mono">No subtasks yet</p>
      )}

      {/* New subtask input — no expand control on subtask rows (AC7 / FR19) */}
      <div className="flex items-center gap-2 pt-1">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleCreate()
            if (e.key === 'Escape') setNewTitle('')
          }}
          placeholder="Add a subtask…"
          aria-label="New subtask title"
          className="flex-1 text-[12px] font-mono border-b border-[#2a2a2a] focus:outline-none focus:border-[#00ff88] bg-transparent py-0.5 text-[#f0f0f0] placeholder:text-[#444]"
        />
        <button
          onClick={handleCreate}
          disabled={!newTitle.trim() || createSubtask.isPending}
          className="text-[11px] text-[#888] hover:text-[#00ff88] disabled:opacity-40 font-mono"
          aria-label="Add subtask"
        >
          Add
        </button>
      </div>

      {createError && (
        <div role="alert" className="text-[11px] text-red-400 mt-1 font-mono flex items-center gap-2">
          <span>{createError}</span>
          <button
            onClick={handleCreate}
            className="underline hover:text-red-300"
            aria-label="Retry adding subtask"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
