import { useCallback, useEffect, useRef } from "react";

export const AUTOSAVE_DEBOUNCE_MS = 1000;

/**
 * Schedules `onFire` after idle time when `shouldSchedule` is true.
 * Resets the timer when `resetKey` changes (e.g. serialized draft fields).
 * Returns `cancelPending` — call before a manual save so the debounced run does not duplicate it.
 */
export function useDebouncedAutosaveEffect(
  shouldSchedule: boolean,
  resetKey: string,
  onFire: () => void,
  debounceMs: number = AUTOSAVE_DEBOUNCE_MS
): () => void {
  const onFireRef = useRef(onFire);
  onFireRef.current = onFire;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPending = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    cancelPending();
    if (!shouldSchedule) {
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onFireRef.current();
    }, debounceMs);
    return cancelPending;
  }, [shouldSchedule, resetKey, cancelPending, debounceMs]);

  return cancelPending;
}
