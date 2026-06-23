import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StampGrid from './StampGrid'

describe('StampGrid', () => {
  it('renders 10 slots total', () => {
    const { container } = render(<StampGrid activeStamps={0} total={10} />)
    const slots = container.querySelectorAll('[data-testid="stamp-slot"]')
    expect(slots).toHaveLength(10)
  })

  it('marks the correct number of slots as filled', () => {
    const { container } = render(<StampGrid activeStamps={7} total={10} />)
    const filled = container.querySelectorAll('[data-filled="true"]')
    expect(filled).toHaveLength(7)
  })

  it('marks the remaining slots as empty', () => {
    const { container } = render(<StampGrid activeStamps={7} total={10} />)
    const empty = container.querySelectorAll('[data-filled="false"]')
    expect(empty).toHaveLength(3)
  })

  it('shows all slots filled when activeStamps equals total', () => {
    const { container } = render(<StampGrid activeStamps={10} total={10} />)
    const filled = container.querySelectorAll('[data-filled="true"]')
    expect(filled).toHaveLength(10)
  })
})
