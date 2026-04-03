/**
 * Shared utility module for Riemann integration and numerical quadrature.
 * Created by Topic 7 (riemann-integral), extended by Topic 8 (improper-integrals).
 * Extended by Topic 13 (multiple-integrals) with 2D integration and Monte Carlo.
 * To be further extended by Topic 14 (change-of-variables).
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
 *  - Improper integral computation via truncation (Type I and Type II)
 *  - Gamma function (Lanczos approximation), Beta function
 *  - Incomplete gamma, error function, Gaussian CDF
 *  - Stirling's approximation
 */

// Import seededRandom for use in this module and re-export for downstream consumers
import { seededRandom } from './limits';
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

// ══════════════════════════════════════════════════════════════
// Topic 8: Improper Integrals & Special Functions
// ══════════════════════════════════════════════════════════════

// ── Improper Integral Interfaces ────────────────────────────

/** Result of computing an improper integral via truncation. */
export interface ImproperIntegralResult {
  /** Final computed integral value */
  value: number;
  /** Whether the sequence of partial integrals converged */
  converged: boolean;
  /** The truncation limit used (b for Type I, epsilon for Type II) */
  truncationLimit: number;
  /** Estimated error (difference between last two partial sums) */
  estimatedError: number | null;
  /** Total number of function evaluations */
  nEvaluations: number;
}

/** Gamma function evaluation result. */
export interface GammaResult {
  /** The input parameter */
  s: number;
  /** Gamma(s) — may be Infinity for large s or at poles */
  value: number;
  /** log(Gamma(s)) — always computable even when Gamma overflows */
  logValue: number;
}

// ── Improper Integrals ──────────────────────────────────────

/**
 * Compute a Type I improper integral: integral from a to infinity of f(x) dx.
 * Uses truncation: evaluates integral from a to b for increasing b until convergence.
 */
export function improperIntegralTypeI(
  f: (x: number) => number,
  a: number,
  maxB: number = 1000,
  tolerance: number = 1e-10,
): ImproperIntegralResult {
  let nEvals = 0;
  const fCounted = (x: number): number => { nEvals++; return f(x); };

  let prevValue = 0;
  let converged = false;
  let currentB = a;

  // Use logarithmic spacing for the truncation bounds
  const nSteps = 40;
  const logMin = Math.log10(Math.max(a + 1, 1));
  const logMax = Math.log10(maxB);

  for (let i = 0; i < nSteps; i++) {
    const nextB = Math.pow(10, logMin + (i / (nSteps - 1)) * (logMax - logMin));
    if (nextB <= currentB) continue;

    const segment = adaptiveQuadrature(fCounted, currentB === a ? a : currentB, nextB, tolerance / nSteps);
    prevValue += segment.value;
    currentB = nextB;

    // Check for early convergence: if integrand is negligible
    const probe = Math.abs(f(currentB));
    if (probe < 1e-15 && i > 5) {
      converged = true;
      break;
    }
  }

  // Check convergence by comparing last two segments
  const testValue = prevValue;
  const extraSeg = adaptiveQuadrature(fCounted, currentB, currentB * 1.5, tolerance);
  const withExtra = testValue + extraSeg.value;
  const error = Math.abs(withExtra - testValue);
  converged = converged || error < tolerance;

  return {
    value: withExtra,
    converged,
    truncationLimit: currentB * 1.5,
    estimatedError: error,
    nEvaluations: nEvals,
  };
}

/**
 * Compute a Type II improper integral where f is unbounded near a.
 * Evaluates integral from (a + epsilon) to b for decreasing epsilon.
 */
export function improperIntegralTypeII(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance: number = 1e-10,
): ImproperIntegralResult {
  let nEvals = 0;
  const fCounted = (x: number): number => { nEvals++; return f(x); };

  // Incremental accumulation: integrate only new segments [a + eps_new, a + eps_old]
  // instead of re-integrating the entire [a + eps, b] each iteration.
  const nSteps = 30;
  const halfSpan = (b - a) / 2;
  let currentLeft = a + halfSpan; // start from the midpoint
  let cumulative = adaptiveQuadrature(fCounted, currentLeft, b, tolerance).value;
  let prevCumulative = NaN;
  let converged = false;
  let lastEps = halfSpan;

  for (let i = 0; i < nSteps; i++) {
    const eps = halfSpan * Math.pow(0.5, i + 1);
    const newLeft = a + eps;
    if (newLeft >= currentLeft) continue;

    // Only integrate the new segment [newLeft, currentLeft]
    const segment = adaptiveQuadrature(fCounted, newLeft, currentLeft, tolerance);
    prevCumulative = cumulative;
    cumulative += segment.value;
    currentLeft = newLeft;
    lastEps = eps;

    // Check convergence: new segment contribution is negligible
    if (Math.abs(segment.value) < tolerance) {
      converged = true;
      break;
    }
  }

  return {
    value: cumulative,
    converged,
    truncationLimit: lastEps,
    estimatedError: converged && !isNaN(prevCumulative) ? Math.abs(cumulative - prevCumulative) : null,
    nEvaluations: nEvals,
  };
}

