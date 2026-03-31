/**
 * Shared utility module for the Single-Variable Calculus track.
 * Created by Topic 5 (derivative), to be extended by Topics 6–8.
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides:
 *  - Secant / tangent line computation
 *  - Numerical differentiation (forward, central, Richardson)
 *  - Differentiability checking (left/right limits)
 *  - Chain rule evaluation for composed functions
 *  - Derivative curve generation
 *  - Weierstrass nowhere-differentiable function
 *  - Taylor polynomial computation and evaluation (Topic 6)
 *  - Mean Value Theorem point-finding (Topic 6)
 *  - Newton's method and gradient descent trajectories (Topic 6)
 */

import type { Point2D } from './types';

// ── Interfaces ──────────────────────────────────────────────

export interface SecantLine {
  /** Left endpoint */
  x1: number;
  y1: number;
  /** Right endpoint */
  x2: number;
  y2: number;
  /** Slope (f(x2) - f(x1)) / (x2 - x1) */
  slope: number;
}

export interface TangentLine {
  /** Point of tangency */
  x0: number;
  y0: number;
  /** Slope f'(x0) */
  slope: number;
}

export interface DerivativeResult {
  /** Point where derivative is evaluated */
  x: number;
  /** Function value f(x) */
  f_x: number;
  /** Derivative value (exact or numerical) */
  f_prime_x: number;
  /** Method used */
  method: 'exact' | 'forward' | 'central' | 'richardson';
}

export interface ChainRuleStep {
  /** Label for this function in the chain */
  label: string;
  /** Input to this function */
  input: number;
  /** Output of this function */
  output: number;
  /** Local derivative at the input */
  localDerivative: number;
}

export interface ChainRuleResult {
  /** Each step in the composition, from innermost to outermost */
  steps: ChainRuleStep[];
  /** Product of all local derivatives: (f ∘ g ∘ ...)'(x) */
  totalDerivative: number;
}

export interface DifferentiabilityCheck {
  /** Point being tested */
  x0: number;
  /** Left derivative (limit from h < 0), null if diverges */
  leftDerivative: number | null;
  /** Right derivative (limit from h > 0), null if diverges */
  rightDerivative: number | null;
  /** Whether the function is differentiable at x0 */
  isDifferentiable: boolean;
  /** If not differentiable, the reason */
  failureReason?: 'disagreement' | 'infinite' | 'oscillation';
}

// ── Secant and tangent lines ────────────────────────────────

/**
 * Compute the secant line through (a, f(a)) and (a+h, f(a+h)).
 * Returns the two endpoints and the slope (difference quotient).
 */
export function computeSecant(
  f: (x: number) => number,
  a: number,
  h: number,
): SecantLine {
  const x1 = a;
  const y1 = f(a);
  const x2 = a + h;
  const y2 = f(a + h);
  const slope = h !== 0 ? (y2 - y1) / h : 0;
  return { x1, y1, x2, y2, slope };
}

/**
 * Compute the tangent line at (a, f(a)) given the exact derivative.
 * The tangent line equation is y = f(a) + f'(a)(x - a).
 */
export function computeTangent(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  a: number,
): TangentLine {
  return {
    x0: a,
    y0: f(a),
    slope: fPrime(a),
  };
}

/**
 * Evaluate the tangent line y = y0 + slope * (x - x0) at a given x.
 */
export function tangentLineAt(tangent: TangentLine, x: number): number {
  return tangent.y0 + tangent.slope * (x - tangent.x0);
}

/**
 * Evaluate the secant line through its two endpoints at a given x.
 */
export function secantLineAt(secant: SecantLine, x: number): number {
  return secant.y1 + secant.slope * (x - secant.x1);
}

// ── Numerical differentiation ───────────────────────────────

/**
 * Forward difference approximation: [f(x+h) - f(x)] / h.
 * O(h) truncation error, optimal h ~ sqrt(epsilon_mach) ~ 1e-8 for float64.
 */
export function forwardDifference(
  f: (x: number) => number,
  x: number,
  h: number,
): number {
  if (h === 0) return NaN;
  return (f(x + h) - f(x)) / h;
}

/**
 * Central difference approximation: [f(x+h) - f(x-h)] / (2h).
 * O(h^2) truncation error, optimal h ~ epsilon_mach^(1/3) ~ 1e-5 for float64.
 */
