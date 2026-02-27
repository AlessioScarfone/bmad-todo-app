export function EmptyState() {
  return (
    <div
      className="mt-12 text-center"
      aria-live="polite"
    >
      <p className="font-pixel text-[8px] text-[#888] leading-loose">
        No tasks yet.<br />Type above and press Enter.
      </p>
    </div>
  )
}
