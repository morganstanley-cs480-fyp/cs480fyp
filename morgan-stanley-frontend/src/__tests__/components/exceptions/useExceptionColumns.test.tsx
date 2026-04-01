import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExceptionColumns } from '@/components/exceptions/useExceptionColumns';
import React from 'react';

describe('useExceptionColumns', () => {
  it('returns the expected columns', () => {
    const mockOptions = {
      getPriorityColor: vi.fn().mockReturnValue('destructive'),
      getPriorityIcon: vi.fn().mockReturnValue(<span>Icon</span>),
      getStatusBadgeVariant: vi.fn().mockReturnValue('default'),
    };
    
    const { result } = renderHook(() => useExceptionColumns(mockOptions as any));
    
    expect(result.current).toBeDefined();
    expect(result.current.length).toBeGreaterThan(0);
    
    const columnIds = result.current.map((col: any) => col.id || col.accessorKey);
    expect(columnIds).toContain('id');
    expect(columnIds).toContain('trade_id');
    expect(columnIds).toContain('msg');
    expect(columnIds).toContain('priority');
    expect(columnIds).toContain('status');
    expect(columnIds).toContain('comment');
    expect(columnIds).toContain('create_time');
    expect(columnIds).toContain('update_time');
  });
});
