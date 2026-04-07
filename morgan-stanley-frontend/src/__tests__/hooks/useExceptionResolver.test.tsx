import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExceptionResolver } from '../../hooks/useExceptionResolver';
import { exceptionService } from '../../lib/api/exceptionService';
import type { Exception } from '../../lib/api/types';

vi.mock('../../lib/api/exceptionService', () => ({
  exceptionService: {
    getExceptionById: vi.fn(),
    getSimilarExceptions: vi.fn(),
    getSolution: vi.fn(),
    generateSolution: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useExceptionResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads an open exception, searches similar exceptions, hydrates solution details, and clears selection on tab switch', async () => {
    const exception: Exception = {
      id: 7,
      trade_id: 10,
      trans_id: 20,
      status: 'PENDING',
      msg: 'Mismatch',
      create_time: '2024-01-01',
      comment: null,
      priority: 'HIGH',
      update_time: '2024-01-02',
    };

    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(exception);
    vi.mocked(exceptionService.getSimilarExceptions).mockResolvedValue({
      source_exception_id: '7',
      source_text: 'Mismatch',
      count: 1,
      similar_exceptions: [
        {
          exception_id: '100',
          trade_id: '200',
          similarity_score: 91,
          priority: 'HIGH',
          status: 'PENDING',
          asset_type: 'FX',
          clearing_house: 'LCH',
          exception_msg: 'Similar mismatch',
          text: 'text',
          explanation: 'explanation',
        },
      ],
    });
    vi.mocked(exceptionService.getSolution).mockResolvedValue({
      exception_id: 100,
      title: 'Solved',
      exception_description: 'Desc',
      solution_description: 'Fix it',
      scores: 9,
      id: 555,
      create_time: '2024-01-01',
    });

    const { result } = renderHook(() => useExceptionResolver('7'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.exception?.id).toBe(7));
    await waitFor(() => expect(result.current.aiSuggestions).toHaveLength(1));
    expect(result.current.aiSuggestions[0].solution_description).toBe('Fix it');

    result.current.handleSuggestionClick(result.current.aiSuggestions[0]);
    await waitFor(() => expect(result.current.selectedSuggestion?.exception_id).toBe('100'));

    result.current.setSelectedTab('new');
    await waitFor(() => expect(result.current.selectedSuggestion).toBeNull());
  });

  it('skips AI search for closed exceptions and supports retry after an error', async () => {
    const closedException: Exception = {
      id: 8,
      trade_id: 10,
      trans_id: 20,
      status: 'CLOSED',
      msg: 'Closed',
      create_time: '2024-01-01',
      comment: null,
      priority: 'LOW',
      update_time: '2024-01-02',
    };

    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(closedException);

    const { result } = renderHook(() => useExceptionResolver('8'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.exception?.status).toBe('CLOSED'));
    expect(exceptionService.getSimilarExceptions).not.toHaveBeenCalled();

    vi.mocked(exceptionService.getExceptionById).mockResolvedValue({ ...closedException, id: 9, status: 'PENDING' });
    vi.mocked(exceptionService.getSimilarExceptions)
      .mockRejectedValueOnce(new Error('validation error'))
      .mockResolvedValueOnce({
        source_exception_id: '9',
        source_text: 'Mismatch',
        count: 0,
        similar_exceptions: [],
      });

    const retryHook = renderHook(() => useExceptionResolver('9'), { wrapper: createWrapper() });
    await waitFor(() => expect(retryHook.result.current.error).toMatch(/validation error/i));

    retryHook.result.current.retryAISearch();
    await waitFor(() => expect(exceptionService.getSimilarExceptions).toHaveBeenCalledTimes(2));
  });

  it('returns early when handleAISearch receives a CLOSED exception explicitly', async () => {
    const exception: Exception = {
      id: 12,
      trade_id: 10,
      trans_id: 20,
      status: 'PENDING',
      msg: 'Mismatch',
      create_time: '2024-01-01',
      comment: null,
      priority: 'HIGH',
      update_time: '2024-01-02',
    };

    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(exception);

    const { result } = renderHook(() => useExceptionResolver('12'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.exception?.id).toBe(12));

    await result.current.handleAISearch({ ...exception, status: 'CLOSED' });

    expect(exceptionService.getSimilarExceptions).toHaveBeenCalledTimes(1);
  });

  it('sets error state when exception loading fails', async () => {
    vi.mocked(exceptionService.getExceptionById).mockRejectedValue(new Error('load failed'));

    const { result } = renderHook(() => useExceptionResolver('404'), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.exception).toBeNull();
      expect(result.current.error).toMatch(/failed to load exception details/i);
    });
  });

  it('maps trade_id AI-search errors to data-format message', async () => {
    const exception: Exception = {
      id: 13,
      trade_id: 10,
      trans_id: 20,
      status: 'PENDING',
      msg: 'Mismatch',
      create_time: '2024-01-01',
      comment: null,
      priority: 'HIGH',
      update_time: '2024-01-02',
    };

    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(exception);
    vi.mocked(exceptionService.getSimilarExceptions).mockRejectedValue(new Error('trade_id field missing'));

    const { result } = renderHook(() => useExceptionResolver('13'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.exception?.id).toBe(13));
    await waitFor(() => expect(result.current.error).toMatch(/data format error/i));
  });

  it('formats generated solution fallback, supports query filtering, and copies generated text', async () => {
    const exception: Exception = {
      id: 14,
      trade_id: 10,
      trans_id: 20,
      status: 'PENDING',
      msg: 'Mismatch',
      create_time: '2024-01-01',
      comment: null,
      priority: 'HIGH',
      update_time: '2024-01-02',
    };

    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } } as unknown as Navigator);

    vi.mocked(exceptionService.getExceptionById).mockResolvedValue(exception);
    vi.mocked(exceptionService.getSimilarExceptions).mockResolvedValue({
      source_exception_id: '14',
      source_text: 'Mismatch',
      count: 1,
      similar_exceptions: [
        {
          exception_id: '101',
          trade_id: '201',
          similarity_score: 88,
          priority: 'HIGH',
          status: 'PENDING',
          asset_type: 'FX',
          clearing_house: 'LCH',
          exception_msg: 'Alpha issue',
          text: 'alpha details',
          explanation: 'alpha explanation',
        },
      ],
    });
    vi.mocked(exceptionService.getSolution).mockResolvedValue({
      exception_id: 101,
      title: 'Alpha',
      exception_description: 'Alpha exception',
      solution_description: 'Alpha fix',
      scores: 5,
      id: 701,
      create_time: '2024-01-01',
    });

    vi.mocked(exceptionService.generateSolution).mockResolvedValue({
      generated_solution: {
        root_cause_analysis: 'Cause A',
        recommended_resolution_steps: '',
        risk_considerations: 'Risk A',
      },
      historical_cases: [],
    } as never);

    const { result } = renderHook(() => useExceptionResolver('14'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.aiSuggestions).toHaveLength(1));

    act(() => {
      result.current.setSearchQuery('ALPHA');
    });
    expect(result.current.filteredSuggestions).toHaveLength(1);

    await act(async () => {
      await result.current.handleGenerateAISolution();
    });
    expect(result.current.aiGeneratedSolution).toContain('Cause A');
    expect(result.current.aiGeneratedSolution).toContain('RISK CONSIDERATIONS');

    act(() => {
      result.current.handleCopyToDescription();
    });
    expect(result.current.newSolutionDescription).toContain('Cause A');

    await act(async () => {
      await result.current.handleCopyToClipboard();
    });
    expect(writeText).toHaveBeenCalled();
  });
});