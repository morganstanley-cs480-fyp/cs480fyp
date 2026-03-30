import { describe, test, expect, vi } from 'vitest'
import { useTradeColumns } from '../../../components/trades/useTradeColumns'

describe('useTradeColumns matchesDateRange via column.filterFn', () => {
  const columns = useTradeColumns()
  const createCol = columns.find((c) => (c as any).accessorKey === 'create_time') as any

  test('returns true when no filterValue provided', () => {
    const row = { getValue: (_: string) => '2025-05-02T12:00:00Z' }
    expect(createCol.filterFn(row, 'create_time', undefined)).toBe(true)
  })

  test('string filter matches formatted date', () => {
    const row = { getValue: (_: string) => '2025-05-02T00:00:00Z' }
    // formatted date is 02/05/2025; searching for '02/05' should match
    expect(createCol.filterFn(row, 'create_time', '02/05')).toBe(true)
    expect(createCol.filterFn(row, 'create_time', '02/05/2025')).toBe(true)
    expect(createCol.filterFn(row, 'create_time', '03/05')).toBe(false)
  })

  test('range filter (from/to) includes and excludes correctly', () => {
    const inside = { getValue: (_: string) => '2025-05-05T12:00:00Z' }
    const before = { getValue: (_: string) => '2025-04-30T12:00:00Z' }
    const after = { getValue: (_: string) => '2025-05-11T12:00:00Z' }

    const range = { from: '2025-05-01', to: '2025-05-10' }

    expect(createCol.filterFn(inside, 'create_time', range)).toBe(true)
    expect(createCol.filterFn(before, 'create_time', range)).toBe(false)
    expect(createCol.filterFn(after, 'create_time', range)).toBe(false)
  })

  test('invalid date string returns false for range filter', () => {
    const bad = { getValue: (_: string) => 'not-a-date' }
    const range = { from: '2025-05-01', to: '2025-05-10' }
    expect(createCol.filterFn(bad, 'create_time', range)).toBe(false)
  })
})
