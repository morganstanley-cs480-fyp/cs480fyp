import { describe, it, expect } from 'vitest'
import * as Module from '../../../../src/components/exceptions/ExceptionFilters'

describe('ExceptionFilters (smoke)', () => {
  it('module loads', () => {
    expect(Module).toBeDefined()
  })
})
