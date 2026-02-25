import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LoginPage from '../../src/pages/LoginPage'
import * as useAuthModule from '../../src/hooks/useAuth'
import * as apiModule from '../../src/lib/api'

function mockUnauthenticated() {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: undefined,
    isLoading: false,
    isAuthenticated: false,
    error: null,
  })
}

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    queryClient,
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <LoginPage />
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  }
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    mockUnauthenticated()
  })

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the LOG IN submit button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('pre-fills email field from localStorage (AC2 — email pre-fill)', () => {
    localStorage.setItem('bmad_todo_email', 'saved@example.com')
    renderLogin()
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    expect(emailInput.value).toBe('saved@example.com')
  })

  it('shows "Email is required" when submitting with no email', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })

  it('shows "Password is required" when email is filled but password is not', async () => {
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('does not call api.post when form is invalid', async () => {
    const postSpy = vi.spyOn(apiModule.api, 'post')
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('calls api.post /auth/login with trimmed email and password on valid submit', async () => {
    const postSpy = vi.spyOn(apiModule.api, 'post').mockResolvedValueOnce({ id: 1, email: 'user@test.com' })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith('/auth/login', {
        email: 'user@test.com',
        password: 'password123',
      }),
    )
  })

  it('saves email to localStorage after successful login (AC1 — pre-fill for next visit)', async () => {
    vi.spyOn(apiModule.api, 'post').mockResolvedValueOnce({ id: 1, email: 'user@test.com' })
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => expect(localStorage.getItem('bmad_todo_email')).toBe('user@test.com'))
  })

  it('shows "Invalid email or password" alert on 401 response', async () => {
    const error = Object.assign(new Error('Invalid email or password'), { statusCode: 401 })
    vi.spyOn(apiModule.api, 'post').mockRejectedValueOnce(error)
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i),
    )
  })

  it('shows generic error message on non-401 server failure', async () => {
    const error = Object.assign(new Error('Internal Server Error'), { statusCode: 500 })
    vi.spyOn(apiModule.api, 'post').mockRejectedValueOnce(error)
    renderLogin()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/login failed/i),
    )
  })
})
