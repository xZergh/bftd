import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

// A textarea that grows to fit its content instead of scrolling inside a fixed `rows` box.
//
// Why this exists: description and manual-step fields hold multi-line prose (our Figma-derived
// requirements are 3+ lines). With a fixed `rows`, the reader sees a scrollbar and two visible
// lines, which is the single biggest readability problem on those screens. Growing to content
// up to `maxRows`, then scrolling, keeps long content bounded without hiding short content.

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> & {
  /** Minimum visible lines before any content. */
  minRows?: number;
  /** Cap after which the field scrolls rather than growing further. */
  maxRows?: number;
};

export function AutoGrowTextarea({ minRows = 2, maxRows = 14, value, className, ...rest }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Layout effect, not effect: resize before paint so the field never flashes at the wrong
  // height on mount or when switching between requirements.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Read the resolved line-height rather than assuming a number — it comes from
    // --tcms-line-height-body and would silently drift if that token changed.
    const styles = window.getComputedStyle(el);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const vertical =
      parseFloat(styles.paddingTop) +
      parseFloat(styles.paddingBottom) +
      parseFloat(styles.borderTopWidth) +
      parseFloat(styles.borderBottomWidth);

    // Collapse first so scrollHeight reflects content, not the previous (larger) height.
    el.style.height = "auto";
    const contentHeight = el.scrollHeight;
    const min = minRows * lineHeight + vertical;
    const max = maxRows * lineHeight + vertical;

    const next = Math.min(Math.max(contentHeight, min), max);
    el.style.height = `${next}px`;
    el.style.overflowY = contentHeight > max ? "auto" : "hidden";
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      className={["autogrow-textarea", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