export function centralDifference(
  f: (x: number) => number,
  x: number,
  h: number,
): number {
  if (h === 0) return NaN;
  return (f(x + h) - f(x - h)) / (2 * h);
}

/**
 * Richardson extrapolation for improved numerical derivative.
 *
 * Strategy: compute central differences at h and h/2, then combine
 * to cancel the leading error term: (4 * d(h/2) - d(h)) / 3.
 * This yields O(h^4) accuracy from two O(h^2) estimates.
 *
 * Higher orders recurse: each level eliminates one more error term.
 */
export function richardsonExtrapolation(
  f: (x: number) => number,
  x: number,
  h: number,
  order: number = 1,
): number {
  if (order <= 0) {
    return centralDifference(f, x, h);
  }

  const d1 = richardsonExtrapolation(f, x, h, order - 1);
  const d2 = richardsonExtrapolation(f, x, h / 2, order - 1);
  const factor = Math.pow(4, order);
  return (factor * d2 - d1) / (factor - 1);
}

// ── Differentiability checking ──────────────────────────────

/**
 * Check differentiability at x0 by comparing left and right difference quotients.
 *
 * Strategy: evaluate the difference quotient at decreasing h values from both
 * sides. If both sequences converge to the same finite limit, the function is
 * differentiable. Otherwise, classify the failure:
 *  - 'disagreement': left and right limits exist but differ (corner, e.g., |x|)
 *  - 'infinite': one or both limits diverge to ±∞ (cusp or vertical tangent)
 *  - 'oscillation': limits don't settle (Weierstrass-type behavior)
 */
export function checkDifferentiability(
  f: (x: number) => number,
  x0: number,
  hValues: number[] = [0.1, 0.01, 0.001, 0.0001, 0.00001],
): DifferentiabilityCheck {
  const leftSlopes: number[] = [];
  const rightSlopes: number[] = [];

  for (const h of hValues) {
    const left = (f(x0) - f(x0 - h)) / h;
    const right = (f(x0 + h) - f(x0)) / h;
    leftSlopes.push(left);
    rightSlopes.push(right);
  }

  const leftLast = leftSlopes[leftSlopes.length - 1];
  const rightLast = rightSlopes[rightSlopes.length - 1];

  // Check for divergence
  const leftDiverges = !isFinite(leftLast) || Math.abs(leftLast) > 1e10;
  const rightDiverges = !isFinite(rightLast) || Math.abs(rightLast) > 1e10;

  if (leftDiverges || rightDiverges) {
    return {
      x0,
      leftDerivative: leftDiverges ? null : leftLast,
      rightDerivative: rightDiverges ? null : rightLast,
      isDifferentiable: false,
      failureReason: 'infinite',
    };
  }

  // Check for oscillation: are the last few values settling?
  if (hValues.length >= 3) {
    const leftDiffs = Math.abs(leftSlopes[leftSlopes.length - 1] - leftSlopes[leftSlopes.length - 2]);
    const rightDiffs = Math.abs(rightSlopes[rightSlopes.length - 1] - rightSlopes[rightSlopes.length - 2]);
    const prevLeftDiff = Math.abs(leftSlopes[leftSlopes.length - 2] - leftSlopes[leftSlopes.length - 3]);
    const prevRightDiff = Math.abs(rightSlopes[rightSlopes.length - 2] - rightSlopes[rightSlopes.length - 3]);

    // If differences aren't decreasing, it's oscillating
    if (leftDiffs > prevLeftDiff * 0.5 && leftDiffs > 0.01) {
      return {
        x0,
        leftDerivative: null,
        rightDerivative: null,
        isDifferentiable: false,
        failureReason: 'oscillation',
      };
    }
    if (rightDiffs > prevRightDiff * 0.5 && rightDiffs > 0.01) {
      return {
        x0,
        leftDerivative: null,
        rightDerivative: null,
        isDifferentiable: false,
        failureReason: 'oscillation',
      };
    }
  }

  // Check for disagreement between left and right limits
  const tolerance = 0.01;
  if (Math.abs(leftLast - rightLast) > tolerance) {
    return {
      x0,
      leftDerivative: leftLast,
      rightDerivative: rightLast,
      isDifferentiable: false,
      failureReason: 'disagreement',
    };
  }

  // Both sides converge to the same value
  const derivative = (leftLast + rightLast) / 2;
  return {
    x0,
    leftDerivative: derivative,
    rightDerivative: derivative,
    isDifferentiable: true,
  };
}

