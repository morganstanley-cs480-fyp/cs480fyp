import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTradeWebSocket } from '../../hooks/useTradeWebSocket'
import type { Transaction, Exception } from '../../lib/api/types'
import { toast } from 'sonner'

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
  static instances: MockWebSocket[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  url: string = ''

  emitOpen() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.(new Event('open'))
  }

  emitClose() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: typeof payload === 'string' ? payload : JSON.stringify(payload) } as MessageEvent<string>)
  }

  emitError() {
    this.onerror?.(new Event('error'))
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

describe('useTradeWebSocket', () => {
  const EMPTY_TRANSACTIONS: Transaction[] = []
  const EMPTY_EXCEPTIONS: Exception[] = []

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

  const ONE_TRANSACTION: Transaction[] = [mockTransaction]
  const ONE_EXCEPTION: Exception[] = [mockException]

  beforeEach(() => {
    vi.clearAllMocks()
    MockWebSocket.instances = []
  })

  afterEach(() => {
    for (const socket of MockWebSocket.instances) {
      socket.close()
    }
    vi.restoreAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should not connect when tradeId is null', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS)
      )

      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionStatus).toBe('Disconnected')
    })

    it('should initialize with provided initial transactions', () => {
      const initialTransactions = [mockTransaction]
      const { result } = renderHook(() => 
        useTradeWebSocket(null, initialTransactions, EMPTY_EXCEPTIONS)  // Use null tradeId to avoid connection
      )

      expect(result.current.mergedTransactions).toEqual(initialTransactions)
    })

    it('should initialize with provided initial exceptions', () => {
      const initialExceptions = [mockException]
      const { result } = renderHook(() => 
        useTradeWebSocket(null, EMPTY_TRANSACTIONS, initialExceptions)  // Use null tradeId to avoid connection
      )

      expect(result.current.mergedExceptions).toEqual(initialExceptions)
    })

    it('should provide required functions', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS)  // Use null tradeId to avoid connection
      )

      expect(typeof result.current.disconnect).toBe('function')
      expect(typeof result.current.forceRefresh).toBe('function')
    })

    it('should provide complete interface', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, ONE_TRANSACTION, ONE_EXCEPTION)  // Use null tradeId
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
        useTradeWebSocket(null, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS)
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
        useTradeWebSocket(null, ONE_TRANSACTION, ONE_EXCEPTION)
      )

      expect(result.current.mergedTransactions).toEqual([mockTransaction])
      expect(result.current.mergedExceptions).toEqual([mockException])
    })

    it('should handle empty arrays gracefully', () => {
      const { result } = renderHook(() => 
        useTradeWebSocket(null, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS)
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
        useTradeWebSocket(null, transactions, EMPTY_EXCEPTIONS)
      )

      expect(result.current.mergedTransactions).toHaveLength(2)
    })

    it('should handle multiple exceptions', () => {
      const exceptions = [
        mockException,
        { ...mockException, id: 2, trans_id: 2 }
      ]
      
      const { result } = renderHook(() => 
        useTradeWebSocket(null, EMPTY_TRANSACTIONS, exceptions)
      )

      expect(result.current.mergedExceptions).toHaveLength(2)
    })
  })

  describe('WebSocket lifecycle and updates', () => {
    it('connects and sends SUBSCRIBE when tradeId is provided', () => {
      renderHook(() => useTradeWebSocket(123, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS))

      const socket = MockWebSocket.instances[0]
      expect(socket).toBeDefined()

      act(() => {
        socket.emitOpen()
      })

      expect(socket.send).toHaveBeenCalledWith(
        JSON.stringify({ action: 'SUBSCRIBE', trade_id: 123 })
      )
    })

    it('updates connection status on open/error/close', () => {
      const { result } = renderHook(() => useTradeWebSocket(123, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS))
      const socket = MockWebSocket.instances[0]

      expect(result.current.connectionStatus).toBe('Connecting...')

      act(() => {
        socket.emitOpen()
      })
      expect(result.current.connectionStatus).toBe('Connected')
      expect(result.current.isConnected).toBe(true)

      act(() => {
        socket.emitError()
      })
      expect(result.current.connectionStatus).toBe('Error')

      act(() => {
        socket.emitClose()
      })
      expect(result.current.connectionStatus).toBe('Disconnected')
      expect(result.current.isConnected).toBe(false)
    })

    it('adds new transaction and sorts by step', () => {
      const initial = [
        { ...mockTransaction, id: 10, step: 2 },
      ] as Transaction[]
      const { result } = renderHook(() => useTradeWebSocket(123, initial, EMPTY_EXCEPTIONS))
      const socket = MockWebSocket.instances[0]

      act(() => {
        socket.emitMessage({ ...mockTransaction, id: 11, step: 1, trans_id: undefined })
      })

      expect(result.current.lastUpdate?.id).toBe(11)
      expect(result.current.mergedTransactions.map((t) => t.id)).toEqual([11, 10])
    })

    it('updates existing transaction when id already exists', () => {
      const initial = [{ ...mockTransaction, id: 1, status: 'PENDING', step: 1 }] as Transaction[]
      const { result } = renderHook(() => useTradeWebSocket(123, initial, EMPTY_EXCEPTIONS))
      const socket = MockWebSocket.instances[0]

      act(() => {
        socket.emitMessage({ ...mockTransaction, id: 1, status: 'ALLEGED', step: 1, trans_id: undefined })
      })

      expect(result.current.mergedTransactions[0].status).toBe('ALLEGED')
    })

    it('marks related exceptions CLOSED when transaction status is CLEARED', () => {
      const exceptions = [
        { ...mockException, id: 201, trans_id: 1, status: 'PENDING' },
        { ...mockException, id: 202, trans_id: 999, status: 'PENDING' },
      ] as Exception[]
      const { result } = renderHook(() => useTradeWebSocket(123, ONE_TRANSACTION, exceptions))
      const socket = MockWebSocket.instances[0]

      act(() => {
        socket.emitMessage({ ...mockTransaction, id: 1, status: 'CLEARED', trans_id: undefined })
      })

      expect(result.current.mergedExceptions.find((e) => e.id === 201)?.status).toBe('CLOSED')
      expect(result.current.mergedExceptions.find((e) => e.id === 202)?.status).toBe('PENDING')
    })

    it('adds and updates exceptions from incoming exception messages', () => {
      const { result } = renderHook(() => useTradeWebSocket(123, ONE_TRANSACTION, EMPTY_EXCEPTIONS))
      const socket = MockWebSocket.instances[0]

      act(() => {
        socket.emitMessage({ ...mockException, id: 300, trans_id: 1 })
      })
      expect(result.current.lastExceptionUpdate?.id).toBe(300)
      expect(result.current.mergedExceptions).toHaveLength(1)

      act(() => {
        socket.emitMessage({ ...mockException, id: 300, trans_id: 1, status: 'CLOSED' })
      })
      expect(result.current.mergedExceptions[0].status).toBe('CLOSED')
    })

    it('handles invalid JSON payload safely', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      renderHook(() => useTradeWebSocket(123, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS))
      const socket = MockWebSocket.instances[0]

      act(() => {
        socket.emitMessage('{not-valid-json')
      })

      expect(consoleSpy).toHaveBeenCalledWith('Invalid JSON received:', expect.anything())
      consoleSpy.mockRestore()
    })

    it('disconnect closes websocket and resets status', () => {
      const { result } = renderHook(() => useTradeWebSocket(123, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS))
      const socket = MockWebSocket.instances[0]

      act(() => {
        result.current.disconnect()
      })

      expect(socket.close).toHaveBeenCalled()
      expect(result.current.connectionStatus).toBe('Disconnected')
      expect(result.current.isConnected).toBe(false)
    })

    it('forceRefresh closes active websocket', () => {
      const { result } = renderHook(() => useTradeWebSocket(123, EMPTY_TRANSACTIONS, EMPTY_EXCEPTIONS))
      const socket = MockWebSocket.instances[0]

      act(() => {
        result.current.forceRefresh()
      })

      expect(socket.close).toHaveBeenCalled()
    })

    it('emits toasts for transaction and exception updates', () => {
      vi.useFakeTimers()

      renderHook(() => useTradeWebSocket(123, ONE_TRANSACTION, ONE_EXCEPTION))
      const socket = MockWebSocket.instances[0]

      act(() => {
        socket.emitMessage({ ...mockTransaction, id: 1, status: 'ALLEGED', trans_id: undefined })
        socket.emitMessage({ ...mockException, id: 1, trans_id: 1, status: 'CLOSED' })
      })

      act(() => {
        vi.runAllTimers()
      })

      expect(toast).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })
})
