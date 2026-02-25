import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { clearSavedEmail } from '../lib/auth'
import { api } from '../lib/api'
import { TaskCountDisplay } from './TaskCountDisplay'

interface AppHeaderProps {
  userEmail?: string
  completedTasks: number
  totalTasks: number
}

export function AppHeader({ userEmail, completedTasks, totalTasks }: AppHeaderProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await api.post('/auth/logout')
    } catch {
      // Logout is best-effort — proceed even if the API call fails.
      // Client-side cleanup always runs to prevent stale UI state.
    } finally {
      clearSavedEmail()                              // remove localStorage key (AC3)
      queryClient.clear()                            // wipe all TanStack Query cache (AC3)
      setIsLoggingOut(false)
      navigate('/login', { replace: true })          // replace prevents back-button to task list (AC3)
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b-4 border-black bg-white">
      <h1 className="font-pixel text-[10px]">bmad-todo</h1>
      <div className="flex items-center gap-4">
        {userEmail && (
          <span
            className="font-pixel text-[8px] text-gray-500 hidden sm:block"
            aria-label={`Logged in as ${userEmail}`}
          >
            {userEmail}
          </span>
        )}
        <TaskCountDisplay completed={completedTasks} total={totalTasks} />
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Log out"
          className="font-pixel text-[8px] px-3 py-2 border-2 border-black bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px"
        >
          {isLoggingOut ? '...' : 'Logout'}
        </button>
      </div>
    </header>
  )
}
