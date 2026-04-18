type PageLoadingProps = {
  /** Visible message (default matches app copy). */
  message?: string;
  /** Use inline element for toolbar / tight layouts. */
  inline?: boolean;
  /** Override default `data-testid="page-loading"`. */
  dataTestId?: string;
};

export function PageLoading({
  message = "Loading…",
  inline = false,
  dataTestId = "page-loading"
}: PageLoadingProps) {
  const className = inline ? "page-loading page-loading--inline" : "page-loading";
  if (inline) {
    return (
      <span className={className} role="status" aria-live="polite" data-testid={dataTestId}>
        {message}
      </span>
    );
  }
  return (
    <p className={className} role="status" aria-live="polite" data-testid={dataTestId}>
      {message}
    </p>
  );
}
