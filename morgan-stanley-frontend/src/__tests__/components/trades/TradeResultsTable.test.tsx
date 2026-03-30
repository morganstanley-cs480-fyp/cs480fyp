import { describe, it, expect } from 'vitest'
import * as Module from '../../../../src/components/trades/TradeResultsTable'

describe('TradeResultsTable (smoke)', () => {
  it('module loads', () => {
    expect(Module).toBeDefined()
  })
})