// ── Gamma Function (Lanczos Approximation) ──────────────────

// Lanczos coefficients for g = 7 (standard 9-coefficient set)
const LANCZOS_G = 7;
const LANCZOS_COEFFICIENTS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/**
 * Compute the log of |Gamma(s)| using the Lanczos approximation.
 * Returns log(|Gamma(s)|) for all real s except non-positive integers (poles).
 * Uses Math.abs on the sine term in the reflection formula so the result
 * is well-defined when Gamma(s) is negative (e.g., s in (-1, 0), (-3, -2)).
 */
export function logGamma(s: number): number {
  if (s <= 0 && s === Math.floor(s)) return Infinity; // poles

  // Reflection formula for s < 0.5: log|Gamma(s)| = log(pi / |sin(pi*s)|) - logGamma(1 - s)
  if (s < 0.5) {
    return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * s))) - logGamma(1 - s);
  }

  const x = s - 1;
  let a = LANCZOS_COEFFICIENTS[0];
  for (let i = 1; i < LANCZOS_COEFFICIENTS.length; i++) {
    a += LANCZOS_COEFFICIENTS[i] / (x + i);
  }

  const t = x + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/**
 * Compute Gamma(s) for real s > 0.
 * Uses the Lanczos approximation for ~15 digits of precision.
 * Returns both the value and log-value (log-value avoids overflow for large s).
 */
export function gammaFunction(s: number): GammaResult {
  const lg = logGamma(s);
  return {
    s,
    value: Math.exp(lg),
    logValue: lg,
  };
}

// ── Beta Function ───────────────────────────────────────────

/**
 * Compute B(a, b) = Gamma(a) * Gamma(b) / Gamma(a + b).
 * Computed via log-Gamma for numerical stability.
 */
