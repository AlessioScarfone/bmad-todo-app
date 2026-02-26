import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { useAuth } from '../../src/hooks/useAuth'
import * as apiModule from '../../src/lib/api'
import type { AuthUser } from '../../src/types/auth'

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useAuth', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.restoreAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  it('returns isLoading=true before the query resolves', () => {
    // Never resolves — keeps the hook in loading state
    vi.spyOn(apiModule.api, 'get').mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeUndefined()
  })

  it('returns user and isAuthenticated=true when API succeeds', async () => {
    const user: AuthUser = { id: 1, email: 'test@example.com' }
    vi.spyOn(apiModule.api, 'get').mockResolvedValue(user)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.user).toEqual(user)
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('returns user=undefined and isAuthenticated=false when API returns 401', async () => {
    const err = Object.assign(new Error('Unauthorized'), { statusCode: 401 })
    vi.spyOn(apiModule.api, 'get').mockRejectedValue(err)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.user).toBeUndefined()
    expect(result.current.isAuthenticated).toBe(false)
    // 401 is handled silently — no error exposed
    expect(result.current.error).toBeNull()
  })

  it('propagates non-401 errors and sets error=true', async () => {
    const err = Object.assign(new Error('Internal Server Error'), { statusCode: 500 })
    vi.spyOn(apiModule.api, 'get').mockRejectedValue(err)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeUndefined()
    expect(result.current.error).toBeTruthy()
  })

  it('calls /auth/me endpoint', async () => {
    const user: AuthUser = { id: 42, email: 'me@example.com' }
    const getSpy = vi.spyOn(apiModule.api, 'get').mockResolvedValue(user)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getSpy).toHaveBeenCalledWith('/auth/me')
  })
})
