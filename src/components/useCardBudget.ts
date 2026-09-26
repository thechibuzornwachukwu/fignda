import { useCallback, useState } from 'react';

/**
 * Char budget scale per card layout. ShareCard reports text that still overflows at 38px;
 * the budget then drops 15% so the text moves onto more pages. Floor 0.3.
 */
export function useCardBudget(key: string): readonly [number, () => void] {
  const [scales, setScales] = useState<Record<string, number>>({});
  const onOverflow = useCallback(
    () =>
      setScales((m) => {
        const now = m[key] ?? 1;
        return now <= 0.3 ? m : { ...m, [key]: Math.max(0.3, now * 0.85) };
      }),
    [key],
  );
  return [scales[key] ?? 1, onOverflow] as const;
}
