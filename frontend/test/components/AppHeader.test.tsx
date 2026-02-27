import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AppHeader } from '../../src/components/AppHeader'
import * as apiModule from '../../src/lib/api'

interface RenderOptions {
  userEmail?: string
  completedTasks?: number
  totalTasks?: number
}

function renderHeader(props: RenderOptions = {}) {
  const userEmail = Object.prototype.hasOwnProperty.call(props, 'userEmail') ? props.userEmail : 'user@test.com'
  const completedTasks = props.completedTasks ?? 2
  const totalTasks = props.totalTasks ?? 5
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return {
    queryClient,
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <AppHeader userEmail={userEmail} completedTasks={completedTasks} totalTasks={totalTasks} />
        </QueryClientProvider>
      </MemoryRouter>,
    ),
  }
}

describe('AppHeader', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => localStorage.clear())

  it('displays the user email with an accessible label', () => {
    renderHeader()
    expect(screen.getByLabelText(/logged in as user@test\.com/i)).toBeInTheDocument()
  })

  it('displays task count via TaskCountDisplay', () => {
    renderHeader()
    expect(screen.getByLabelText(/tasks completed: 2 of 5/i)).toBeInTheDocument()
  })

  it('renders a logout button', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })

  it('calls POST /auth/logout when logout button is clicked', async () => {
    const postSpy = vi.spyOn(apiModule.api, 'post').mockResolvedValueOnce({ message: 'Logged out' })
    renderHeader()
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/auth/logout'))
  })

  it('clears the saved email from localStorage after logout', async () => {
    localStorage.setItem('bmad_todo_email', 'user@test.com')
    vi.spyOn(apiModule.api, 'post').mockResolvedValueOnce({ message: 'Logged out' })
    renderHeader()
    await userEvent.click(screen.getByRole('button', { name: /log out/i }))
    await waitFor(() => expect(localStorage.getItem('bmad_todo_email')).toBeNull())
  })

  it('disables the logout button while the logout request is in flight', async () => {
    let resolve!: (v: unknown) => void
    vi.spyOn(apiModule.api, 'post').mockReturnValueOnce(new Promise(r => { resolve = r }))
    renderHeader()
    const btn = screen.getByRole('button', { name: /log out/i })
    await userEvent.click(btn)
    expect(btn).toBeDisabled()
    await act(async () => { resolve({ message: 'Logged out' }) })
  })

  it('does not render email element when userEmail is undefined', () => {
    renderHeader({ userEmail: undefined })
    expect(screen.queryByLabelText(/logged in as/i)).not.toBeInTheDocument()
  })

  it('logout button has explicit focus ring classes (AC5)', () => {
    renderHeader()
    const btn = screen.getByRole('button', { name: /log out/i })
    expect(btn.className).toContain('focus:outline')
    expect(btn.className).toContain('focus:outline-[#00ff88]')
  })
})
