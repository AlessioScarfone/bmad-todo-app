export type SortOption = 'none' | 'label-asc' | 'deadline-asc' | 'status-incomplete-first'

interface SortDropdownProps {
  activeSortOption: SortOption
  onSortChange: (option: SortOption) => void
}

export function SortDropdown({ activeSortOption, onSortChange }: SortDropdownProps) {
  return (
    <div className="flex items-center gap-1">
      <span aria-hidden="true" className="font-mono text-[9px] text-[#888] uppercase tracking-widest">
        Sort:
      </span>
      <select
        value={activeSortOption}
        onChange={e => onSortChange(e.target.value as SortOption)}
        aria-label="Sort tasks"
        className="font-mono text-[10px] border border-[#333] bg-[#111] text-[#aaa] px-1 py-0.5 focus:outline focus:outline-1 focus:outline-[#00ff88] motion-safe:transition-colors"
      >
        <option value="none">Default</option>
        <option value="label-asc">Label (A→Z)</option>
        <option value="deadline-asc">Deadline (earliest)</option>
        <option value="status-incomplete-first">Status (incomplete first)</option>
      </select>
    </div>
  )
}
