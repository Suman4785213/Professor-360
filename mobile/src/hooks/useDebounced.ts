import { useEffect, useState } from "react";
export function useDebounced(value: string) {
  const [result, set] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => set(value), 350);
    return () => clearTimeout(timer);
  }, [value]);
  return result;
}
