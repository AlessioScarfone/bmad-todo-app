interface TaskCountDisplayProps {
  completed: number
  total: number
}

export function TaskCountDisplay({ completed, total }: TaskCountDisplayProps) {
  return (
    <span
      className="font-pixel text-[8px] text-gray-600"
      aria-label={`Tasks completed: ${completed} of ${total}`}
      aria-live="polite"
    >
      {completed}/{total}
    </span>
  )
}
