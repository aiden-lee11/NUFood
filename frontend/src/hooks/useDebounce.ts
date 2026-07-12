import { useEffect, useState } from "react";

// Debounce a value: only updates the returned value after `delay` ms have
// elapsed without the input changing. Shared by the planner and item searches.
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
