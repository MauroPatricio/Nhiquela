// hooks/useThrottle.js
import { useRef, useCallback } from 'react';

const useThrottle = (callback, delay) => {
  const lastCall = useRef(0);
  const timeoutRef = useRef(null);

  const throttledCallback = useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall.current;

    if (timeSinceLastCall >= delay) {
      lastCall.current = now;
      callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);

  return throttledCallback;
};

export default useThrottle;