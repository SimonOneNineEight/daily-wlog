import { act, renderHook } from '@testing-library/react-native';

import { useHideOnScroll } from './useHideOnScroll';

// The handlers only ever fire; none of them reads the event.
const event = undefined as never;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

it('starts visible', () => {
  const { result } = renderHook(() => useHideOnScroll());
  expect(result.current.visible).toBe(true);
});

it('hides while a drag is in progress', () => {
  const { result } = renderHook(() => useHideOnScroll());

  act(() => result.current.scrollHandlers.onScrollBeginDrag?.(event));
  expect(result.current.visible).toBe(false);
});

it('returns after a drag that ends with no momentum', () => {
  const { result } = renderHook(() => useHideOnScroll());

  act(() => result.current.scrollHandlers.onScrollBeginDrag?.(event));
  act(() => result.current.scrollHandlers.onScrollEndDrag?.(event));
  // Nothing yet: momentum may still be about to start.
  expect(result.current.visible).toBe(false);

  act(() => jest.runAllTimers());
  expect(result.current.visible).toBe(true);
});

it('stays hidden when momentum follows the release, and returns when it stops', () => {
  const { result } = renderHook(() => useHideOnScroll());

  act(() => result.current.scrollHandlers.onScrollBeginDrag?.(event));
  act(() => result.current.scrollHandlers.onScrollEndDrag?.(event));
  // Momentum starts before the settle fires, so the controls never flash back.
  act(() => result.current.scrollHandlers.onMomentumScrollBegin?.(event));
  act(() => jest.runAllTimers());
  expect(result.current.visible).toBe(false);

  act(() => result.current.scrollHandlers.onMomentumScrollEnd?.(event));
  expect(result.current.visible).toBe(true);
});

it('drops a pending settle when it unmounts', () => {
  const { result, unmount } = renderHook(() => useHideOnScroll());

  act(() => result.current.scrollHandlers.onScrollEndDrag?.(event));
  unmount();
  // A settle firing after unmount would set state on a dead hook.
  expect(() => act(() => jest.runAllTimers())).not.toThrow();
});
