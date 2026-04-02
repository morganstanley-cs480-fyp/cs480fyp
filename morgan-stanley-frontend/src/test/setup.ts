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
  ResizeObserver?: typeof ResizeObserver;
  IntersectionObserver?: typeof IntersectionObserver;
};

// Mock ResizeObserver with a real constructor shape (required by Radix/Floating UI)
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

// Mock IntersectionObserver with a real constructor shape
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

(globalThis as GlobalObserverOverrides).ResizeObserver =
  MockResizeObserver as unknown as typeof ResizeObserver;

(globalThis as GlobalObserverOverrides).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;