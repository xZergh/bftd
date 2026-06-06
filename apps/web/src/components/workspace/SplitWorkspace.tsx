import { useCallback, useRef, type ReactNode } from "react";
import {
  inspectorWidthPx,
  useMeasureWidth,
  usePersistedInspectorWidth
} from "../../hooks/usePersistedInspectorWidth";

type Props = {
  sectionKey: string;
  main: ReactNode;
  inspector: ReactNode | null;
  "data-testid"?: string;
};

export function SplitWorkspace({ sectionKey, main, inspector, "data-testid": testId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useMeasureWidth(containerRef);
  const { widthPct, setWidthPct } = usePersistedInspectorWidth(sectionKey);
  const inspectorPx = inspector !== null ? inspectorWidthPx(containerWidth, widthPct) : 0;

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startPct = widthPct;
      const el = containerRef.current;
      if (!el) {
        return;
      }
      const total = el.getBoundingClientRect().width;

      const onMove = (ev: PointerEvent) => {
        const delta = startX - ev.clientX;
        const nextPx = inspectorWidthPx(total, startPct) + delta;
        setWidthPct((nextPx / total) * 100);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [setWidthPct, widthPct]
  );

  if (inspector === null) {
    return (
      <div className="split-workspace split-workspace--main-only" data-testid={testId} ref={containerRef}>
        {main}
      </div>
    );
  }

  return (
    <div className="split-workspace" data-testid={testId} ref={containerRef}>
      <div className="split-workspace-main">{main}</div>
      <div
        className="split-workspace-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize inspector"
        onPointerDown={onResizePointerDown}
        data-testid={`${testId ?? "split"}-resizer`}
      />
      <aside
        className="split-workspace-inspector"
        style={{ width: inspectorPx > 0 ? `${inspectorPx}px` : `${widthPct}%` }}
        data-testid={`${testId ?? "split"}-inspector`}
      >
        {inspector}
      </aside>
    </div>
  );
}
