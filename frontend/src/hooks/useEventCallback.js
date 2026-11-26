import { useCallback, useLayoutEffect, useRef } from 'react';

// Browser subscriptions keep one callback identity while reading the latest committed state.
export function useEventCallback(callback) {
  const latest = useRef(callback);
  useLayoutEffect(() => { latest.current = callback; });
  return useCallback((...args) => latest.current(...args), []);
}
