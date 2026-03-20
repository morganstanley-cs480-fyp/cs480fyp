import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTradeWebSocket } from '../hooks/useTradeWebSocket'
import type { Transaction, Exception } from '../lib/api/types'

// Mock toast
vi.mock('sonner', () => ({
  toast: vi.fn()
}))

// Simple WebSocket mock that won't hang
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  addEventListener = vi.fn()
  removeEventListener = vi.fn()
  close = vi.fn()
  send = vi.fn()
  readyState = MockWebSocket.CONNECTING
  CONNECTING = MockWebSocket.CONNECTING
  OPEN = MockWebSocket.OPEN
  CLOSING = MockWebSocket.CLOSING
  CLOSED = MockWebSocket.CLOSED

  // Support for event handlers
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    // Simple constructor that doesn't trigger any events
    this.url = url
  }

  url: string = ''
}

vi.stubGlobal('WebSocket', MockWebSocket)

describe('useTradeWebSocket', () => {
  const mockTransaction: Transaction = {
    id: 1,
    trade_id: 123,
    step: 1,
    status: 'PENDING',
    system_name: 'TEST_SYSTEM',
    description: 'Test transaction'
  }

  const mockException: Exception = {
    id: 1,
    trans_id: 1,
    exception_type: 'VALIDATION_ERROR',
    description: 'Test exception',
    status: 'ACTIVE'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should not connect when tradeId is null', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, [], [])
      )

      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionStatus).toBe('Disconnected')
    })

    it('should initialize with provided initial transactions', () => {
      const initialTransactions = [mockTransaction]
      const { result } = renderHook(() => 
        useTradeWebSocket(null, initialTransactions, [])  // Use null tradeId to avoid connection
      )

      expect(result.current.mergedTransactions).toEqual(initialTransactions)
    })

    it('should initialize with provided initial exceptions', () => {
      const initialExceptions = [mockException]
      const { result } = renderHook(() => 
        useTradeWebSocket(null, [], initialExceptions)  // Use null tradeId to avoid connection
      )

      expect(result.current.mergedExceptions).toEqual(initialExceptions)
    })

    it('should provide required functions', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, [], [])  // Use null tradeId to avoid connection
      )

      expect(typeof result.current.disconnect).toBe('function')
      expect(typeof result.current.forceRefresh).toBe('function')
    })

    it('should provide complete interface', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, [mockTransaction], [mockException])  // Use null tradeId
      )

      const expectedProperties = [
        'isConnected',
        'lastUpdate', 
        'lastExceptionUpdate',
        'connectionStatus',
        'mergedTransactions',
        'mergedExceptions',
        'disconnect',
        'forceRefresh'
      ]

      expectedProperties.forEach(prop => {
        expect(result.current).toHaveProperty(prop)
      })
    })

    it('should have correct initial state', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, [], [])
      )

      expect(result.current.isConnected).toBe(false)
      expect(result.current.lastUpdate).toBeNull()
      expect(result.current.lastExceptionUpdate).toBeNull()
      expect(result.current.connectionStatus).toBe('Disconnected')
      expect(result.current.mergedTransactions).toEqual([])
      expect(result.current.mergedExceptions).toEqual([])
    })

    it('should handle both transactions and exceptions together', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, [mockTransaction], [mockException])
      )

      expect(result.current.mergedTransactions).toEqual([mockTransaction])
      expect(result.current.mergedExceptions).toEqual([mockException])
    })

    it('should handle empty arrays gracefully', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, [], [])
      )

      expect(result.current.mergedTransactions).toEqual([])
      expect(result.current.mergedExceptions).toEqual([])
    })

    it('should handle multiple transactions', () => {
      const transactions = [
        mockTransaction,
        { ...mockTransaction, id: 2, trade_id: 124 }
      ]
      
      const { result } = renderHook(() => 
        useTradeWebSocket(null, transactions, [])
      )

      expect(result.current.mergedTransactions).toHaveLength(2)
    })

    it('should handle multiple exceptions', () => {
      const exceptions = [
        mockException,
        { ...mockException, id: 2, trans_id: 2 }
      ]
      
      const { result } = renderHook(() => 
        useTradeWebSocket(null, [], exceptions)
      )

      expect(result.current.mergedExceptions).toHaveLength(2)
    })
  })
})