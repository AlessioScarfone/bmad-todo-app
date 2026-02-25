import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProtectedRoute } from '../../src/components/ProtectedRoute'
import * as useAuthModule from '../../src/hooks/useAuth'
import type { AuthUser } from '../../src/types/auth'

function mockUseAuth(overrides: Partial<ReturnType<typeof useAuthModule.useAuth>>) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: undefined,
    isLoading: false,
    isAuthenticated: false,
    error: null,
    ...overrides,
  })
}

function renderProtectedRoute(children = <div>Protected Content</div>) {
  return render(
    <MemoryRouter>
      <ProtectedRoute>{children}</ProtectedRoute>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders a loading indicator while auth check is in flight', () => {
    mockUseAuth({ isLoading: true })
    renderProtectedRoute()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders an error message when the auth check errors', () => {
    mockUseAuth({ error: new Error('Network error') })
    renderProtectedRoute()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('does not render children and redirects when unauthenticated', () => {
    mockUseAuth({ user: undefined })
    renderProtectedRoute()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    const user: AuthUser = { id: 1, email: 'user@example.com' }
    mockUseAuth({ user, isAuthenticated: true })
    renderProtectedRoute()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
