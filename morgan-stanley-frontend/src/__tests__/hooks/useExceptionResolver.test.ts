import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useExceptionResolver } from '../../hooks/useExceptionResolver'
import type { Exception } from '../../lib/api/types'

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
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    } as unknown as Navigator)
  })

  const asException = (value: Partial<Exception>): Exception => ({
    id: 0,
    trade_id: 0,
    trans_id: 0,
    status: 'PENDING',
    msg: '',
    create_time: '2024-01-01',
    comment: null,
    priority: 'LOW',
    update_time: '2024-01-01',
    ...value,
  })

  it('loads exception and skips AI search for CLOSED status', async () => {
    const closedException = asException({ id: 1, status: 'CLOSED' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(closedException)

    const { result } = renderHook(() => useExceptionResolver('1'))

    await waitFor(() => {
      expect(result.current.exception).toEqual(closedException)
    })

    expect(exceptionService.getSimilarExceptions).not.toHaveBeenCalled()
  })

  it('performs AI search and converts similar exceptions', async () => {
    const openException = asException({ id: 2, status: 'PENDING' })
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

    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)
    vi.mocked(exceptionService.getSimilarExceptions).mockResolvedValue({ similar_exceptions: [similar] } as never)

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
      expect(s.similarity_score).toBe(similar.similarity_score)
    })
  })

  it('generates AI solution and sets historical cases', async () => {
    const openException = asException({ id: 3, status: 'PENDING' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)

    const generated = {
      generated_solution: {
        recommended_resolution_steps: 'Do these steps',
        root_cause_analysis: 'root'
      },
      historical_cases: [{ id: 'h1', summary: 'case1' }]
    }

    vi.mocked(exceptionService.generateSolution).mockResolvedValue(generated as never)

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
    const openException = asException({ id: 4, status: 'PENDING' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)

    // prepare initial suggestion without solution details
    const initialSuggestion = {
      title: 'Sugg',
      description: 'desc',
      exception_id: '10',
      trade_id: '42'
    }

    const solutionDetails = {
      solution_description: 'sol',
      exception_description: 'exc',
      scores: { relevance: 0.9 }
    }

    vi.mocked(exceptionService.getSimilarExceptions).mockResolvedValue({ similar_exceptions: [] } as never)
    vi.mocked(exceptionService.getSolution).mockResolvedValue(solutionDetails as never)

    const { result } = renderHook(() => useExceptionResolver('4'))

    // Manually seed aiSuggestions to simulate prior search
    act(() => {
      result.current.setSelectedTab('existing')
    })

    vi.spyOn(exceptionService, 'getSimilarExceptions').mockResolvedValueOnce({ similar_exceptions: [
      {
        exception_id: 10,
        exception_msg: 'Sugg',
        similarity_score: 80,
        trade_id: 42,
        priority: 1,
        status: 'OPEN',
        asset_type: 'EQ',
        clearing_house: 'CHX',
        explanation: 'Explained',
        text: 'details',
      }
    ] } as never)

    await waitFor(() => expect(result.current.aiSuggestions).toHaveLength(1))

    await act(async () => {
      result.current.handleSuggestionClick(result.current.aiSuggestions[0])
    })

    expect(exceptionService.getSolution).toHaveBeenCalledWith(initialSuggestion.exception_id)
    expect(result.current.selectedSuggestion?.solution_description).toBe('sol')
  })

  it('skips AI search on CLOSED exception and clears selected suggestion when switching tabs', async () => {
    const closedException = asException({ id: 5, status: 'CLOSED' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(closedException)

    const { result } = renderHook(() => useExceptionResolver('5'))

    await waitFor(() => expect(result.current.exception).toEqual(closedException))
    expect(exceptionService.getSimilarExceptions).not.toHaveBeenCalled()

    act(() => {
      result.current.setSelectedTab('new')
    })

    await waitFor(() => {
      expect(result.current.selectedTab).toBe('new')
    })
  })

  it('sets error messages for AI search validation and trade_id failures, then retries', async () => {
    const openException = asException({ id: 6, status: 'PENDING' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)
    vi.mocked(exceptionService.getSimilarExceptions)
      .mockRejectedValueOnce(new Error('validation error: bad payload'))
      .mockRejectedValueOnce(new Error('trade_id missing'))
      .mockResolvedValueOnce({ similar_exceptions: [] } as never)

    const { result } = renderHook(() => useExceptionResolver('6'))

    await waitFor(() => expect(result.current.exception).toEqual(openException))

    await act(async () => {
      await result.current.handleAISearch()
    })
    await waitFor(() => expect(result.current.error).toMatch(/validation error/i))

    await act(async () => {
      await result.current.retryAISearch()
    })
    await waitFor(() => expect(result.current.error).toMatch(/data format error/i))

    await act(async () => {
      await result.current.retryAISearch()
    })
    await waitFor(() => expect(result.current.aiSuggestions).toHaveLength(0))
  })

  it('copies AI solution to description and clipboard', async () => {
    const openException = asException({ id: 7, status: 'PENDING' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)
    vi.mocked(exceptionService.generateSolution).mockResolvedValue({
      generated_solution: {
        recommended_resolution_steps: 'resolved',
        root_cause_analysis: 'root cause',
      },
      historical_cases: [],
    } as never)

    const { result } = renderHook(() => useExceptionResolver('7'))
    await waitFor(() => expect(result.current.exception).toEqual(openException))

    await act(async () => {
      await result.current.handleGenerateAISolution()
    })

    act(() => {
      result.current.handleCopyToDescription()
    })
    expect(result.current.newSolutionDescription).toBe('resolved')

    await act(async () => {
      await result.current.handleCopyToClipboard()
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('resolved')
  })

  it('skips duplicate AI search once the exception has already been queried', async () => {
    const openException = asException({ id: 8, status: 'PENDING' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)
    vi.mocked(exceptionService.getSimilarExceptions).mockResolvedValue({ similar_exceptions: [] } as never)

    const { result } = renderHook(() => useExceptionResolver('8'))

    await waitFor(() => expect(result.current.exception).toEqual(openException))
    expect(exceptionService.getSimilarExceptions).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.handleAISearch()
    })

    expect(exceptionService.getSimilarExceptions).toHaveBeenCalledTimes(1)
  })

  it('handles generate AI solution failure', async () => {
    const openException = asException({ id: 9, status: 'PENDING' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)
    vi.mocked(exceptionService.generateSolution).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useExceptionResolver('9'))
    await waitFor(() => expect(result.current.exception).toEqual(openException))

    await act(async () => {
      await result.current.handleGenerateAISolution()
    })

    expect(result.current.aiGeneratedSolution).toBe('')
    expect(result.current.historicalCases).toEqual([])
    expect(result.current.error).toMatch(/failed to generate ai solution/i)
  })

  it('keeps the selected suggestion when preloaded solution lookup fails', async () => {
    const openException = asException({ id: 10, status: 'PENDING' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)
    vi.mocked(exceptionService.getSimilarExceptions).mockResolvedValue({
      similar_exceptions: [
        {
          exception_id: 77,
          exception_msg: 'Needs details',
          similarity_score: 80,
          trade_id: 22,
          priority: 1,
          status: 'OPEN',
          asset_type: 'EQ',
          clearing_house: 'CHX',
          explanation: 'Explained',
          text: 'details',
        },
      ],
    } as never)
    vi.mocked(exceptionService.getSolution).mockRejectedValue(new Error('nope'))

    const { result } = renderHook(() => useExceptionResolver('10'))
    await waitFor(() => expect(result.current.exception).toEqual(openException))

    await waitFor(() => expect(result.current.aiSuggestions).toHaveLength(1))

    await act(async () => {
      result.current.handleSuggestionClick(result.current.aiSuggestions[0])
    })

    expect(result.current.selectedSuggestion?.exception_id).toBe('77')
    expect(result.current.loadingSolutionId).toBeNull()
  })

  it('swallows clipboard write failures without setting copied state', async () => {
    const openException = asException({ id: 11, status: 'PENDING' })
    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(openException)
    vi.mocked(exceptionService.generateSolution).mockResolvedValue({
      generated_solution: {
        recommended_resolution_steps: 'resolved',
        root_cause_analysis: 'root cause',
      },
      historical_cases: [],
    } as never)

    const { result } = renderHook(() => useExceptionResolver('11'))
    await waitFor(() => expect(result.current.exception).toEqual(openException))

    // Generate solution first with working clipboard
    await act(async () => {
      await result.current.handleGenerateAISolution()
    })
    
    expect(result.current.aiGeneratedSolution).toBe('resolved')

    // Now replace clipboard with failing version and try to copy
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard unavailable'))
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    } as unknown as Navigator)

    await act(async () => {
      await result.current.handleCopyToClipboard()
    })

    expect(writeText).toHaveBeenCalledWith('resolved')
    expect(result.current.copiedToClipboard).toBe(false)
  })
})
