/**
 * Shared utility module for Riemann integration and numerical quadrature.
 * Created by Topic 7 (riemann-integral), to be extended by Topic 8
 * (improper-integrals) and Track 4 topics (multiple-integrals, change-of-variables).
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides:
 *  - Partition creation and refinement
 *  - Riemann sum computation (left, right, midpoint, trapezoidal, Simpson)
 *  - Upper and lower Darboux sum computation
 *  - Simpson's rule with even-n enforcement
 *  - Adaptive quadrature (recursive bisection)
 *  - Area function F(x) = integral from a to x of f(t) dt
 *  - Quadrature convergence data for error-vs-n plots
 */

// Re-export seededRandom for downstream consumers
export { seededRandom } from './limits';

// ── Interfaces ──────────────────────────────────────────────

/** A partition of [a, b] with precomputed metadata. */
export interface IntegrationPartition {
  /** Ordered partition points: [x_0, x_1, ..., x_n] with x_0 = a, x_n = b */
  points: number[];
  /** Number of subintervals */
  n: number;
  /** Mesh (norm) of the partition: max(Delta x_i) */
  mesh: number;
  /** Subinterval widths: [Delta x_1, ..., Delta x_n] */
  widths: number[];
}

/** Result of computing a Riemann sum, including visualization data. */
export interface RiemannSumResult {
  /** The numerical value of the Riemann sum */
  value: number;
  /** The partition used */
  partition: IntegrationPartition;
  /** Which rule was applied */
  rule: 'left' | 'right' | 'midpoint' | 'trapezoidal' | 'simpson';
  /** Per-subinterval data for drawing rectangles/trapezoids */
  rectangles: Array<{
    /** Left edge of subinterval */
    x: number;
    /** Width of subinterval (Delta x_i) */
    width: number;
    /** Rectangle height (depends on rule) */
    height: number;
    /** Sample point t_i */
    samplePoint: number;
    /** For trapezoidal: left height */
    heightLeft?: number;
    /** For trapezoidal: right height */
    heightRight?: number;
  }>;
}

/** Result of computing Darboux sums, including visualization data. */
export interface DarbouxSumResult {
  /** Upper Darboux sum U(f, P) */
  upperSum: number;
  /** Lower Darboux sum L(f, P) */
  lowerSum: number;
  /** Gap U - L */
  gap: number;
  /** The partition used */
  partition: IntegrationPartition;
  /** Per-subinterval data for drawing upper and lower rectangles */
  intervals: Array<{
    /** Left edge of subinterval */
    x: number;
    /** Width of subinterval */
    width: number;
    /** Supremum M_i = sup f on [x_{i-1}, x_i] */
    supremum: number;
    /** Infimum m_i = inf f on [x_{i-1}, x_i] */
    infimum: number;
  }>;
}

/** Numerical integration result with error estimate. */
export interface QuadratureResult {
  /** Computed integral value */
  value: number;
  /** Estimated error (null if unknown) */
  estimatedError: number | null;
  /** Number of function evaluations */
  nEvaluations: number;
  /** Name of the rule used */
  rule: string;
}

// ── Partition Functions ─────────────────────────────────────

/** Create a uniform partition of [a, b] with n subintervals. */
export function uniformPartition(a: number, b: number, n: number): IntegrationPartition {
  const points: number[] = [];
  const widths: number[] = [];
  const h = (b - a) / n;

  for (let i = 0; i <= n; i++) {
    points.push(a + i * h);
  }
  for (let i = 0; i < n; i++) {
    widths.push(h);
  }

  return { points, n, mesh: Math.abs(h), widths };
}

/**
 * Refine an existing partition by inserting a new point.
 * The new point must lie strictly inside (a, b).
 */
export function refinePartition(
  partition: IntegrationPartition,
  newPoint: number,
): IntegrationPartition {
  const pts = partition.points;

  // Find insertion index (skip if already present, including last point)
  for (let i = 0; i < pts.length; i++) {
    if (Math.abs(newPoint - pts[i]) < 1e-12) return partition; // already present
  }
  let insertIdx = -1;
  for (let i = 0; i < pts.length - 1; i++) {
    if (newPoint > pts[i] && newPoint < pts[i + 1]) {
      insertIdx = i + 1;
      break;
    }
  }
  if (insertIdx === -1) return partition; // outside range

  const newPoints = [...pts.slice(0, insertIdx), newPoint, ...pts.slice(insertIdx)];
  const newWidths: number[] = [];
  let mesh = 0;
  for (let i = 0; i < newPoints.length - 1; i++) {
    const w = newPoints[i + 1] - newPoints[i];
    newWidths.push(w);
    if (Math.abs(w) > mesh) mesh = Math.abs(w);
  }

  return { points: newPoints, n: newPoints.length - 1, mesh, widths: newWidths };
}

