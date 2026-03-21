import '@testing-library/jest-dom'
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

type ObserverMockInstance = {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

type GlobalObserverOverrides = typeof globalThis & {
  ResizeObserver?: ReturnType<typeof vi.fn>;
  IntersectionObserver?: ReturnType<typeof vi.fn>;
};

// Mock ResizeObserver
(globalThis as GlobalObserverOverrides).ResizeObserver = vi
  .fn()
  .mockImplementation((): ObserverMockInstance => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

// Mock IntersectionObserver
(globalThis as GlobalObserverOverrides).IntersectionObserver = vi
  .fn()
  .mockImplementation((): ObserverMockInstance => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));