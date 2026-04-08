/**
 * Shared plotting utilities for D3-based visualization components.
 *
 * These helpers abstract over patterns that recur across every two-panel
 * explorer in `src/components/viz/`:
 *  - Uniform x-sampling of a scalar function on a closed interval.
 *  - Computing a safe y-axis maximum from one or more sample arrays,
 *    skipping non-finite values and applying a padding factor.
 *
 * Extracted during the Topic 27 code review (PR #27) to consolidate
 * seven copies of the same sampling loop across the four Lp viz components.
 */

/** A sampled point on a 1D curve: [x, y]. */
export type Point2D = [number, number];

/**
 * Sample `f` at `count` uniformly-spaced x-values across `[a, b]` (inclusive
 * of both endpoints), producing an array of `[x, f(x)]` tuples suitable for
 * a `d3.line<Point2D>()` generator.
 *
 * Non-finite y-values are preserved as-is — the consumer's `d3.line().defined()`
 * callback is the right place to filter them, so the x-coordinate still lines
 * up with the sampling grid. Using `count = 1` produces a single point at `a`;
 * using `count < 1` returns an empty array.
 *
 * @param f — the function to sample
 * @param domain — `[a, b]`, the closed interval to sample over
 * @param count — number of sample points (default 250; the same density the
 *   Topic 26 viz components use)
 */
export function sampleCurve(
  f: (x: number) => number,
  domain: [number, number],
  count: number = 250,
): Point2D[] {
  if (count < 1) return [];
  if (count === 1) return [[domain[0], f(domain[0])]];
  const [a, b] = domain;
  const pts: Point2D[] = [];
  const step = (b - a) / (count - 1);
  for (let i = 0; i < count; i++) {
    const x = a + i * step;
    pts.push([x, f(x)]);
  }
  return pts;
}

/**
 * Compute a padded y-axis maximum from one or more sampled curves, skipping
 * non-finite values. Returns `max(floor, paddedMax)` where `paddedMax` is the
 * largest finite y across all input curves multiplied by `paddingFactor`.
 *
 * The `floor` ensures the axis domain never collapses to zero even when every
 * sampled point is zero (which can happen at p < 1 for some toggle states in
 * the Hölder/Minkowski explorer).
 *
 * @param curves — one or more sampled curves (arrays of [x, y] tuples)
 * @param floor — minimum allowed y-max (default 0.2)
 * @param paddingFactor — multiplicative headroom above the data (default 1.15)
 */
export function finiteYMax(
  curves: Point2D[][],
  floor: number = 0.2,
  paddingFactor: number = 1.15,
): number {
  let m = 0;
  for (const curve of curves) {
    for (const [, y] of curve) {
      if (Number.isFinite(y) && y > m) m = y;
    }
  }
  return Math.max(m * paddingFactor, floor);
}
