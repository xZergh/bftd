import type { CSSProperties } from "react";
import { Link, type LinkProps } from "react-router-dom";

const baseStyle: CSSProperties = {
  color: "#2563eb",
  fontWeight: 500,
  textDecoration: "none"
};

/** Same-origin nav link (React Router) with stable styling for QA + E2E. */
export function RouterLink({ style, ...rest }: LinkProps) {
  const merged =
    style === undefined
      ? baseStyle
      : {
          ...baseStyle,
          ...(typeof style === "object" && style !== null && !Array.isArray(style) ? style : {})
        };
  return <Link {...rest} style={merged} />;
}
