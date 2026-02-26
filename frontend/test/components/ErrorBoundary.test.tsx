import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorBoundary } from '../../src/components/ErrorBoundary'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function ThrowingComponent({ message = 'Oops' }: { message?: string }) {
  throw new Error(message)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  // Suppress console.error — ErrorBoundary always logs; keep test output clean
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('shows full-page error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
  })

  it('renders a Reload button with correct aria-label when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('button', { name: 'Reload the application' })).toBeInTheDocument()
  })

  it('displays the error message from the thrown error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Oops" />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Oops')
  })

  it('calls console.error when a child throws (componentDidCatch)', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent message="Test crash" />
      </ErrorBoundary>,
    )
    expect(console.error).toHaveBeenCalledWith(
      '[ErrorBoundary] Unhandled render error:',
      expect.any(Error),
      expect.any(String),
    )
  })

  it('reload button calls window.location.reload when clicked', async () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Reload the application' }))
    expect(reloadSpy).toHaveBeenCalledOnce()
  })
})