// ── Riemann Sum ─────────────────────────────────────────────

/**
 * Compute a Riemann sum with the specified rule.
 * Returns the numerical value plus per-rectangle data for visualization.
 */
export function riemannSum(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
  rule: 'left' | 'right' | 'midpoint' | 'trapezoidal' | 'simpson',
): RiemannSumResult {
  if (rule === 'simpson') {
    return simpsonRiemannSum(f, a, b, n);
  }

  const partition = uniformPartition(a, b, n);
  const rectangles: RiemannSumResult['rectangles'] = [];
  let value = 0;

  for (let i = 0; i < n; i++) {
    const xi = partition.points[i];
    const xi1 = partition.points[i + 1];
    const dx = partition.widths[i];

    if (rule === 'left') {
      const h = f(xi);
      value += h * dx;
      rectangles.push({ x: xi, width: dx, height: h, samplePoint: xi });
    } else if (rule === 'right') {
      const h = f(xi1);
      value += h * dx;
      rectangles.push({ x: xi, width: dx, height: h, samplePoint: xi1 });
    } else if (rule === 'midpoint') {
      const mid = (xi + xi1) / 2;
      const h = f(mid);
      value += h * dx;
      rectangles.push({ x: xi, width: dx, height: h, samplePoint: mid });
    } else {
      // trapezoidal
      const hL = f(xi);
      const hR = f(xi1);
      value += (hL + hR) / 2 * dx;
      rectangles.push({
        x: xi,
        width: dx,
        height: (hL + hR) / 2,
        samplePoint: (xi + xi1) / 2,
        heightLeft: hL,
        heightRight: hR,
      });
    }
  }

  return { value, partition, rule, rectangles };
}

/** Internal: Simpson's rule as a Riemann sum with rectangle visualization data. */
function simpsonRiemannSum(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
): RiemannSumResult {
  // Enforce even n
  const nEven = n % 2 === 0 ? n : n + 1;
  const partition = uniformPartition(a, b, nEven);
  const h = (b - a) / nEven;
  const rectangles: RiemannSumResult['rectangles'] = [];

  let value = f(a) + f(b);
  for (let i = 1; i < nEven; i++) {
    const xi = partition.points[i];
    const coeff = i % 2 === 0 ? 2 : 4;
    value += coeff * f(xi);
  }
  value *= h / 3;

  // For visualization, show midpoint-like rectangles
  for (let i = 0; i < nEven; i++) {
    const xi = partition.points[i];
    const xi1 = partition.points[i + 1];
    const mid = (xi + xi1) / 2;
    const hMid = f(mid);
    rectangles.push({ x: xi, width: h, height: hMid, samplePoint: mid });
  }

  return { value, partition: uniformPartition(a, b, nEven), rule: 'simpson', rectangles };
}

// ── Darboux Sums ────────────────────────────────────────────

/**
 * Compute upper and lower Darboux sums by sampling each subinterval.
 * Uses nSamples points per subinterval to approximate sup and inf.
 */
export function darbouxSums(
  f: (x: number) => number,
  partition: IntegrationPartition,
  nSamples: number = 100,
): DarbouxSumResult {
  let upperSum = 0;
  let lowerSum = 0;
  const intervals: DarbouxSumResult['intervals'] = [];

  for (let i = 0; i < partition.n; i++) {
    const xi = partition.points[i];
    const xi1 = partition.points[i + 1];
    const dx = partition.widths[i];

    let sup = -Infinity;
    let inf = Infinity;

    for (let j = 0; j <= nSamples; j++) {
      const t = xi + (j / nSamples) * (xi1 - xi);
      const val = f(t);
      if (val > sup) sup = val;
      if (val < inf) inf = val;
    }

    upperSum += sup * dx;
    lowerSum += inf * dx;
    intervals.push({ x: xi, width: dx, supremum: sup, infimum: inf });
  }

  return { upperSum, lowerSum, gap: upperSum - lowerSum, partition, intervals };
}

// ── Simpson's Rule ──────────────────────────────────────────

/**
 * Compute Simpson's rule on [a, b] with n subintervals.
 * Enforces even n (rounds up if odd).
 */
