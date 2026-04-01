import { describe, it, expect } from 'vitest'
import * as Module from '../../../../src/components/exceptions/ExceptionDetailPanel'

describe('ExceptionDetailPanel (smoke)', () => {
  it('exports the component', () => {
    expect(Module).toBeDefined()
  })
})
