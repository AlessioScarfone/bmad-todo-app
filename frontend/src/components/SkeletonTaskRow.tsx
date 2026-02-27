export function SkeletonTaskRow() {
  return (
    <li className="flex items-center gap-3 py-2 px-2 border border-[#222] rounded">
      {/* Checkbox placeholder */}
      <div className="motion-safe:animate-pulse w-4 h-4 rounded-sm bg-[#333] flex-shrink-0" aria-hidden="true" />
      {/* Title placeholder — variable width for visual realism */}
      <div className="motion-safe:animate-pulse h-3 bg-[#333] rounded flex-1 max-w-[60%]" aria-hidden="true" />
    </li>
  )
}
