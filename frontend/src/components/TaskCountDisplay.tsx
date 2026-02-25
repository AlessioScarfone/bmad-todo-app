interface TaskCountDisplayProps {
  completed: number
  total: number
}

export function TaskCountDisplay({ completed, total }: TaskCountDisplayProps) {
  return (
    <span
      className="font-pixel text-[10px] text-[#00ff88] tabular-nums"
      aria-label={`Tasks completed: ${completed} of ${total}`}
      aria-live="polite"
    >
      {completed}/{total}
    </span>
  )
}
