/**
 * Shared utility module for Riemann integration and numerical quadrature.
 * Created by Topic 7 (riemann-integral), extended by Topic 8 (improper-integrals).
 * To be further extended by Track 4 topics (multiple-integrals, change-of-variables).
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
  nSubintervals: number = 200,
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
  nSubintervals: number = 200,
): ImproperIntegralResult {
  let nEvals = 0;
  const fCounted = (x: number): number => { nEvals++; return f(x); };

  // Shrink epsilon from (b-a)/2 down to a very small value
  const nSteps = 30;
  let bestValue = 0;
  let prevValue = NaN;
  let converged = false;
  let lastEps = (b - a) / 2;

  for (let i = 0; i < nSteps; i++) {
    const eps = (b - a) / 2 * Math.pow(0.5, i + 1);
    const result = adaptiveQuadrature(fCounted, a + eps, b, tolerance);
    bestValue = result.value;

    if (!isNaN(prevValue)) {
      const diff = Math.abs(bestValue - prevValue);
      if (diff < tolerance) {
        converged = true;
        lastEps = eps;
        break;
      }
    }
    prevValue = bestValue;
    lastEps = eps;
  }

  return {
    value: bestValue,
    converged,
    truncationLimit: lastEps,
    estimatedError: converged ? Math.abs(bestValue - prevValue) : null,
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
 * Compute the log of the Gamma function using the Lanczos approximation.
 * Valid for all real s except non-positive integers.
 */
export function logGamma(s: number): number {
  if (s <= 0 && s === Math.floor(s)) return Infinity; // poles

  // Reflection formula for s < 0.5
  if (s < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * s)) - logGamma(1 - s);
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
  for (let n = 1; n < 200; n++) {
    term *= x / (s + n);
    sum += term;
    if (Math.abs(term) < 1e-14 * Math.abs(sum)) break;
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
