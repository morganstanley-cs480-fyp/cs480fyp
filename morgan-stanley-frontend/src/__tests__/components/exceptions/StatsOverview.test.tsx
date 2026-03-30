import { describe, it, expect } from 'vitest'
import * as Module from '../../../../src/components/exceptions/StatsOverview'

describe('StatsOverview (smoke)', () => {
  it('module loads', () => {
    expect(Module).toBeDefined()
  })
})