export function betaFunction(a: number, b: number): number {
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

// ── Incomplete Gamma ────────────────────────────────────────

/**
 * Compute the lower incomplete gamma function:
 * gamma(s, x) = integral from 0 to x of t^{s-1} e^{-t} dt.
 * Uses the series expansion for convergence.
 */
export function incompleteGamma(s: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;

  // Series expansion: gamma(s, x) = x^s * e^{-x} * sum_{n=0..inf} x^n / (s(s+1)...(s+n))
  let sum = 0;
  let term = 1 / s;
  sum = term;
  let prevSum = 0;
  for (let n = 1; n < 200; n++) {
    term *= x / (s + n);
    prevSum = sum;
    sum += term;
    // Converged when the term is tiny relative to the sum AND the sum has stabilized
    if (Math.abs(term) < 1e-14 * Math.abs(sum) && Math.abs(sum - prevSum) < 1e-14 * Math.abs(sum)) break;
  }

  return Math.pow(x, s) * Math.exp(-x) * sum;
}

// ── Error Function & Gaussian CDF ───────────────────────────

/**
 * Compute the error function erf(x) = (2/sqrt(pi)) * integral from 0 to x of e^{-t^2} dt.
 * Uses the Abramowitz & Stegun rational approximation (formula 7.1.26).
 * Maximum error: < 1.5e-7.
 */
export function errorFunction(x: number): number {
  // erf(-x) = -erf(x)
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  // Abramowitz & Stegun constants
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;

  const t = 1.0 / (1.0 + p * absX);
  const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  const result = 1.0 - poly * Math.exp(-absX * absX);

  return sign * result;
}

/**
 * Compute the Gaussian CDF: Phi(x) = (1/2)[1 + erf(x / sqrt(2))].
 * Phi(x) = P(Z <= x) where Z ~ N(0, 1).
 */
export function gaussianCDF(x: number): number {
  return 0.5 * (1 + errorFunction(x / Math.SQRT2));
}

// ── Stirling's Approximation ────────────────────────────────

/**
 * Compute Stirling's approximation for n!:
 *   S(n) = sqrt(2 * pi * n) * (n / e)^n
 *
 * Returns the approximation, its log, the relative error vs Gamma(n+1),
 * and the improved approximation with the 1/(12n) correction.
 */
export function stirlingApproximation(n: number): {
  value: number;
  logValue: number;
  relativeError: number;
  improvedValue: number;
} {
  if (n <= 0) return { value: 0, logValue: -Infinity, relativeError: 1, improvedValue: 0 };

  // log(S(n)) = 0.5 * log(2*pi*n) + n * log(n) - n
  const logStirling = 0.5 * Math.log(2 * Math.PI * n) + n * Math.log(n) - n;
  const stirling = Math.exp(logStirling);

  // Improved Stirling: S(n) * (1 + 1/(12n))
  const improved = stirling * (1 + 1 / (12 * n));

  // Relative error vs true factorial via Gamma(n+1)
  const logTrue = logGamma(n + 1);
  const relativeError = Math.abs(Math.exp(logTrue - logStirling) - 1);

  return {
    value: stirling,
    logValue: logStirling,
    relativeError,
    improvedValue: improved,
  };
}

// ══════════════════════════════════════════════════════════════
// Topic 13: Multiple Integrals & Fubini's Theorem
// ══════════════════════════════════════════════════════════════

// ── 2D Integration Interfaces ─────────────────────────────────

/** A 2D partition of [a,b] × [c,d] as a pair of 1D partitions. */
export interface Partition2D {
  xPartition: IntegrationPartition;
  yPartition: IntegrationPartition;
  /** Number of subdivisions in x */
  nx: number;
  /** Number of subdivisions in y */
  ny: number;
  /** Total sub-rectangles: nx × ny */
  totalCells: number;
  /** Mesh = max(mesh_x, mesh_y) */
  mesh: number;
}

/** Result of a double Riemann sum, including per-cell data for visualization. */
export interface DoubleRiemannSumResult {
  /** The numerical value of the double Riemann sum */
  value: number;
  /** The 2D partition used */
  partition: Partition2D;
  /** Sampling rule applied within each sub-rectangle */
  sampleRule: 'lower-left' | 'center' | 'random';
  /** Per-cell data: position, size, f-value, volume contribution */
  cells: Array<{
    /** Left edge x-coordinate of the sub-rectangle */
    x: number;
    /** Bottom edge y-coordinate of the sub-rectangle */
    y: number;
    /** Width (Δx) */
    width: number;
    /** Height (Δy) */
    height: number;
    /** f evaluated at the sample point */
    fValue: number;
    /** Volume contribution: f(x*, y*) Δx Δy */
    volume: number;
  }>;
}

/** Result of Monte Carlo integration with convergence history. */
export interface MonteCarloResult {
  /** Final estimate of the integral */
  estimate: number;
  /** Standard error: σ / √N */
  standardError: number;
  /** Number of samples drawn */
  nSamples: number;
  /** Per-sample data for scatter-plot visualization */
  samples: Array<{
    x: number;
    y: number;
    fValue: number;
    /** Whether the point falls inside the integration region */
    inRegion: boolean;
  }>;
  /** Running estimate at logarithmic checkpoints for convergence plots */
  convergenceHistory: Array<{ n: number; estimate: number }>;
}

/** Boundary data for Type I / Type II integration regions. */
export interface RegionBoundary {
  /** Dense boundary polygon for filling the region */
  points: Array<{ x: number; y: number }>;
  /** Type I description: x in [a, b], g1(x) ≤ y ≤ g2(x) */
  typeI: {
    xRange: [number, number];
    lowerCurve: Array<{ x: number; y: number }>;
    upperCurve: Array<{ x: number; y: number }>;
  };
  /** Type II description: y in [c, d], h1(y) ≤ x ≤ h2(y) */
  typeII: {
    yRange: [number, number];
    leftCurve: Array<{ x: number; y: number }>;
    rightCurve: Array<{ x: number; y: number }>;
  };
}

// ── 2D Partition ──────────────────────────────────────────────

/** Create a uniform 2D partition of [xRange] × [yRange]. */
export function uniformPartition2D(
  xRange: [number, number],
  yRange: [number, number],
  nx: number,
  ny: number,
): Partition2D {
  const xPartition = uniformPartition(xRange[0], xRange[1], nx);
  const yPartition = uniformPartition(yRange[0], yRange[1], ny);
  return {
    xPartition,
    yPartition,
    nx,
    ny,
    totalCells: nx * ny,
    mesh: Math.max(xPartition.mesh, yPartition.mesh),
  };
}

// ── Double Riemann Sum ────────────────────────────────────────

/**
 * Compute a double Riemann sum of f over [xRange] × [yRange].
 * Returns the numerical value plus per-cell data for heatmap visualization.
 * Uses the existing uniformPartition() for each axis.
 */
export function doubleRiemannSum(
  f: (x: number, y: number) => number,
  xRange: [number, number],
  yRange: [number, number],
  nx: number,
  ny: number,
  sampleRule: 'lower-left' | 'center' | 'random' = 'center',
  seed: number = 42,
): DoubleRiemannSumResult {
  const partition = uniformPartition2D(xRange, yRange, nx, ny);
  const { xPartition, yPartition } = partition;
  const cells: DoubleRiemannSumResult['cells'] = [];
  let value = 0;

  // Seeded RNG for reproducible "random" sample points
  const rng = sampleRule === 'random' ? seededRandom(seed) : null;

  for (let i = 0; i < nx; i++) {
    const xi = xPartition.points[i];
    const dx = xPartition.widths[i];
    for (let j = 0; j < ny; j++) {
      const yj = yPartition.points[j];
      const dy = yPartition.widths[j];

      // Choose sample point within sub-rectangle
      let sx: number, sy: number;
      if (sampleRule === 'lower-left') {
        sx = xi;
        sy = yj;
      } else if (sampleRule === 'center') {
        sx = xi + dx / 2;
        sy = yj + dy / 2;
      } else {
        sx = xi + rng!() * dx;
        sy = yj + rng!() * dy;
      }

      const fVal = f(sx, sy);
      const vol = fVal * dx * dy;
      value += vol;
      cells.push({ x: xi, y: yj, width: dx, height: dy, fValue: fVal, volume: vol });
    }
  }

  return { value, partition, sampleRule, cells };
}

// ── Iterated Integral ─────────────────────────────────────────

/**
 * Compute an iterated integral via nested 1D quadrature.
 * Supports both fixed bounds (yRange as [c, d]) and variable bounds
 * (yRange as a function (x) => [g1(x), g2(x)]) for general regions.
 *
 * order = 'xy': outer x, inner y — ∫∫ f(x,y) dy dx
 * order = 'yx': outer y, inner x — ∫∫ f(x,y) dx dy
 */
export function iteratedIntegral(
  f: (x: number, y: number) => number,
  xRange: [number, number],
  yRange: [number, number] | ((x: number) => [number, number]),
  nOuter: number = 100,
  nInner: number = 100,
  order: 'xy' | 'yx' = 'xy',
): number {
  if (order === 'xy') {
    // Outer integral over x, inner integral over y
    const outerIntegrand = (x: number): number => {
      const [yLo, yHi] = typeof yRange === 'function' ? yRange(x) : yRange;
      if (yLo >= yHi) return 0;
      return simpsonRule(
        (y: number) => f(x, y),
        yLo, yHi, nInner,
      ).value;
    };
    return simpsonRule(outerIntegrand, xRange[0], xRange[1], nOuter).value;
  } else {
    // Outer integral over y, inner integral over x
    // For variable bounds, interpret yRange as fixed [c, d] and xRange as fixed [a, b]
    const [yLo, yHi] = typeof yRange === 'function'
      ? (() => { throw new Error('Variable bounds not supported with yx order; swap arguments.'); })()
      : yRange;
    const outerIntegrand = (y: number): number => {
      return simpsonRule(
        (x: number) => f(x, y),
        xRange[0], xRange[1], nInner,
      ).value;
    };
    return simpsonRule(outerIntegrand, yLo, yHi, nOuter).value;
  }
}

/**
 * Convenience wrapper: compute ∬_R f dA over a rectangle or general region.
 * Uses Simpson's rule for both axes (accurate for smooth f).
 */
export function doubleIntegral(
  f: (x: number, y: number) => number,
  xRange: [number, number],
  yRange: [number, number] | ((x: number) => [number, number]),
  nx: number = 100,
  ny: number = 100,
): number {
  return iteratedIntegral(f, xRange, yRange, nx, ny, 'xy');
}

// ── Monte Carlo Integration ───────────────────────────────────

/**
 * Estimate ∬_D f dA via Monte Carlo sampling within a bounding box.
 * If inRegion is provided, only samples inside D are counted (rejection sampling).
 * Returns convergence history at logarithmic checkpoints.
 */
export function monteCarloIntegral(
  f: (x: number, y: number) => number,
  boundingBox: { x: [number, number]; y: [number, number] },
  nSamples: number,
  inRegion?: (x: number, y: number) => boolean,
  seed: number = 42,
): MonteCarloResult {
  const rng = seededRandom(seed);
  const [xMin, xMax] = boundingBox.x;
  const [yMin, yMax] = boundingBox.y;
  const boxArea = (xMax - xMin) * (yMax - yMin);

  const samples: MonteCarloResult['samples'] = [];
  const convergenceHistory: MonteCarloResult['convergenceHistory'] = [];

  let sumF = 0;
  let sumF2 = 0;

  // Logarithmic checkpoints for convergence plot
  const checkpoints = new Set<number>();
  for (let k = 1; k <= nSamples; k = Math.ceil(k * 1.15)) {
    checkpoints.add(k);
  }
  checkpoints.add(nSamples);

  for (let k = 1; k <= nSamples; k++) {
    const x = xMin + rng() * (xMax - xMin);
    const y = yMin + rng() * (yMax - yMin);
    const inside = inRegion ? inRegion(x, y) : true;
    const fVal = inside ? f(x, y) : 0;

    samples.push({ x, y, fValue: fVal, inRegion: inside });

    if (inside) {
      sumF += fVal;
      sumF2 += fVal * fVal;
    }

    if (checkpoints.has(k)) {
      // Estimate using all samples (including outside → contributes 0)
      const estimate = (boxArea * sumF) / k;
      convergenceHistory.push({ n: k, estimate });
    }
  }

  const estimate = (boxArea * sumF) / nSamples;

  // Sample variance of f (treating outside-region as 0)
  const meanF = sumF / nSamples;
  const variance = (sumF2 / nSamples) - meanF * meanF;
  const standardError = boxArea * Math.sqrt(Math.max(0, variance) / nSamples);

  return { estimate, standardError, nSamples, samples, convergenceHistory };
}

// ── Region Boundary ───────────────────────────────────────────

/**
 * Generate dense boundary data for a Type I region: a ≤ x ≤ b, g1(x) ≤ y ≤ g2(x).
 * Also computes the equivalent Type II curves by inverting the boundary.
 */
export function generateRegionBoundary(
  xRange: [number, number],
  g1: (x: number) => number,
  g2: (x: number) => number,
  nPoints: number = 200,
): RegionBoundary {
  const [a, b] = xRange;
  const lowerCurve: Array<{ x: number; y: number }> = [];
  const upperCurve: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= nPoints; i++) {
    const x = a + (i / nPoints) * (b - a);
    lowerCurve.push({ x, y: g1(x) });
    upperCurve.push({ x, y: g2(x) });
  }

  // Closed polygon: upper curve forward, lower curve backward
  const points = [...upperCurve, ...lowerCurve.slice().reverse()];

  // Compute y-range for Type II description
  let yMin = Infinity, yMax = -Infinity;
  for (const p of points) {
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }

  // Type II curves: for each y, find the leftmost and rightmost x on the boundary
  const leftCurve: Array<{ x: number; y: number }> = [];
  const rightCurve: Array<{ x: number; y: number }> = [];
  for (let j = 0; j <= nPoints; j++) {
    const y = yMin + (j / nPoints) * (yMax - yMin);
    let xLeft = Infinity, xRight = -Infinity;
    // Scan x to find where y falls between g1(x) and g2(x)
    for (let i = 0; i <= nPoints; i++) {
      const x = a + (i / nPoints) * (b - a);
      if (g1(x) <= y + 1e-10 && y - 1e-10 <= g2(x)) {
        if (x < xLeft) xLeft = x;
        if (x > xRight) xRight = x;
      }
    }
    if (xLeft <= xRight) {
      leftCurve.push({ x: xLeft, y });
      rightCurve.push({ x: xRight, y });
    }
  }

  return {
    points,
    typeI: { xRange, lowerCurve, upperCurve },
    typeII: { yRange: [yMin, yMax], leftCurve, rightCurve },
  };
}

