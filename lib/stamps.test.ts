import { describe, it, expect } from 'vitest'
import { countActiveStamps, isRewardReady } from './stamps'

const STAMPS_REQUIRED = 10

describe('countActiveStamps', () => {
  it('returns 0 when customer has no stamps', () => {
    expect(countActiveStamps([], [])).toBe(0)
  })

  it('returns total stamps when no redemptions exist', () => {
    const stamps = [
      { id: '1', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', created_at: '2024-01-02T10:00:00Z' },
      { id: '3', created_at: '2024-01-03T10:00:00Z' },
    ]
    expect(countActiveStamps(stamps, [])).toBe(3)
  })

  it('resets count after a redemption — only counts stamps after last redemption', () => {
    const stamps = [
      { id: '1', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', created_at: '2024-01-05T10:00:00Z' },
      { id: '3', created_at: '2024-01-06T10:00:00Z' },
    ]
    const redemptions = [
      { id: 'r1', redeemed_at: '2024-01-03T10:00:00Z' },
    ]
    expect(countActiveStamps(stamps, redemptions)).toBe(2)
  })

  it('returns 0 when all stamps are before the last redemption', () => {
    const stamps = [
      { id: '1', created_at: '2024-01-01T10:00:00Z' },
    ]
    const redemptions = [
      { id: 'r1', redeemed_at: '2024-01-05T10:00:00Z' },
    ]
    expect(countActiveStamps(stamps, redemptions)).toBe(0)
  })

  it('counts stamps after the LAST redemption when multiple redemptions exist', () => {
    const stamps = [
      { id: '1', created_at: '2024-01-01T10:00:00Z' },
      { id: '2', created_at: '2024-01-06T10:00:00Z' },
      { id: '3', created_at: '2024-01-11T10:00:00Z' },
    ]
    const redemptions = [
      { id: 'r1', redeemed_at: '2024-01-03T10:00:00Z' },
      { id: 'r2', redeemed_at: '2024-01-08T10:00:00Z' },
    ]
    expect(countActiveStamps(stamps, redemptions)).toBe(1)
  })
})

describe('isRewardReady', () => {
  it('returns false when active stamps < 10', () => {
    expect(isRewardReady(9, STAMPS_REQUIRED)).toBe(false)
  })

  it('returns true when active stamps === 10', () => {
    expect(isRewardReady(10, STAMPS_REQUIRED)).toBe(true)
  })

  it('returns true when active stamps > 10', () => {
    expect(isRewardReady(11, STAMPS_REQUIRED)).toBe(true)
  })

  it('returns false when 0 stamps', () => {
    expect(isRewardReady(0, STAMPS_REQUIRED)).toBe(false)
  })
})
