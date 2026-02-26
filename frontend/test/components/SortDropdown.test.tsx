import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SortDropdown } from '../../src/components/SortDropdown'
import type { SortOption } from '../../src/components/SortDropdown'

describe('SortDropdown', () => {
  it('renders a select element with aria-label "Sort tasks"', () => {
    render(<SortDropdown activeSortOption="none" onSortChange={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: 'Sort tasks' })
    expect(select).toBeInTheDocument()
  })

  it('displays "Default" as the default option when activeSortOption is "none"', () => {
    render(<SortDropdown activeSortOption="none" onSortChange={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: 'Sort tasks' }) as HTMLSelectElement
    expect(select.value).toBe('none')
  })

  it('renders all four sort options', () => {
    render(<SortDropdown activeSortOption="none" onSortChange={vi.fn()} />)
    expect(screen.getByRole('option', { name: 'Default' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Label (A→Z)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Deadline (earliest)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Status (incomplete first)' })).toBeInTheDocument()
  })

  it('reflects the activeSortOption as the selected value', () => {
    render(<SortDropdown activeSortOption="label-asc" onSortChange={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: 'Sort tasks' }) as HTMLSelectElement
    expect(select.value).toBe('label-asc')
  })

  it('calls onSortChange with "label-asc" when Label option is selected', async () => {
    const onSortChange = vi.fn()
    render(<SortDropdown activeSortOption="none" onSortChange={onSortChange} />)
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort tasks' }), 'label-asc')
    expect(onSortChange).toHaveBeenCalledOnce()
    expect(onSortChange).toHaveBeenCalledWith('label-asc')
  })

  it('calls onSortChange with "deadline-asc" when Deadline option is selected', async () => {
    const onSortChange = vi.fn()
    render(<SortDropdown activeSortOption="none" onSortChange={onSortChange} />)
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort tasks' }), 'deadline-asc')
    expect(onSortChange).toHaveBeenCalledOnce()
    expect(onSortChange).toHaveBeenCalledWith('deadline-asc')
  })

  it('calls onSortChange with "status-incomplete-first" when Status option is selected', async () => {
    const onSortChange = vi.fn()
    render(<SortDropdown activeSortOption="none" onSortChange={onSortChange} />)
    const user = userEvent.setup()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort tasks' }),
      'status-incomplete-first',
    )
    expect(onSortChange).toHaveBeenCalledOnce()
    expect(onSortChange).toHaveBeenCalledWith('status-incomplete-first')
  })

  it('accepts all valid SortOption values without TypeScript errors', () => {
    const validOptions: SortOption[] = [
      'none',
      'label-asc',
      'deadline-asc',
      'status-incomplete-first',
    ]
    validOptions.forEach(option => {
      const { unmount } = render(<SortDropdown activeSortOption={option} onSortChange={vi.fn()} />)
      const select = screen.getByRole('combobox', { name: 'Sort tasks' }) as HTMLSelectElement
      expect(select.value).toBe(option)
      unmount()
    })
  })
})