// ══════════════════════════════════════════════════════════════
// Change of Variables — coordinate-transform integration (Topic 14)
// ══════════════════════════════════════════════════════════════

/**
 * Evaluate a 2D integral under a coordinate substitution.
 *
 * ∫∫_D f(x,y) dA = ∫∫_{D*} f(φ(u,v)) |det J_φ(u,v)| du dv
 *
 * Uses midpoint rule on a uniform grid in (u,v)-space.
 * `vRange` may be a fixed interval or a function of u for non-rectangular parameter domains.
 */
export function changeOfVariables2D(
  f: (x: number, y: number) => number,
  phi: (u: number, v: number) => [number, number],
  detJ: (u: number, v: number) => number,
  uRange: [number, number],
  vRange: [number, number] | ((u: number) => [number, number]),
  nu: number = 50,
  nv: number = 50,
): number {
  const du = (uRange[1] - uRange[0]) / nu;
  let total = 0;

  for (let i = 0; i < nu; i++) {
    const uMid = uRange[0] + (i + 0.5) * du;
    const [vLo, vHi] = typeof vRange === 'function' ? vRange(uMid) : vRange;
    const dv = (vHi - vLo) / nv;

    for (let j = 0; j < nv; j++) {
      const vMid = vLo + (j + 0.5) * dv;
      const [x, y] = phi(uMid, vMid);
      total += f(x, y) * Math.abs(detJ(uMid, vMid)) * du * dv;
    }
  }
  return total;
}

