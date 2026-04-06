/**
 * Shared ODE utility functions for Track 6: Ordinary Differential Equations.
 *
 * Created by Topic 21 (First-Order ODEs & Existence Theorems).
 * Will be extended by:
 *   - Topic 22 (Linear Systems & Matrix Exponential): matrix exponential, eigenvalue methods
 *   - Topic 23 (Stability & Dynamical Systems): phase portrait generators, Lyapunov analysis
 *   - Topic 24 (Numerical Methods for ODEs): higher-order solvers, adaptive stepping, error analysis
 *
 * All existing functions and interfaces remain stable across extensions.
 * All functions are pure and deterministic — no Math.random().
 */

// Import seededRandom for use in this module and re-export for downstream consumers
import { seededRandom } from './limits';
export { seededRandom } from './limits';

// ── Interfaces ──────────────────────────────────────────────

/** A single point in a direction field, carrying the slope f(t, y). */
export interface DirectionFieldPoint {
  t: number;
  y: number;
  /** The slope f(t, y) at this point */
  slope: number;
  /** Magnitude √(1 + slope²) for normalization of line-segment length */
  magnitude: number;
}

/**
 * Solution of a scalar first-order IVP.
 *
 * Named ScalarODESolution to avoid conflict with the vector-valued
 * ODESolution in types.ts (used for systems in Topics 22–24).
 */
export interface ScalarODESolution {
  t: number[];
  y: number[];
  method: 'euler' | 'rk4' | 'exact';
}

/** One Picard iterate y_n(t) evaluated on a grid. */
export interface PicardIterate {
  /** Iteration number (0 = constant initial guess) */
  n: number;
  /** Evaluated values [{t, y}, ...] */
  values: Array<{ t: number; y: number }>;
  /** ‖y_n − y*‖_∞ if exact solution is known */
  maxError?: number;
}

/** Estimate of the Lipschitz constant of f(t, y) with respect to y. */
export interface LipschitzEstimate {
  /** Estimated Lipschitz constant */
  L: number;
  /** Whether f appears Lipschitz in y on the sampled domain */
  isLipschitz: boolean;
  /** Points where |∂f/∂y| is large or numerically unbounded */
  problematicPoints: Array<{ t: number; y: number }>;
}

// ── Direction field computation ─────────────────────────────

/**
 * Compute a direction field on a uniform grid.
 * Returns an array of {t, y, slope, magnitude} for each gridpoint.
 *
 * @param f - Right-hand side f(t, y)
 * @param tRange - [t_min, t_max]
 * @param yRange - [y_min, y_max]
 * @param nt - Number of gridpoints in the t direction
 * @param ny - Number of gridpoints in the y direction
 * @returns Array of DirectionFieldPoint
 */
export function computeDirectionField(
  f: (t: number, y: number) => number,
  tRange: [number, number],
  yRange: [number, number],
  nt: number,
  ny: number,
): DirectionFieldPoint[] {
  const points: DirectionFieldPoint[] = [];
  const dt = (tRange[1] - tRange[0]) / (nt - 1);
  const dy = (yRange[1] - yRange[0]) / (ny - 1);

  for (let i = 0; i < nt; i++) {
    const t = tRange[0] + i * dt;
    for (let j = 0; j < ny; j++) {
      const y = yRange[0] + j * dy;
      const slope = f(t, y);
      // Clamp slope to avoid rendering artifacts from near-infinite values
      const clampedSlope = Math.abs(slope) > 1e6 ? Math.sign(slope) * 1e6 : slope;
      const magnitude = Math.sqrt(1 + clampedSlope * clampedSlope);
      points.push({ t, y, slope: clampedSlope, magnitude });
    }
  }

  return points;
}

// ── Euler method ────────────────────────────────────────────

/**
 * Solve an IVP using the forward Euler method.
 * y_{n+1} = y_n + h · f(t_n, y_n)
 *
 * Terminates early if |y| exceeds the blow-up threshold (1e6),
 * which prevents rendering artifacts for equations with finite-time blow-up.
 *
 * @param f - Right-hand side f(t, y)
 * @param t0 - Initial time
 * @param y0 - Initial value
 * @param tEnd - Final time (can be < t0 for backward integration)
 * @param h - Step size (always positive; direction inferred from t0, tEnd)
 * @returns ScalarODESolution with t and y arrays
 */
export function eulerMethod(
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  tEnd: number,
  h: number,
): ScalarODESolution {
  const BLOW_UP = 1e6;
  const direction = tEnd >= t0 ? 1 : -1;
  const step = direction * Math.abs(h);
  const nSteps = Math.ceil(Math.abs(tEnd - t0) / Math.abs(h));

  const ts: number[] = [t0];
  const ys: number[] = [y0];

  let t = t0;
  let y = y0;

  for (let i = 0; i < nSteps; i++) {
    const slope = f(t, y);
    y = y + step * slope;
    t = t + step;

    // Clamp to final time on the last step
    if (direction > 0 && t > tEnd) t = tEnd;
    if (direction < 0 && t < tEnd) t = tEnd;

    ts.push(t);
    ys.push(y);

    if (Math.abs(y) > BLOW_UP) break;
  }

  return { t: ts, y: ys, method: 'euler' };
}

