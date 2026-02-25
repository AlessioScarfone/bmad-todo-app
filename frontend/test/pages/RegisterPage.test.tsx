import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RegisterPage from '../../src/pages/RegisterPage'
import * as apiModule from '../../src/lib/api'

function renderRegister() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <RegisterPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('renders email and password fields', () => {
    renderRegister()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders the CREATE ACCOUNT submit button', () => {
    renderRegister()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows "Email is required" when submitting with empty email', async () => {
    renderRegister()
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })

  it('shows email format error for invalid email', async () => {
    renderRegister()
    await userEvent.type(screen.getByLabelText(/email/i), 'notanemail')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })

  it('shows "Password is required" when password field is empty', async () => {
    renderRegister()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
  })

  it('shows minimum-length error when password is shorter than 8 characters', async () => {
    renderRegister()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it('does not call api.post when form is invalid', async () => {
    const postSpy = vi.spyOn(apiModule.api, 'post')
    renderRegister()
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(postSpy).not.toHaveBeenCalled()
  })

  it('calls api.post /auth/register with trimmed email and password on valid submit', async () => {
    const postSpy = vi.spyOn(apiModule.api, 'post').mockResolvedValueOnce({ id: 1, email: 'user@test.com' })
    renderRegister()
    await userEvent.type(screen.getByLabelText(/email/i), '  user@test.com  ')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith('/auth/register', {
        email: 'user@test.com',
        password: 'password123',
      }),
    )
  })

  it('shows duplicate-email error on 409 response', async () => {
    const error = Object.assign(new Error('Conflict'), { statusCode: 409 })
    vi.spyOn(apiModule.api, 'post').mockRejectedValueOnce(error)
    renderRegister()
    await userEvent.type(screen.getByLabelText(/email/i), 'existing@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() =>
      expect(screen.getByText(/already exists/i)).toBeInTheDocument(),
    )
  })

  it('shows generic error on non-409 server failure', async () => {
    const error = Object.assign(new Error('Internal Server Error'), { statusCode: 500 })
    vi.spyOn(apiModule.api, 'post').mockRejectedValueOnce(error)
    renderRegister()
    await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() =>
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument(),
    )
  })
})