/**
 * Evaluate a double integral in polar coordinates.
 *
 * ∫∫ f(r,θ) · r dr dθ   (the Jacobian factor r is built in)
 */
export function polarIntegral(
  f: (r: number, theta: number) => number,
  rRange: [number, number],
  thetaRange: [number, number],
  nr: number = 50,
  ntheta: number = 50,
): number {
  const dr = (rRange[1] - rRange[0]) / nr;
  const dtheta = (thetaRange[1] - thetaRange[0]) / ntheta;
  let total = 0;

  for (let i = 0; i < nr; i++) {
    const rMid = rRange[0] + (i + 0.5) * dr;
    for (let j = 0; j < ntheta; j++) {
      const thetaMid = thetaRange[0] + (j + 0.5) * dtheta;
      total += f(rMid, thetaMid) * rMid * dr * dtheta;
    }
  }
  return total;
}

/**
 * Evaluate a triple integral in cylindrical coordinates.
 *
 * ∫∫∫ f(r,θ,z) · r dr dθ dz
 *
 * `zRange` may be fixed or a function of (r,θ) for non-rectangular domains.
 */
export function cylindricalIntegral(
  f: (r: number, theta: number, z: number) => number,
  rRange: [number, number],
  thetaRange: [number, number],
  zRange: [number, number] | ((r: number, theta: number) => [number, number]),
  nr: number = 20,
  ntheta: number = 20,
  nz: number = 20,
): number {
  const dr = (rRange[1] - rRange[0]) / nr;
  const dtheta = (thetaRange[1] - thetaRange[0]) / ntheta;
  let total = 0;

  for (let i = 0; i < nr; i++) {
    const rMid = rRange[0] + (i + 0.5) * dr;
    for (let j = 0; j < ntheta; j++) {
      const thetaMid = thetaRange[0] + (j + 0.5) * dtheta;
      const [zLo, zHi] = typeof zRange === 'function' ? zRange(rMid, thetaMid) : zRange;
      const dz = (zHi - zLo) / nz;
      for (let k = 0; k < nz; k++) {
        const zMid = zLo + (k + 0.5) * dz;
        total += f(rMid, thetaMid, zMid) * rMid * dr * dtheta * dz;
      }
    }
  }
  return total;
}

