import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useExceptionResolver } from '../../hooks/useExceptionResolver'

// Mock the exception service
vi.mock('../../lib/api/exceptionService', () => ({
  exceptionService: {
    getExceptionById: vi.fn(),
    getSimilarExceptions: vi.fn(),
    generateSolution: vi.fn(),
    getSolution: vi.fn()
  }
}))

import { exceptionService } from '../../lib/api/exceptionService'

describe('useExceptionResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads exception and skips AI search for CLOSED status', async () => {
    const closedException = { id: 1, status: 'CLOSED' }
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(closedException as any)

    const { result } = renderHook(() => useExceptionResolver('1'))

    await waitFor(() => {
      expect(result.current.exception).toEqual(closedException)
    })

    expect(exceptionService.getSimilarExceptions).not.toHaveBeenCalled()
  })

  it('performs AI search and converts similar exceptions', async () => {
    const openException = { id: 2, status: 'OPEN' }
    const similar = {
      exception_id: 10,
      exception_msg: 'Test error',
      similarity_score: 87.2,
      trade_id: 42,
      priority: 1,
      status: 'OPEN',
      asset_type: 'EQ',
      clearing_house: 'CHX',
      explanation: 'Explained',
      text: 'details'
    }

    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException as any)
    vi.mocked(exceptionService.getSimilarExceptions).mockResolvedValue({ similar_exceptions: [similar] } as any)

    const { result } = renderHook(() => useExceptionResolver('2'))

    await waitFor(() => {
      expect(result.current.exception).toEqual(openException)
    })

    await waitFor(() => {
      expect(result.current.aiSuggestions).toHaveLength(1)
      const s = result.current.aiSuggestions[0]
      expect(s.title).toBe(similar.exception_msg)
      expect(s.exception_id).toBe(similar.exception_id.toString())
      expect(s.trade_id).toBe(similar.trade_id.toString())
      expect(s.confidence).toBe(Math.round(similar.similarity_score))
    })
  })

  it('generates AI solution and sets historical cases', async () => {
    const openException = { id: 3, status: 'OPEN' }
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException as any)

    const generated = {
      generated_solution: {
        recommended_resolution_steps: 'Do these steps',
        root_cause_analysis: 'root'
      },
      historical_cases: [{ id: 'h1', summary: 'case1' }]
    }

    vi.mocked(exceptionService.generateSolution).mockResolvedValue(generated as any)

    const { result } = renderHook(() => useExceptionResolver('3'))

    // wait for exception load
    await waitFor(() => expect(result.current.exception).toEqual(openException))

    await act(async () => {
      await result.current.handleGenerateAISolution()
    })

    expect(result.current.aiGeneratedSolution).toContain('Do these steps')
    expect(result.current.historicalCases).toHaveLength(1)
  })

  it('fetches solution details when suggestion clicked', async () => {
    const openException = { id: 4, status: 'OPEN' }
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException as any)

    // prepare initial suggestion without solution details
    const initialSuggestion = {
      title: 'Sugg',
      description: 'desc',
      confidence: 80,
      exception_id: '10',
      trade_id: '42'
    }

    const solutionDetails = {
      solution_description: 'sol',
      exception_description: 'exc',
      scores: { relevance: 0.9 }
    }

    vi.mocked(exceptionService.getSimilarExceptions).mockResolvedValue({ similar_exceptions: [] } as any)
    vi.mocked(exceptionService.getSolution).mockResolvedValue(solutionDetails as any)

    const { result } = renderHook(() => useExceptionResolver('4'))

    // Manually seed aiSuggestions to simulate prior search
    act(() => {
      result.current.aiSuggestions.push(initialSuggestion as any)
    })

    await act(async () => {
      await result.current.handleSuggestionClick(initialSuggestion as any)
    })

    expect(exceptionService.getSolution).toHaveBeenCalledWith(initialSuggestion.exception_id)
    expect(result.current.selectedSuggestion?.solution_description).toBe('sol')
  })
})
