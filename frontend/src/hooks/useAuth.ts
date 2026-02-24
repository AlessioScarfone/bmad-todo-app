import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { AuthUser } from '../types/auth'

interface ApiError extends Error {
  statusCode?: number
}

export function useAuth() {
  const { data: user, isLoading, isError, error } = useQuery<AuthUser | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await api.get<AuthUser>('/auth/me')
      } catch (caughtError) {
        const apiError = caughtError as ApiError
        if (apiError.statusCode === 401) {
          return null
        }
        throw caughtError
      }
    },
    retry: false,              // don't retry on 401
    staleTime: 5 * 60 * 1000, // consider auth fresh for 5 min
  })

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
    error: isError ? error : null,
  }
}