// ── Chain rule evaluation ───────────────────────────────────

/**
 * Evaluate the chain rule for a composition of functions.
 *
 * Given functions f_1, f_2, ..., f_n (innermost first) and an input x,
 * computes the composition f_n ∘ ... ∘ f_2 ∘ f_1 and the total derivative
 * as the product of local derivatives at each stage.
 *
 * Example: for sin(x^2) at x = 1.2,
 *   steps = [{ f: x => x*x, f_prime: x => 2*x, label: 'x²' },
 *            { f: Math.sin, f_prime: Math.cos, label: 'sin' }]
 *   x = 1.2
 *
 * Returns the intermediate values and derivatives at each stage.
 */
export function evaluateChainRule(
  steps: Array<{
    f: (x: number) => number;
    fPrime: (x: number) => number;
    label: string;
  }>,
  x: number,
): ChainRuleResult {
  const result: ChainRuleStep[] = [];
  let currentInput = x;
  let totalDerivative = 1;

  for (const step of steps) {
    const output = step.f(currentInput);
    const localDeriv = step.fPrime(currentInput);

    result.push({
      label: step.label,
      input: currentInput,
      output,
      localDerivative: localDeriv,
    });

    totalDerivative *= localDeriv;
    currentInput = output;
  }

  return {
    steps: result,
    totalDerivative,
  };
}

// ── Curve generation ────────────────────────────────────────

/**
 * Generate a curve as an array of Point2D, sampling f on [a, b] at n points.
 * Skips points where f(x) is not finite (e.g., 1/x at x=0).
 */
