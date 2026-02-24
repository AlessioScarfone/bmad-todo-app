import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../hooks/useAuth'

export default function TaskListPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader userEmail={user?.email} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="font-pixel text-[10px] text-center text-gray-400">
          Task list — coming in Epic 2
        </p>
      </main>
    </div>
  )
}

