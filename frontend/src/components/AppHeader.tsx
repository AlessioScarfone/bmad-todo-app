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
      clearSavedEmail() // remove localStorage key (AC3)

      // 1. Cancel any in-flight fetches so they cannot overwrite the state
      //    we are about to set (e.g. an in-progress /auth/me refetch).
      await queryClient.cancelQueries()

      // 2. Set auth to null and KEEP it in the cache (do NOT call clear()).
      //    queryClient.clear() would REMOVE the entry, causing useQuery to
      //    transition to isLoading:true and immediately fire a new /auth/me
      //    request. If that request completes before React Router finishes
      //    navigating, it repopulates the cache with a valid user, causing
      //    LoginPage to redirect straight back to '/'.
      //    Keeping it as null with staleTime still active (5 min) prevents
      //    any automatic background refetch.
      queryClient.setQueryData(['auth', 'me'], null)

      // 3. Drop other cached data (tasks, etc.) so the next logged-in user
      //    gets a fresh fetch. We use removeQueries on specific keys rather
      //    than clear() to avoid disturbing the auth entry we just set.
      queryClient.removeQueries({ queryKey: ['tasks'] })

      navigate('/login', { replace: true }) // replace prevents back-button to task list (AC3)
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b-2 border-[#333] bg-[#1c1c1c]">
      <p className="font-pixel text-[10px] text-[#00ff88] tracking-widest">BMAD:TODO</p>
      <div className="flex items-center gap-4">
        {userEmail && (
          <span
            className="font-mono text-[11px] text-[#888] hidden sm:block"
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
          className="font-pixel text-[8px] px-3 py-2 border-2 border-[#e0e0e0] bg-transparent text-[#f0f0f0] hover:border-[#00ff88] hover:text-[#00ff88] disabled:opacity-40 disabled:cursor-not-allowed motion-safe:transition-colors"
        >
          {isLoggingOut ? '...' : 'Logout'}
        </button>
      </div>
    </header>
  )
}
