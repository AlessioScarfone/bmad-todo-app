import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TaskCountDisplay } from '../../src/components/TaskCountDisplay'

describe('TaskCountDisplay', () => {
  it('renders completed/total in N/N format', () => {
    render(<TaskCountDisplay completed={3} total={5} />)
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  it('renders 0/0 when no tasks exist', () => {
    render(<TaskCountDisplay completed={0} total={0} />)
    expect(screen.getByText('0/0')).toBeInTheDocument()
  })

  it('aria-label describes the count for screen readers', () => {
    render(<TaskCountDisplay completed={2} total={7} />)
    expect(screen.getByLabelText(/tasks completed: 2 of 7/i)).toBeInTheDocument()
  })

  it('has aria-live="polite" so count changes are announced', () => {
    const { container } = render(<TaskCountDisplay completed={1} total={3} />)
    expect(container.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })
})
