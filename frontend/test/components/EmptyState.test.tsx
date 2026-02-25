import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from '../../src/components/EmptyState'

describe('EmptyState', () => {
  it('renders the no-tasks prompt message', () => {
    render(<EmptyState />)
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument()
  })

  it('tells the user how to create a task', () => {
    render(<EmptyState />)
    expect(screen.getByText(/type above and press enter/i)).toBeInTheDocument()
  })

  it('has aria-live="polite" so the message is announced by screen readers', () => {
    const { container } = render(<EmptyState />)
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })
})
