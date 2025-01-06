import { useState, useEffect } from 'react';
import { setItem, getItem } from '../utils/localStorage';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return getItem(key) ?? initialValue;
  });

  useEffect(() => {
    setItem(key, storedValue);
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

