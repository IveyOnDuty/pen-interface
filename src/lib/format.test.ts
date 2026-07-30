import { describe, expect, it } from 'vitest'
import {
  formatAsset,
  formatAssetCompact,
  formatDuration,
  formatSeats,
  formatUnixDate,
} from './format'

describe('formatAsset', () => {
  it('formats bigint with decimals and symbol', () => {
    expect(formatAsset(1_500_000n, 6, 'USDC')).toBe('1.50 USDC')
  })

  it('omits symbol when empty', () => {
    expect(formatAsset(2_000_000n, 6)).toBe('2.00')
  })
})

describe('formatAssetCompact', () => {
  it('uses K suffix for thousands', () => {
    expect(formatAssetCompact(5_500_000_000n, 6, 'USDC')).toBe('5.5K USDC')
  })

  it('uses M suffix for millions', () => {
    expect(formatAssetCompact(2_500_000_000_000n, 6)).toBe('2.50M')
  })
})

describe('formatSeats', () => {
  it('formats seat count with locale grouping', () => {
    expect(formatSeats(1234n)).toBe('1,234')
  })
})

describe('formatUnixDate', () => {
  it('formats unix seconds as a short date', () => {
    // 2025-01-03 12:00 UTC — stable across common timezones
    expect(formatUnixDate(1735905600n)).toBe('Jan 3, 2025')
  })
})

describe('formatDuration', () => {
  it('returns zero seconds for non-positive input', () => {
    expect(formatDuration(0n)).toBe('0 seconds')
  })

  it('pluralizes days', () => {
    expect(formatDuration(172_800n)).toBe('2 days')
  })

  it('uses singular day', () => {
    expect(formatDuration(86_400n)).toBe('1 day')
  })

  it('formats hours', () => {
    expect(formatDuration(7_200n)).toBe('2 hours')
  })

  it('formats minutes', () => {
    expect(formatDuration(120n)).toBe('2 minutes')
  })

  it('formats seconds', () => {
    expect(formatDuration(1n)).toBe('1 second')
  })
})