// ── Classical RK4 method ────────────────────────────────────

/**
 * Solve an IVP using the classical Runge-Kutta 4th-order method.
 * Much more accurate than Euler for the same step size.
 *
 * @param f - Right-hand side f(t, y)
 * @param t0 - Initial time
 * @param y0 - Initial value
 * @param tEnd - Final time
 * @param h - Step size (always positive; direction inferred)
 * @returns ScalarODESolution with t and y arrays
 */
export function rk4Method(
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  tEnd: number,
  h: number,
): ScalarODESolution {
  const BLOW_UP = 1e6;
  const direction = tEnd >= t0 ? 1 : -1;
  const step = direction * Math.abs(h);
  const nSteps = Math.ceil(Math.abs(tEnd - t0) / Math.abs(h));

  const ts: number[] = [t0];
  const ys: number[] = [y0];

  let t = t0;
  let y = y0;

  for (let i = 0; i < nSteps; i++) {
    const k1 = f(t, y);
    const k2 = f(t + step / 2, y + (step / 2) * k1);
    const k3 = f(t + step / 2, y + (step / 2) * k2);
    const k4 = f(t + step, y + step * k3);

    y = y + (step / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    t = t + step;

    if (direction > 0 && t > tEnd) t = tEnd;
    if (direction < 0 && t < tEnd) t = tEnd;

    ts.push(t);
    ys.push(y);

    if (Math.abs(y) > BLOW_UP) break;
  }

  return { t: ts, y: ys, method: 'rk4' };
}

// ── Picard iteration ────────────────────────────────────────

/**
 * Compute the first n Picard iterates for an IVP.
 *
 * y_0(t) = y0  (constant initial guess)
 * y_{n+1}(t) = y0 + ∫_{t0}^{t} f(s, y_n(s)) ds
 *
 * Uses composite Simpson's rule for the integral at each evaluation point.
 * When an exact solution is provided, computes the sup-norm error ‖y_n − y*‖_∞.
 *
 * @param f - Right-hand side f(t, y)
 * @param t0 - Initial time
 * @param y0 - Initial value
 * @param n - Number of iterations (returns iterates 0 through n)
 * @param tRange - [t_min, t_max] evaluation range
 * @param numPoints - Number of evaluation points in tRange
 * @param exactSolution - Optional exact solution for error computation
 * @returns Array of PicardIterate (one per iteration, 0 through n)
 */
export function picardIteration(
  f: (t: number, y: number) => number,
  t0: number,
  y0: number,
  n: number,
  tRange: [number, number],
  numPoints: number,
  exactSolution?: (t: number) => number,
): PicardIterate[] {
  const tMin = tRange[0];
  const tMax = tRange[1];
  const dt = (tMax - tMin) / (numPoints - 1);

  // Build the evaluation grid
  const tGrid: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    tGrid.push(tMin + i * dt);
  }

  // y_0(t) = y0 (constant)
  let currentValues = tGrid.map(() => y0);
  const iterates: PicardIterate[] = [];

  // Record iterate 0
  const iter0: PicardIterate = {
    n: 0,
    values: tGrid.map((t, i) => ({ t, y: currentValues[i] })),
  };
  if (exactSolution) {
    iter0.maxError = tGrid.reduce(
      (max, t, i) => Math.max(max, Math.abs(currentValues[i] - exactSolution(t))),
      0,
    );
  }
  iterates.push(iter0);

  // Picard iterates 1 through n
  for (let k = 1; k <= n; k++) {
    const nextValues: number[] = [];

    for (let i = 0; i < numPoints; i++) {
      const tEval = tGrid[i];
      // Compute ∫_{t0}^{tEval} f(s, y_{k-1}(s)) ds using composite Simpson
      nextValues.push(y0 + simpsonIntegral(f, currentValues, tGrid, t0, tEval));
    }

    const iterate: PicardIterate = {
      n: k,
      values: tGrid.map((t, i) => ({ t, y: nextValues[i] })),
    };
    if (exactSolution) {
      iterate.maxError = tGrid.reduce(
        (max, t, i) => Math.max(max, Math.abs(nextValues[i] - exactSolution(t))),
        0,
      );
    }
    iterates.push(iterate);
    currentValues = nextValues;
  }

  return iterates;
}

