import { Paragraph } from "tamagui";

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
  if (inline) {
    return (
      <span role="status" aria-live="polite" data-testid={dataTestId} style={{ fontSize: "0.95rem", color: "#52525b" }}>
        {message}
      </span>
    );
  }
  return (
    <Paragraph role="status" aria-live="polite" data-testid={dataTestId} margin={0} size="$3" color="$color10">
      {message}
    </Paragraph>
  );
}
