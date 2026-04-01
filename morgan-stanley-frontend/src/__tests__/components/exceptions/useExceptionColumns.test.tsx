import { describe, it, expect } from 'vitest'
import * as Module from '../../../../src/components/exceptions/useExceptionColumns'

describe('useExceptionColumns (smoke)', () => {
  it('exports utilities', () => {
    expect(Module).toBeDefined()
  })
})