/**
 * Evaluate a triple integral in spherical coordinates.
 *
 * ∫∫∫ f(ρ,θ,φ) · ρ²sinφ dρ dθ dφ
 *
 * Convention: ρ = radial, θ = azimuthal [0,2π), φ = polar [0,π].
 */
export function sphericalIntegral(
  f: (rho: number, theta: number, phi: number) => number,
  rhoRange: [number, number],
  thetaRange: [number, number],
  phiRange: [number, number],
  nrho: number = 20,
  ntheta: number = 20,
  nphi: number = 20,
): number {
  const drho = (rhoRange[1] - rhoRange[0]) / nrho;
  const dtheta = (thetaRange[1] - thetaRange[0]) / ntheta;
  const dphi = (phiRange[1] - phiRange[0]) / nphi;
  let total = 0;

  for (let i = 0; i < nrho; i++) {
    const rhoMid = rhoRange[0] + (i + 0.5) * drho;
    for (let j = 0; j < ntheta; j++) {
      const thetaMid = thetaRange[0] + (j + 0.5) * dtheta;
      for (let k = 0; k < nphi; k++) {
        const phiMid = phiRange[0] + (k + 0.5) * dphi;
        total += f(rhoMid, thetaMid, phiMid) * rhoMid * rhoMid * Math.sin(phiMid) * drho * dtheta * dphi;
      }
    }
  }
  return total;
}