export function generateCurve(
  f: (x: number) => number,
  a: number,
  b: number,
  n: number = 500,
): Point2D[] {
  const points: Point2D[] = [];
  const dx = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = a + i * dx;
    const y = f(x);
    if (isFinite(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * Generate a derivative curve: array of { x, y } where y = f'(x).
 * Uses the exact derivative function (not numerical approximation).
 */
export function generateDerivativeCurve(
  fPrime: (x: number) => number,
  a: number,
  b: number,
  n: number = 500,
): Point2D[] {
  return generateCurve(fPrime, a, b, n);
}

// ── Special functions ───────────────────────────────────────

/**
 * Precomputed power lookup tables for the default Weierstrass parameters.
 * a^k and b^k for k = 0..MAX_WEIERSTRASS_TERMS-1, giving O(1) access
 * per term instead of recomputing Math.pow on every call.
 */
const MAX_WEIERSTRASS_TERMS = 50;
const WEIERSTRASS_A_POWERS: number[] = [];
const WEIERSTRASS_B_POWERS: number[] = [];

{
  let aPow = 1;
  let bPow = 1;
  for (let k = 0; k < MAX_WEIERSTRASS_TERMS; k++) {
    WEIERSTRASS_A_POWERS.push(aPow);
    WEIERSTRASS_B_POWERS.push(bPow);
    aPow *= 0.5;
    bPow *= 7;
  }
}

/**
 * Weierstrass function partial sum: W(x) = sum_{k=0}^{terms-1} a^k * cos(b^k * pi * x).
 *
 * For 0 < a < 1 and b an odd integer with ab > 1, the infinite series defines
 * a function that is continuous everywhere but differentiable nowhere. The
 * partial sum with finitely many terms is smooth, but increasing terms reveals
 * ever-finer oscillations that prevent any tangent line from settling in the limit.
 *
 * Default parameters: a = 0.5, b = 7 (ab = 3.5 > 1), which satisfy these
 * classical Weierstrass conditions.
 */
export function weierstrass(
  x: number,
  a: number = 0.5,
  b: number = 7,
  terms: number = 50,
): number {
  // Use precomputed lookup tables for default parameters (the common case)
  const usePrecomputed = a === 0.5 && b === 7 && terms <= MAX_WEIERSTRASS_TERMS;

  let sum = 0;
  if (usePrecomputed) {
    for (let k = 0; k < terms; k++) {
      sum += WEIERSTRASS_A_POWERS[k] * Math.cos(WEIERSTRASS_B_POWERS[k] * Math.PI * x);
    }
  } else {
    let aPow = 1;
    for (let k = 0; k < terms; k++) {
      sum += aPow * Math.cos(Math.pow(b, k) * Math.PI * x);
      aPow *= a;
    }
  }
  return sum;
}

// ── Backpropagation computation ─────────────────────────────

export interface BackpropNode {
  /** Node label */
  label: string;
  /** Computed value (forward pass) */
  value: number;
  /** Gradient dL/d(this node) (backward pass) */
  gradient: number;
}

export interface BackpropGraph {
  nodes: BackpropNode[];
  /** Final loss value */
  loss: number;
  /** Gradient of loss w.r.t. weight: dL/dw */
  dLdw: number;
  /** Gradient of loss w.r.t. bias: dL/db */
  dLdb: number;
}

/**
 * Compute forward and backward pass for a single-neuron network:
 *   z = w*x + b
 *   a = sigma(z)
 *   L = (a - y)^2
 *
 * Returns all node values and gradients.
 */
export function computeBackprop(
  w: number,
  b: number,
  x: number,
  y: number,
  sigma: (z: number) => number,
  sigmaPrime: (z: number) => number,
): BackpropGraph {
  // Forward pass
  const z = w * x + b;
  const a = sigma(z);
  const L = (a - y) * (a - y);

  // Backward pass (chain rule at each node)
  const dLda = 2 * (a - y);
  const dadz = sigmaPrime(z);
  const dzdw = x;
  const dzdb = 1;

  const dzdx = w;

  const dLdz = dLda * dadz;
  const dLdw = dLdz * dzdw;
  const dLdb = dLdz * dzdb;
  const dLdx = dLdz * dzdx;

  return {
    nodes: [
      { label: 'x', value: x, gradient: dLdx },
      { label: 'w', value: w, gradient: dLdw },
      { label: 'b', value: b, gradient: dLdb },
      { label: 'z = wx + b', value: z, gradient: dLdz },
      { label: 'a = σ(z)', value: a, gradient: dLda },
      { label: 'L = (a − y)²', value: L, gradient: 1 },
    ],
    loss: L,
    dLdw,
    dLdb,
  };
}

// ── Numerical error analysis ────────────────────────────────

/**
 * Compute forward, central, and Richardson errors at varying h values.
 * Returns arrays for plotting error-vs-h curves (log-log).
 */
export function numericalDifferentiationErrors(
  f: (x: number) => number,
  x: number,
  exactDerivative: number,
  hValues: number[],
): {
  h: number[];
  forwardError: number[];
  centralError: number[];
  richardsonError: number[];
} {
  const forwardError: number[] = [];
  const centralError: number[] = [];
  const richardsonError: number[] = [];

  for (const h of hValues) {
    const fwd = forwardDifference(f, x, h);
    const cen = centralDifference(f, x, h);
    const rich = richardsonExtrapolation(f, x, h, 1);

    forwardError.push(Math.abs(fwd - exactDerivative));
    centralError.push(Math.abs(cen - exactDerivative));
    richardsonError.push(Math.abs(rich - exactDerivative));
  }

  return {
    h: hValues,
    forwardError,
    centralError,
    richardsonError,
  };
}

// ── Taylor polynomial computation (Topic 6) ─────────────────

export interface TaylorPolynomial {
  /** Expansion center a */
  center: number;
  /** Polynomial degree n */
  degree: number;
  /** Coefficients: coefficients[k] = f^(k)(a) / k! */
  coefficients: number[];
}

export interface TaylorEvaluation {
  /** Evaluation point */
  x: number;
  /** Taylor polynomial value T_n(x) */
  taylorValue: number;
  /** Exact function value f(x) */
  exactValue: number;
  /** Absolute error |f(x) - T_n(x)| */
  error: number;
  /** Lagrange remainder bound, null if M_{n+1} not provided */
  lagrangeBound: number | null;
}

export interface MVTResult {
  /** Left endpoint */
  a: number;
  /** Right endpoint */
  b: number;
  /** Secant slope (f(b) - f(a)) / (b - a) */
  secantSlope: number;
  /** Interior point where f'(c) = secant slope */
  c: number;
  /** Value f'(c) at the MVT point */
  fPrimeC: number;
}

export interface NewtonStep {
  /** Current iterate */
  x: number;
  /** f(x) or f'(x) depending on context */
  fx: number;
  /** Derivative used in the update */
  fpx: number;
  /** Next iterate */
  nextX: number;
  /** Local quadratic Taylor model (for optimization) */
  taylorModel: TaylorPolynomial | null;
}

/**
 * Compute the degree-n Taylor polynomial of f centered at a.
 * `derivatives` is an array [f, f', f'', ...] of functions.
 * The array must have at least degree + 1 entries.
 */
export function computeTaylorPolynomial(
  derivatives: ((x: number) => number)[],
  center: number,
  degree: number,
): TaylorPolynomial {
  const n = Math.min(degree, derivatives.length - 1);
  const coefficients: number[] = [];
  let factorial = 1;
  for (let k = 0; k <= n; k++) {
    if (k > 0) factorial *= k;
    coefficients.push(derivatives[k](center) / factorial);
  }
  return { center, degree: n, coefficients };
}

/**
 * Evaluate a Taylor polynomial at x using Horner's method.
 * T_n(x) = a_0 + a_1*(x-c) + a_2*(x-c)^2 + ... + a_n*(x-c)^n
 */
export function evaluateTaylorPolynomial(
  poly: TaylorPolynomial,
  x: number,
): number {
  const dx = x - poly.center;
  let result = 0;
  // Horner's method: evaluate from highest degree down
  for (let k = poly.degree; k >= 0; k--) {
    result = result * dx + poly.coefficients[k];
  }
  return result;
}

/**
 * Evaluate a Taylor polynomial and compute the approximation error.
 * If maxDerivBound (an upper bound on |f^(n+1)| on [a,x]) is provided,
 * also computes the Lagrange remainder bound.
 */
export function evaluateTaylorWithError(
  f: (x: number) => number,
  poly: TaylorPolynomial,
  x: number,
  maxDerivBound?: number,
): TaylorEvaluation {
  const taylorValue = evaluateTaylorPolynomial(poly, x);
  const exactValue = f(x);
  const error = Math.abs(exactValue - taylorValue);

  let lagrangeBound: number | null = null;
  if (maxDerivBound !== undefined) {
    const dx = Math.abs(x - poly.center);
    let factorial = 1;
    for (let k = 1; k <= poly.degree + 1; k++) factorial *= k;
    lagrangeBound = (maxDerivBound * Math.pow(dx, poly.degree + 1)) / factorial;
  }

  return { x, taylorValue, exactValue, error, lagrangeBound };
}

// ── Mean Value Theorem point-finding (Topic 6) ──────────────

/**
 * Find a single MVT point c in (a, b) where f'(c) = (f(b)-f(a))/(b-a).
 * Uses bisection on g(x) = f'(x) - secantSlope, which is robust and
 * guaranteed to converge whenever g has a sign change.
 * Returns null if no sign change is detected.
 */
export function findMVTPoint(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  a: number,
  b: number,
  tolerance: number = 1e-12,
): MVTResult | null {
  const secantSlope = (f(b) - f(a)) / (b - a);
  const g = (x: number) => fPrime(x) - secantSlope;

  // Scan for a sign change
  const nScan = 200;
  const dx = (b - a) / nScan;
  let left = a + dx * 0.01; // avoid exact endpoints
  let gLeft = g(left);

  for (let i = 1; i <= nScan; i++) {
    const right = a + dx * i - (i === nScan ? dx * 0.01 : 0);
    const gRight = g(right);

    if (gLeft * gRight <= 0) {
      // Bisect this interval
      let lo = left;
      let hi = right;
      for (let j = 0; j < 60; j++) {
        const mid = (lo + hi) / 2;
        const gMid = g(mid);
        if (Math.abs(gMid) < tolerance) {
          lo = mid;
          break;
        }
        if (gLeft * gMid <= 0) {
          hi = mid;
        } else {
          lo = mid;
          gLeft = gMid;
        }
      }
      const c = (lo + hi) / 2;
      return { a, b, secantSlope, c, fPrimeC: fPrime(c) };
    }

    left = right;
    gLeft = gRight;
  }

  return null;
}

/**
 * Find all MVT points c in (a, b).
 * Scans at `resolution` equally-spaced points for sign changes of
 * g(x) = f'(x) - secantSlope, then bisects each bracket.
 */
export function findAllMVTPoints(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  a: number,
  b: number,
  resolution: number = 1000,
  tolerance: number = 1e-12,
): MVTResult[] {
  const secantSlope = (f(b) - f(a)) / (b - a);
  const g = (x: number) => fPrime(x) - secantSlope;
  const results: MVTResult[] = [];
  const dx = (b - a) / resolution;

  let prevX = a + dx * 0.001;
  let prevG = g(prevX);

  for (let i = 1; i <= resolution; i++) {
    const currX = i < resolution ? a + dx * i : b - dx * 0.001;
    const currG = g(currX);

    if (prevG * currG <= 0 && (prevG !== 0 || currG !== 0)) {
      // Bisect
      let lo = prevX;
      let hi = currX;
      let gLo = prevG;
      for (let j = 0; j < 60; j++) {
        const mid = (lo + hi) / 2;
        const gMid = g(mid);
        if (Math.abs(gMid) < tolerance) {
          lo = mid;
          hi = mid;
          break;
        }
        if (gLo * gMid <= 0) {
          hi = mid;
        } else {
          lo = mid;
          gLo = gMid;
        }
      }
      const c = (lo + hi) / 2;
      // Avoid duplicates (within tolerance)
      if (results.length === 0 || Math.abs(c - results[results.length - 1].c) > tolerance * 100) {
        results.push({ a, b, secantSlope, c, fPrimeC: fPrime(c) });
      }
    }

    prevX = currX;
    prevG = currG;
  }

  return results;
}

// ── Newton's method and gradient descent (Topic 6) ──────────

/**
 * One step of Newton's method for optimization:
 * x_{k+1} = x_k - f'(x_k) / f''(x_k)
 * Includes the local quadratic Taylor model centered at x.
 */
export function newtonOptimizationStep(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  fDoublePrime: (x: number) => number,
  x: number,
): NewtonStep {
  const fx = f(x);
  const fpx = fPrime(x);
  const fppx = fDoublePrime(x);
  const nextX = fppx !== 0 ? x - fpx / fppx : NaN;

  // Build local T_2 model: f(x) + f'(x)(t-x) + f''(x)/2 (t-x)^2
  const taylorModel: TaylorPolynomial = {
    center: x,
    degree: 2,
    coefficients: [fx, fpx, fppx / 2],
  };

  return { x, fx, fpx, nextX, taylorModel };
}

/**
 * One step of Newton's method for root-finding:
 * x_{k+1} = x_k - g(x_k) / g'(x_k)
 */
export function newtonRootStep(
  g: (x: number) => number,
  gPrime: (x: number) => number,
  x: number,
): NewtonStep {
  const gx = g(x);
  const gpx = gPrime(x);
  const nextX = gpx !== 0 ? x - gx / gpx : NaN;
  return { x, fx: gx, fpx: gpx, nextX, taylorModel: null };
}

/**
 * Run gradient descent for maxSteps steps.
 * x_{k+1} = x_k - eta * f'(x_k)
 * Returns the full trajectory including function values.
 * Stops early if |x| exceeds divergence guard or gradient is near zero.
 */
export function gradientDescentTrajectory(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  x0: number,
  eta: number,
  maxSteps: number,
): Array<{ k: number; x: number; fx: number; grad: number }> {
  const trajectory: Array<{ k: number; x: number; fx: number; grad: number }> = [];
  let x = x0;

  for (let k = 0; k <= maxSteps; k++) {
    const fx = f(x);
    const grad = fPrime(x);
    trajectory.push({ k, x, fx, grad });

    if (k === maxSteps) break;
    if (Math.abs(x) > 1e6 || !isFinite(fx)) break;

    x = x - eta * grad;
  }

  return trajectory;
}

/**
 * Run Newton's optimization method for maxSteps steps.
 * x_{k+1} = x_k - f'(x_k) / f''(x_k)
 * Returns the full trajectory with local quadratic Taylor models.
 */
export function newtonTrajectory(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  fDoublePrime: (x: number) => number,
  x0: number,
  maxSteps: number,
): Array<{ k: number; x: number; fx: number; taylorModel: TaylorPolynomial }> {
  const trajectory: Array<{ k: number; x: number; fx: number; taylorModel: TaylorPolynomial }> = [];
  let x = x0;

  for (let k = 0; k <= maxSteps; k++) {
    const step = newtonOptimizationStep(f, fPrime, fDoublePrime, x);
    trajectory.push({ k, x: step.x, fx: step.fx, taylorModel: step.taylorModel! });

    if (k === maxSteps) break;
    if (!isFinite(step.nextX) || Math.abs(step.nextX) > 1e6) break;

    x = step.nextX;
  }

  return trajectory;
}
