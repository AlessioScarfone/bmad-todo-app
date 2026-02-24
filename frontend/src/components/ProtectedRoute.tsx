import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, error } = useAuth()

  if (isLoading)
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center" role="status" aria-live="polite" aria-label="Checking authentication">
        <p className="font-pixel text-[10px] text-[#00ff88]">LOADING...</p>
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6" role="alert" aria-live="assertive">
        <p className="font-mono text-[12px] text-[#ff4444]">Authentication check failed. Please refresh.</p>
      </div>
    )

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
