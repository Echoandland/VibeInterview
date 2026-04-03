import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { debounce, useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── useDebounce ─────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  it('returns the initial value immediately without waiting', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('does not update before the delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );
    rerender({ value: 'updated' });
    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe('initial');
  });

  it('updates to new value after the delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );
    rerender({ value: 'updated' });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe('updated');
  });

  it('resets timer on rapid value changes — only last value applies', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(300); });
    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(300); });
    // 300ms after 'c', timer not yet done
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(200); });
    // 500ms after 'c'
    expect(result.current).toBe('c');
  });

  it('works with number values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 42 });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(42);
  });

  it('works with null values', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string | null }) => useDebounce(value, 100),
      { initialProps: { value: 'hello' as string | null } }
    );
    rerender({ value: null });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBeNull();
  });
});

// ─── debounce (plain function) ────────────────────────────────────────────────

describe('debounce (function)', () => {
  it('does not call fn immediately', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);
    debouncedFn('arg');
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn after delay', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);
    debouncedFn('arg');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('arg');
  });

  it('cancels previous call on rapid invocations', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);
    debouncedFn('first');
    vi.advanceTimersByTime(100);
    debouncedFn('second');
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('passes all arguments to fn', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);
    debouncedFn('a', 'b', 'c');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledWith('a', 'b', 'c');
  });

  it('can be called again after the first fires', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);
    debouncedFn('first');
    vi.advanceTimersByTime(100);
    debouncedFn('second');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ─── useDebouncedCallback ─────────────────────────────────────────────────────

describe('useDebouncedCallback', () => {
  it('does not call fn immediately', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    const [debouncedFn] = result.current;
    act(() => { debouncedFn('arg'); });
    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn after delay', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    const [debouncedFn] = result.current;
    act(() => { debouncedFn('arg'); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(fn).toHaveBeenCalledOnce();
  });

  it('cancel() prevents pending call from firing', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    const [debouncedFn, cancel] = result.current;
    act(() => { debouncedFn('arg'); });
    act(() => { cancel(); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(fn).not.toHaveBeenCalled();
  });

  it('rapid calls only fire once after delay', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 300));
    const [debouncedFn] = result.current;
    act(() => {
      debouncedFn('a');
      debouncedFn('b');
      debouncedFn('c');
    });
    act(() => { vi.advanceTimersByTime(300); });
    expect(fn).toHaveBeenCalledOnce();
  });

  it('cancels pending call on unmount', () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 300));
    const [debouncedFn] = result.current;
    act(() => { debouncedFn('arg'); });
    unmount();
    act(() => { vi.advanceTimersByTime(300); });
    expect(fn).not.toHaveBeenCalled();
  });
});
