import { useCallback, useEffect, useState } from "react";

const DEFAULT_PCT = 38;
const MIN_PX = 320;
const MAX_PX = 520;

export function usePersistedInspectorWidth(sectionKey: string) {
  const storageKey = `tcms.inspectorWidthPct.${sectionKey}`;

  const [widthPct, setWidthPctState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const n = raw !== null ? Number(raw) : DEFAULT_PCT;
      if (!Number.isFinite(n)) {
        return DEFAULT_PCT;
      }
      return Math.min(50, Math.max(25, n));
    } catch {
      return DEFAULT_PCT;
    }
  });

  const setWidthPct = useCallback(
    (next: number) => {
      const clamped = Math.min(50, Math.max(25, next));
      setWidthPctState(clamped);
      try {
        localStorage.setItem(storageKey, String(clamped));
      } catch {
        /* ignore quota / private mode */
      }
    },
    [storageKey]
  );

  return { widthPct, setWidthPct, minPx: MIN_PX, maxPx: MAX_PX };
}

/** Clamp inspector width in pixels from container width and persisted percent. */
export function inspectorWidthPx(containerWidth: number, widthPct: number): number {
  const raw = Math.round((containerWidth * widthPct) / 100);
  return Math.min(MAX_PX, Math.max(MIN_PX, raw));
}

export function useMeasureWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w !== undefined) {
        setWidth(w);
      }
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
