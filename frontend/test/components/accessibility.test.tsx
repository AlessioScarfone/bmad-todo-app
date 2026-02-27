/**
 * Accessibility unit tests — Story 5.4
 *
 * Verifies that key WCAG 2.1 AA ARIA attributes are correctly rendered by
 * the components most critical to accessibility. These are "structural" tests:
 * they assert the ARIA contract without running a full browser audit.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskCountDisplay } from '../../src/components/TaskCountDisplay'
import { EmptyState } from '../../src/components/EmptyState'

// ---------------------------------------------------------------------------
// TaskCountDisplay
// ---------------------------------------------------------------------------
describe('TaskCountDisplay — ARIA (AC2)', () => {
  it('renders aria-label with correct N of M format', () => {
    render(<TaskCountDisplay completed={3} total={5} />)
    const el = screen.getByText('3/5')
    expect(el).toHaveAttribute('aria-label', 'Tasks completed: 3 of 5')
  })

  it('renders aria-live="polite" for screen reader live announcements', () => {
    render(<TaskCountDisplay completed={3} total={5} />)
    const el = screen.getByText('3/5')
    expect(el).toHaveAttribute('aria-live', 'polite')
  })

  it('updates aria-label when counts change', () => {
    const { rerender } = render(<TaskCountDisplay completed={0} total={0} />)
    expect(screen.getByText('0/0')).toHaveAttribute('aria-label', 'Tasks completed: 0 of 0')

    rerender(<TaskCountDisplay completed={5} total={10} />)
    expect(screen.getByText('5/10')).toHaveAttribute('aria-label', 'Tasks completed: 5 of 10')
  })
})

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
describe('EmptyState — ARIA (AC2)', () => {
  it('wraps content in an aria-live="polite" region', () => {
    const { container } = render(<EmptyState />)
    const region = container.firstChild as HTMLElement
    expect(region).toHaveAttribute('aria-live', 'polite')
  })

  it('shows the expected empty-state text', () => {
    render(<EmptyState />)
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })
})
