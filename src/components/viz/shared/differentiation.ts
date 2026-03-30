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
 * Weierstrass function partial sum: W(x) = sum_{k=0}^{terms-1} a^k * cos(b^k * pi * x).
 *
 * For 0 < a < 1 and b an odd integer with ab > 1 + 3pi/2, this function is
 * continuous everywhere but differentiable nowhere. The partial sum with
 * finitely many terms is smooth, but increasing terms reveals ever-finer
 * oscillations that prevent any tangent line from settling.
 *
 * Default parameters: a = 0.5, b = 7 (ab = 3.5 > 1 + 3pi/2 ≈ 5.71... — wait,
 * actually ab = 3.5 < 5.71, so we use the relaxed condition ab > 1 which
 * suffices for Weierstrass's original construction with appropriate b).
 */
export function weierstrass(
  x: number,
  a: number = 0.5,
  b: number = 7,
  terms: number = 50,
): number {
  let sum = 0;
  let aPow = 1; // a^k, computed incrementally to avoid Math.pow per term
  for (let k = 0; k < terms; k++) {
    sum += aPow * Math.cos(Math.pow(b, k) * Math.PI * x);
    aPow *= a;
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

  const dLdz = dLda * dadz;
  const dLdw = dLdz * dzdw;
  const dLdb = dLdz * dzdb;

  return {
    nodes: [
      { label: 'x', value: x, gradient: 0 },
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
