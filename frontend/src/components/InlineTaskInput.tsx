export function InlineTaskInput() {
  return (
    <div className="flex gap-2 p-3 border-2 border-black bg-white">
      <input
        type="text"
        placeholder="Add a task..."
        className="flex-1 font-pixel text-[8px] outline-none bg-transparent"
        aria-label="New task title"
        disabled  // Story 2.2 will enable and wire up onKeyDown + mutation
      />
      <button
        type="button"
        className="font-pixel text-[8px] px-2 border-2 border-black bg-white text-gray-400"
        aria-label="Submit new task"
        disabled
      >
        Add
      </button>
    </div>
  )
}
