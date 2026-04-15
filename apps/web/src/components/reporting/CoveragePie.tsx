type CoveragePieProps = {
  numerator: number;
  denominator: number;
  /** Accessible label, e.g. "3 of 5 covered" */
  label: string;
};

/**
 * Small donut-style coverage indicator using conic-gradient (no chart deps).
 */
export function CoveragePie({ numerator, denominator, label }: CoveragePieProps) {
  const safeDen = Math.max(0, denominator);
  const safeNum = Math.min(Math.max(0, numerator), safeDen);
  const angleDeg = safeDen === 0 ? 0 : (safeNum / safeDen) * 360;

  const background =
    safeDen === 0
      ? "var(--coverage-pie-empty)"
      : `conic-gradient(
          var(--coverage-pie-fill) 0deg ${angleDeg}deg,
          var(--coverage-pie-rest) ${angleDeg}deg 360deg
        )`;

  return (
    <div
      className="coverage-pie"
      style={{ background }}
      role="img"
      aria-label={label}
      data-testid="kpi-coverage-pie"
    />
  );
}
