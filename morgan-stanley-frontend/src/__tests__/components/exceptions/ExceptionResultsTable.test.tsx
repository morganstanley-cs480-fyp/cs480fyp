import { describe, it, expect } from 'vitest'
import * as Module from '../../../../src/components/exceptions/ExceptionResultsTable'

describe('ExceptionResultsTable (smoke)', () => {
  it('module loads', () => {
    expect(Module).toBeDefined()
  })
})