/**
 * Composite Simpson's rule for ∫_{t0}^{tEnd} f(s, y_prev(s)) ds,
 * where y_prev is given as discrete values on tGrid.
 *
 * Linearly interpolates y_prev between grid points. If the integration
 * range doesn't align with the grid, uses the nearest grid values.
 */
function simpsonIntegral(
  f: (t: number, y: number) => number,
  yValues: number[],
  tGrid: number[],
  t0: number,
  tEnd: number,
): number {
  if (Math.abs(tEnd - t0) < 1e-14) return 0;

  // Number of sub-intervals for Simpson (must be even)
  const nSub = 40;
  const h = (tEnd - t0) / nSub;

  // Interpolate y_prev at an arbitrary t value
  const interpY = (t: number): number => {
    if (tGrid.length === 0) return yValues[0] ?? 0;
    if (t <= tGrid[0]) return yValues[0];
    if (t >= tGrid[tGrid.length - 1]) return yValues[yValues.length - 1];
    // Binary search for the enclosing interval
    let lo = 0;
    let hi = tGrid.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (tGrid[mid] <= t) lo = mid;
      else hi = mid;
    }
    const frac = (t - tGrid[lo]) / (tGrid[hi] - tGrid[lo]);
    return yValues[lo] + frac * (yValues[hi] - yValues[lo]);
  };

  // Composite Simpson
  let sum = f(t0, interpY(t0)) + f(tEnd, interpY(tEnd));
  for (let i = 1; i < nSub; i++) {
    const s = t0 + i * h;
    const weight = i % 2 === 0 ? 2 : 4;
    sum += weight * f(s, interpY(s));
  }

  return (h / 3) * sum;
}

// ── Lipschitz constant estimation ───────────────────────────

/**
 * Estimate the Lipschitz constant of f(t, y) with respect to y
 * on a rectangular domain, using finite differences to approximate |∂f/∂y|.
 *
 * @param f - Right-hand side f(t, y)
 * @param tRange - [t_min, t_max]
 * @param yRange - [y_min, y_max]
 * @param gridSize - Number of sample points per dimension
 * @returns LipschitzEstimate with estimated L and problematic points
 */
export function estimateLipschitz(
  f: (t: number, y: number) => number,
  tRange: [number, number],
  yRange: [number, number],
  gridSize: number = 50,
): LipschitzEstimate {
  const dt = (tRange[1] - tRange[0]) / (gridSize - 1);
  const dy = (yRange[1] - yRange[0]) / (gridSize - 1);
  const epsilon = 1e-6;
  const LARGE_DERIV = 1e4;

  let maxDfDy = 0;
  const problematicPoints: Array<{ t: number; y: number }> = [];

  for (let i = 0; i < gridSize; i++) {
    const t = tRange[0] + i * dt;
    for (let j = 0; j < gridSize; j++) {
      const y = yRange[0] + j * dy;
      // Central difference approximation of ∂f/∂y
      const dfdy = Math.abs((f(t, y + epsilon) - f(t, y - epsilon)) / (2 * epsilon));

      if (dfdy > maxDfDy) {
        maxDfDy = dfdy;
      }
      if (dfdy > LARGE_DERIV) {
        problematicPoints.push({ t, y });
      }
    }
  }

  return {
    L: maxDfDy,
    isLipschitz: problematicPoints.length === 0,
    problematicPoints,
  };
}

// ── Equilibria finder ───────────────────────────────────────

/**
 * Find equilibria of an autonomous ODE y' = f(y) on an interval.
 * Equilibria are values y* where f(y*) = 0.
 *
 * Uses sign-change detection on a fine grid, followed by bisection refinement.
 *
 * @param f - Right-hand side f(y) (autonomous: no t dependence)
 * @param yRange - [y_min, y_max]
 * @param gridSize - Number of sample points (default 200)
 * @returns Array of equilibrium values y*, sorted ascending
 */
export function findEquilibria(
  f: (y: number) => number,
  yRange: [number, number],
  gridSize: number = 200,
): number[] {
  const dy = (yRange[1] - yRange[0]) / gridSize;
  const equilibria: number[] = [];
  const BISECTION_ITERS = 40;

  let prevVal = f(yRange[0]);

  for (let i = 1; i <= gridSize; i++) {
    const y = yRange[0] + i * dy;
    const val = f(y);

    // Check for exact zero (within tolerance)
    if (Math.abs(val) < 1e-12) {
      equilibria.push(y);
    }
    // Sign change → bisect to find the root
    else if (prevVal * val < 0) {
      let lo = y - dy;
      let hi = y;
      for (let iter = 0; iter < BISECTION_ITERS; iter++) {
        const mid = (lo + hi) / 2;
        if (f(mid) * f(lo) < 0) hi = mid;
        else lo = mid;
      }
      equilibria.push((lo + hi) / 2);
    }

    prevVal = val;
  }

  return equilibria;
}
