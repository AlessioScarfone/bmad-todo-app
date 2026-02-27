import type { Task } from '../types/tasks'
import { SortDropdown, type SortOption } from './SortDropdown'

interface FilterBarProps {
  tasks: Task[]
  activeStatusFilter: 'all' | 'active' | 'done'
  activeDeadlineFilter: boolean
  activeLabelFilter: string | null
  activeSortOption: SortOption
  onStatusChange: (status: 'all' | 'active' | 'done') => void
  onDeadlineChange: (active: boolean) => void
  onLabelChange: (label: string | null) => void
  onSortChange: (option: SortOption) => void
}

const STATUS_OPTIONS: { value: 'all' | 'active' | 'done'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Done' },
]

function FilterButton({
  label,
  isActive,
  onClick,
  ariaLabel,
}: {
  label: string
  isActive: boolean
  onClick: () => void
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={ariaLabel ?? label}
      onClick={onClick}
      className={[
        'px-2 py-0.5 font-mono text-[10px] border motion-safe:transition-colors focus:outline focus:outline-1 focus:outline-[#00ff88]',
        isActive
          ? 'border-[#00ff88] text-[#00ff88] bg-[#0a2a1a]'
          : 'border-[#666] text-[#888] hover:border-[#888] hover:text-[#ccc]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

export function FilterBar({
  tasks,
  activeStatusFilter,
  activeDeadlineFilter,
  activeLabelFilter,
  activeSortOption,
  onStatusChange,
  onDeadlineChange,
  onLabelChange,
  onSortChange,
}: FilterBarProps) {
  // Derive unique label names from the full task list — no extra API call
  const uniqueLabels = Array.from(
    new Set(tasks.flatMap(t => t.labels.map(l => l.name))),
  ).sort()

  const handleStatusClick = (value: 'all' | 'active' | 'done') => {
    // Clicking the already-active status resets to 'all'
    onStatusChange(activeStatusFilter === value && value !== 'all' ? 'all' : value)
  }

  const handleLabelClick = (name: string) => {
    // Clicking the already-active label deselects it
    onLabelChange(activeLabelFilter === name ? null : name)
  }

  return (
    <nav aria-label="Task filters" className="mt-3 mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* Status group */}
      <div className="flex items-center gap-1">
        <span className="font-mono text-[9px] text-[#444] mr-1 uppercase tracking-widest">
          Status:
        </span>
        {STATUS_OPTIONS.map(opt => (
          <FilterButton
            key={opt.value}
            label={opt.label}
            isActive={activeStatusFilter === opt.value}
            onClick={() => handleStatusClick(opt.value)}
            ariaLabel={`Filter by status: ${opt.value}`}
          />
        ))}
      </div>

      {/* Deadline group */}
      <div className="flex items-center gap-1">
        <span className="font-mono text-[9px] text-[#444] mr-1 uppercase tracking-widest">
          Deadline:
        </span>
        <FilterButton
          label="Has deadline"
          isActive={activeDeadlineFilter}
          onClick={() => onDeadlineChange(!activeDeadlineFilter)}
          ariaLabel="Filter: has deadline"
        />
      </div>

      {/* Labels group — only rendered when at least one task has a label */}
      {uniqueLabels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-mono text-[9px] text-[#444] mr-1 uppercase tracking-widest">
            Labels:
          </span>
          {uniqueLabels.map(name => (
            <FilterButton
              key={name}
              label={name}
              isActive={activeLabelFilter === name}
              onClick={() => handleLabelClick(name)}
              ariaLabel={`Filter by label: ${name}`}
            />
          ))}
        </div>
      )}
      {/* Sort group — inline with filters (UX alignment) */}
      <SortDropdown activeSortOption={activeSortOption} onSortChange={onSortChange} />    </nav>
  )
}