/**
 * Numerically approximate |det J_φ(u,v)| via finite differences.
 * Useful when an analytical Jacobian is not available.
 */
export function jacobianAreaElement(
  phi: (u: number, v: number) => [number, number],
  u: number,
  v: number,
  h: number = 1e-6,
): number {
  const [x1, y1] = phi(u + h, v);
  const [x2, y2] = phi(u - h, v);
  const [x3, y3] = phi(u, v + h);
  const [x4, y4] = phi(u, v - h);

  const dxdu = (x1 - x2) / (2 * h);
  const dydu = (y1 - y2) / (2 * h);
  const dxdv = (x3 - x4) / (2 * h);
  const dydv = (y3 - y4) / (2 * h);

  return Math.abs(dxdu * dydv - dxdv * dydu);
}

/**
 * A single cell in a coordinate-transform grid, used for
 * visualizing how φ deforms area elements.
 */
export interface CoordinateTransformGridCell {
  /** Center of the cell in parameter space */
  uCenter: number;
  vCenter: number;
  /** Four corners of the deformed cell in image space, in order */
  corners: Array<{ x: number; y: number }>;
  /** |det J_φ| evaluated at the cell center */
  detJ: number;
  /** Approximate area of the deformed cell */
  area: number;
}

/**
 * Generate a grid of cells in (u,v)-space, mapped through φ to (x,y)-space.
 * Each cell carries its deformed corner coordinates and Jacobian determinant.
 *
 * If `detJ` is provided, it is used directly (faster, exact). Otherwise,
 * |det J_φ| is approximated via finite differences.
 *
 * This is the data backbone of ChangeOfVariablesExplorer.
 */
export function coordinateTransformGrid(
  phi: (u: number, v: number) => [number, number],
  uRange: [number, number],
  vRange: [number, number],
  nu: number,
  nv: number,
  detJ?: (u: number, v: number) => number,
): CoordinateTransformGridCell[] {
  const du = (uRange[1] - uRange[0]) / nu;
  const dv = (vRange[1] - vRange[0]) / nv;
  const cells: CoordinateTransformGridCell[] = [];

  for (let i = 0; i < nu; i++) {
    const uLo = uRange[0] + i * du;
    const uHi = uLo + du;
    const uMid = uLo + du / 2;

    for (let j = 0; j < nv; j++) {
      const vLo = vRange[0] + j * dv;
      const vHi = vLo + dv;
      const vMid = vLo + dv / 2;

      // Map the four corners through φ
      const [x00, y00] = phi(uLo, vLo);
      const [x10, y10] = phi(uHi, vLo);
      const [x11, y11] = phi(uHi, vHi);
      const [x01, y01] = phi(uLo, vHi);

      const corners = [
        { x: x00, y: y00 },
        { x: x10, y: y10 },
        { x: x11, y: y11 },
        { x: x01, y: y01 },
      ];

      // Approximate area via shoelace formula on the quadrilateral
      const area = 0.5 * Math.abs(
        (x00 * y10 - x10 * y00)
        + (x10 * y11 - x11 * y10)
        + (x11 * y01 - x01 * y11)
        + (x01 * y00 - x00 * y01),
      );

      const detJVal = detJ ? Math.abs(detJ(uMid, vMid)) : jacobianAreaElement(phi, uMid, vMid);

      cells.push({ uCenter: uMid, vCenter: vMid, corners, detJ: detJVal, area });
    }
  }
  return cells;
}