export function simpsonRule(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number,
): QuadratureResult {
  const nEven = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / nEven;
  let value = f(a) + f(b);
  let nEvals = 2;

  for (let i = 1; i < nEven; i++) {
    const xi = a + i * h;
    const coeff = i % 2 === 0 ? 2 : 4;
    value += coeff * f(xi);
    nEvals++;
  }
  value *= h / 3;

  return { value, estimatedError: null, nEvaluations: nEvals, rule: 'simpson' };
}

// ── Adaptive Quadrature ─────────────────────────────────────

/**
 * Compute the numerical integral using adaptive Simpson's rule.
 * Subdivides where the function changes rapidly.
 */
export function adaptiveQuadrature(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance: number = 1e-10,
  maxDepth: number = 20,
): QuadratureResult {
  let nEvals = 0;

  function fEval(x: number): number {
    nEvals++;
    return f(x);
  }

  function simpsonBasic(lo: number, hi: number): number {
    const mid = (lo + hi) / 2;
    return ((hi - lo) / 6) * (fEval(lo) + 4 * fEval(mid) + fEval(hi));
  }

  function recurse(lo: number, hi: number, whole: number, depth: number): number {
    const mid = (lo + hi) / 2;
    const left = simpsonBasic(lo, mid);
    const right = simpsonBasic(mid, hi);
    const refined = left + right;

    if (depth >= maxDepth || Math.abs(refined - whole) < 15 * tolerance) {
      return refined + (refined - whole) / 15; // Richardson extrapolation
    }

    return recurse(lo, mid, left, depth + 1) + recurse(mid, hi, right, depth + 1);
  }

  const whole = simpsonBasic(a, b);
  const value = recurse(a, b, whole, 0);

  return { value, estimatedError: tolerance, nEvaluations: nEvals, rule: 'adaptive-simpson' };
}

// ── Area Function ───────────────────────────────────────────

/**
 * Compute the area function F(x) = integral from a to x of f(t) dt
 * at multiple x values. Accumulates left-to-right for consistency.
 */
export function areaFunction(
  f: (x: number) => number,
  a: number,
  xValues: number[],
  nSubintervals: number = 100,
): Array<{ x: number; Fx: number }> {
  // Tag each x with its original index so we can restore input order
  const indexed = xValues.map((x, idx) => ({ x, idx }));
  indexed.sort((u, v) => u.x - v.x);

  const FxByIndex: number[] = new Array(xValues.length);

  // ── Forward pass (x >= a): accumulate left-to-right in O(N) ──
  let cumulative = 0;
  let prevX = a;
  for (const { x, idx } of indexed) {
    if (x >= a) {
      if (x > prevX) {
        cumulative += trapezoidalSegment(f, prevX, x, nSubintervals);
        prevX = x;
      }
      FxByIndex[idx] = cumulative;
    }
  }

  // ── Backward pass (x < a): accumulate right-to-left in O(N) ──
  let backCumulative = 0;
  let prevBack = a;
  for (let j = indexed.length - 1; j >= 0; j--) {
    const { x, idx } = indexed[j];
    if (x < a) {
      if (x < prevBack) {
        backCumulative -= trapezoidalSegment(f, x, prevBack, nSubintervals);
        prevBack = x;
      }
      FxByIndex[idx] = backCumulative;
    }
  }

  // Return results in the same order as the input xValues array
  return xValues.map((x, idx) => ({ x, Fx: FxByIndex[idx] }));
}

/** Internal: trapezoidal rule on a single segment [lo, hi]. */
function trapezoidalSegment(
  f: (x: number) => number,
  lo: number,
  hi: number,
  n: number,
): number {
  if (Math.abs(hi - lo) < 1e-15) return 0;
  const h = (hi - lo) / n;
  let sum = (f(lo) + f(hi)) / 2;
  for (let i = 1; i < n; i++) {
    sum += f(lo + i * h);
  }
  return sum * h;
}

// ── Quadrature Convergence ──────────────────────────────────

/**
 * Compute quadrature errors for multiple rules and n values.
 * Returns data for convergence rate (error vs. n) plots.
 */
export function quadratureConvergence(
  f: (x: number) => number,
  a: number,
  b: number,
  exactIntegral: number,
  nValues: number[],
  rules: Array<'left' | 'right' | 'midpoint' | 'trapezoidal' | 'simpson'>,
): Array<{
  rule: string;
  data: Array<{ n: number; error: number }>;
}> {
  return rules.map((rule) => ({
    rule,
    data: nValues.map((n) => {
      const result = riemannSum(f, a, b, n, rule);
      const error = Math.abs(result.value - exactIntegral);
      return { n, error: error < 1e-16 ? 1e-16 : error }; // floor for log-log
    }),
  }));
}
