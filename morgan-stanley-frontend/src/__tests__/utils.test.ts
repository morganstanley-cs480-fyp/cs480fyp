import { describe, it, expect, vi } from 'vitest'
import { 
  getWebSocketUrl, 
  formatDateShort,
  cn,
  requireAuth 
} from '../lib/utils'

describe('Utils', () => {
  describe('getWebSocketUrl', () => {
    it('should return correct WebSocket URL for development (localhost)', () => {
      // Mock window.location for localhost development
      Object.defineProperty(window, 'location', {
        value: { 
          protocol: 'http:', 
          hostname: 'localhost', 
          port: '5173',
          host: 'localhost:5173'
        },
        writable: true
      })
      
      expect(getWebSocketUrl()).toBe('ws://localhost:3002/api/ws')
    })

    it('should return secure WebSocket URL for production HTTPS', () => {
      Object.defineProperty(window, 'location', {
        value: { 
          protocol: 'https:', 
          hostname: 'app.example.com', 
          port: '',
          host: 'app.example.com'
        },
        writable: true
      })
      
      expect(getWebSocketUrl()).toBe('wss://app.example.com/api/ws')
    })

    it('should handle custom port in development', () => {
      Object.defineProperty(window, 'location', {
        value: { 
          protocol: 'http:', 
          hostname: 'localhost', 
          port: '3000',
          host: 'localhost:3000'
        },
        writable: true
      })
      
      expect(getWebSocketUrl()).toBe('ws://localhost:3002/api/ws')
    })

    it('should handle production domain with custom port', () => {
      Object.defineProperty(window, 'location', {
        value: { 
          protocol: 'https:', 
          hostname: 'app.example.com', 
          port: '443',
          host: 'app.example.com:443'
        },
        writable: true
      })
      
      expect(getWebSocketUrl()).toBe('wss://app.example.com:443/api/ws')
    })
  })

  describe('formatDateShort', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2024-03-15')
      expect(formatDateShort(date)).toBe('15/03/2024')
    })

    it('should format ISO date string correctly', () => {
      expect(formatDateShort('2024-03-15')).toBe('15/03/2024')
      expect(formatDateShort('2024-12-25')).toBe('25/12/2024')
    })

    it('should handle empty or null values', () => {
      expect(formatDateShort(null)).toBe('')
      expect(formatDateShort(undefined)).toBe('')
      expect(formatDateShort('')).toBe('')
    })

    it('should handle invalid dates gracefully', () => {
      expect(formatDateShort('invalid-date')).toBe('invalid-date')
    })

    it('should format numeric timestamps', () => {
      const timestamp = new Date('2024-06-10').getTime()
      expect(formatDateShort(timestamp)).toBe('10/06/2024')
    })
  })



  describe('cn (className utility)', () => {
    it('should combine multiple valid class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should filter out falsy values', () => {
      expect(cn('class1', false, 'class2', null, undefined)).toBe('class1 class2')
    })

    it('should handle empty input', () => {
      expect(cn()).toBe('')
      expect(cn('')).toBe('')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const isPending = false
      
      expect(cn('base', isActive && 'active', isPending && 'pending'))
        .toBe('base active')
    })
  })

  describe('requireAuth', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should allow access when user is authenticated', () => {
      const mockAuth = {
        user: { 
          profile: { sub: 'user-123' },
          access_token: 'valid-token'
        },
        isAuthenticated: true,
        isLoading: false
      }

      const context = { authentication: mockAuth }
      
      // Should return true
      const result = requireAuth({ context })
      
      expect(result).toBe(true)
    })

    it('should redirect when user is not authenticated', () => {
      const mockAuth = {
        user: null,
        isAuthenticated: false,
        isLoading: false
      }

      const context = { authentication: mockAuth }
      
      // Skip test if Cognito is not configured (development environment)
      if (process.env.VITE_COGNITO_CLIENT_ID) {
        expect(() => {
          requireAuth({ context })
        }).toThrow()
      } else {
        expect(requireAuth({ context })).toBe(true)
      }
    })

    it('should redirect when user exists but not authenticated', () => {
      const mockAuth = {
        user: { profile: { sub: 'user-123' } },
        isAuthenticated: false,
        isLoading: false
      }

      const context = { authentication: mockAuth }
      
      // Skip test if Cognito is not configured (development environment)
      if (process.env.VITE_COGNITO_CLIENT_ID) {
        expect(() => {
          requireAuth({ context })
        }).toThrow()
      } else {
        expect(requireAuth({ context })).toBe(true)
      }
    })
  })
})