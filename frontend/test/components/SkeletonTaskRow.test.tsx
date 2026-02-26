import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SkeletonTaskRow } from '../../src/components/SkeletonTaskRow'

describe('SkeletonTaskRow', () => {
  it('renders without crashing', () => {
    // smoke test
    render(<ul><SkeletonTaskRow /></ul>)
  })

  it('renders a list item element', () => {
    const { container } = render(<ul><SkeletonTaskRow /></ul>)
    const li = container.querySelector('li')
    expect(li).toBeInTheDocument()
  })

  it('renders two placeholder blocks (checkbox + title)', () => {
    const { container } = render(<ul><SkeletonTaskRow /></ul>)
    const divs = container.querySelectorAll('li > div')
    expect(divs).toHaveLength(2)
  })

  it('placeholder blocks have aria-hidden so they are invisible to screen readers', () => {
    const { container } = render(<ul><SkeletonTaskRow /></ul>)
    const divs = container.querySelectorAll('li > div[aria-hidden="true"]')
    expect(divs).toHaveLength(2)
  })

  it('contains animate-pulse class for skeleton shimmer effect', () => {
    const { container } = render(<ul><SkeletonTaskRow /></ul>)
    // Tailwind motion-safe variant produces the class on the element
    // Check that at least one element has a class containing 'animate-pulse'
    const allDivs = container.querySelectorAll('div')
    const hasPulse = Array.from(allDivs).some(el =>
      el.className.includes('animate-pulse'),
    )
    expect(hasPulse).toBe(true)
  })

  it('renders a bg-[#333] skeleton block for visual placeholder styling', () => {
    const { container } = render(<ul><SkeletonTaskRow /></ul>)
    const blocks = container.querySelectorAll('.bg-\\[\\#333\\]')
    expect(blocks.length).toBeGreaterThanOrEqual(1)
  })
})
