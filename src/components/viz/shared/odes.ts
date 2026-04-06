/**
 * Shared ODE utility functions for Track 6: Ordinary Differential Equations.
 *
 * Created by Topic 21 (First-Order ODEs & Existence Theorems).
 * Extended by:
 *   - Topic 22 (Linear Systems & Matrix Exponential): matrix exponential, eigenvalue methods
 *   - Topic 23 (Stability & Dynamical Systems): nonlinear phase portraits, Lyapunov analysis ← CURRENT
 *   - Topic 24 (Numerical Methods for ODEs): higher-order solvers, adaptive stepping, error analysis
 *
 * All existing functions and interfaces remain stable across extensions.
 * All functions are pure and deterministic — no Math.random().
 */

// Re-export seededRandom for downstream consumers
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
    // Use a reduced step on the final iteration to land exactly on tEnd
    const remaining = tEnd - t;
    const currentStep =
      Math.abs(remaining) < Math.abs(step) ? remaining : step;

    const slope = f(t, y);
    y = y + currentStep * slope;
    t = t + currentStep;

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
    // Use a reduced step on the final iteration to land exactly on tEnd
    const remaining = tEnd - t;
    const currentStep =
      Math.abs(remaining) < Math.abs(step) ? remaining : step;

    const k1 = f(t, y);
    const k2 = f(t + currentStep / 2, y + (currentStep / 2) * k1);
    const k3 = f(t + currentStep / 2, y + (currentStep / 2) * k2);
    const k4 = f(t + currentStep, y + currentStep * k3);

    y = y + (currentStep / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    t = t + currentStep;

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

  // De-duplicate: merge values within epsilon to avoid duplicate equilibrium lines
  const MERGE_EPS = dy * 2;
  const deduped: number[] = [];
  for (const eq of equilibria) {
    if (deduped.length === 0 || Math.abs(eq - deduped[deduped.length - 1]) > MERGE_EPS) {
      deduped.push(eq);
    }
  }

  return deduped;
}

// ═══════════════════════════════════════════════════════════════
// Topic 22: Linear Systems & Matrix Exponential
// ═══════════════════════════════════════════════════════════════

// ── Interfaces (Topic 22) ──────────────────────────────────

/** A 2×2 real matrix stored as four named entries. */
export interface Matrix2x2 {
  a11: number;
  a12: number;
  a21: number;
  a22: number;
}

/** Eigenvalue/eigenvector decomposition of a 2×2 matrix. */
export interface EigenResult2x2 {
  /** Eigenvalues: real parts in .real, imaginary parts in .imag */
  eigenvalues: { real: [number, number]; imag: [number, number] };
  /**
   * Eigenvectors as column arrays (each [v1, v2]).
   * null when eigenvalues are complex (use real/imag decomposition instead).
   */
  eigenvectors: [number, number][] | null;
  /** True if both eigenvalues are real */
  isReal: boolean;
  /** True if the matrix has two linearly independent eigenvectors */
  isDiagonalizable: boolean;
}

/** Classification of a 2×2 phase portrait by trace-determinant analysis. */
export interface PhasePortraitClassification {
  type:
    | 'stable-node'
    | 'unstable-node'
    | 'saddle'
    | 'stable-spiral'
    | 'unstable-spiral'
    | 'center'
    | 'degenerate';
  trace: number;
  determinant: number;
  /** τ² − 4Δ: positive → real eigenvalues, negative → complex */
  discriminant: number;
}

/** Trajectory of a 2D system, storing t, y1, y2 arrays. */
export interface SystemTrajectory {
  t: number[];
  y1: number[];
  y2: number[];
  method: 'rk4-system' | 'exact';
}

/** Result of a matrix exponential computation. */
export interface MatrixExponentialResult {
  /** The 2×2 result e^{At} as [[r00, r01], [r10, r11]] */
  matrix: number[][];
  /** Optional partial sums S_0, S_1, ..., S_N for animation */
  partialSums?: number[][][];
}

// ── Eigenvalue methods (Topic 22) ──────────────────────────

/**
 * Compute eigenvalues and eigenvectors of a 2×2 matrix using the
 * closed-form quadratic formula: λ = (τ ± √(τ² − 4Δ)) / 2.
 *
 * @param A - 2×2 matrix
 * @returns EigenResult2x2 with eigenvalues, eigenvectors, and classification flags
 */
export function eigenDecomposition2x2(A: Matrix2x2): EigenResult2x2 {
  const tau = A.a11 + A.a22; // trace
  const delta = A.a11 * A.a22 - A.a12 * A.a21; // determinant
  const disc = tau * tau - 4 * delta;
  const EPS = 1e-10;

  if (disc > -EPS) {
    // Real eigenvalues (or repeated — treat |disc| < EPS as zero)
    const sqrtDisc = disc > 0 ? Math.sqrt(disc) : 0;
    const lam1 = (tau + sqrtDisc) / 2;
    const lam2 = (tau - sqrtDisc) / 2;

    // Compute eigenvectors
    const vecs: [number, number][] = [];
    for (const lam of [lam1, lam2]) {
      // Solve (A - λI)v = 0
      const r1 = A.a11 - lam;
      const r2 = A.a12;
      const r3 = A.a21;
      const r4 = A.a22 - lam;

      // Pick the non-zero row of (A - λI) to derive the eigenvector.
      // Check row 2 first — more robust for defective/upper-triangular matrices.
      let v: [number, number];
      if (Math.abs(r3) > 1e-12 || Math.abs(r4) > 1e-12) {
        v = [-r4, r3];
      } else if (Math.abs(r1) > 1e-12 || Math.abs(r2) > 1e-12) {
        v = [-r2, r1];
      } else {
        // A - λI = 0 → λI case; any vector is an eigenvector
        v = [1, 0];
      }

      // Normalize
      const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
      if (norm > 1e-14) {
        v = [v[0] / norm, v[1] / norm];
      }
      vecs.push(v);
    }

    // Check diagonalizability: defective if repeated eigenvalue with
    // parallel eigenvectors
    const isRepeated = Math.abs(lam1 - lam2) < 1e-10;
    let isDiag = true;
    if (isRepeated) {
      // Check if A - λI = 0 (scalar multiple of I → diag) or not (defective)
      const offDiag =
        Math.abs(A.a12) + Math.abs(A.a21) + Math.abs(A.a11 - A.a22);
      isDiag = offDiag < 1e-10;
    }

    return {
      eigenvalues: { real: [lam1, lam2], imag: [0, 0] },
      eigenvectors: vecs,
      isReal: true,
      isDiagonalizable: isDiag,
    };
  } else {
    // Complex eigenvalues: α ± iβ
    const alpha = tau / 2;
    const beta = Math.sqrt(-disc) / 2;

    return {
      eigenvalues: { real: [alpha, alpha], imag: [beta, -beta] },
      eigenvectors: null,
      isReal: false,
      isDiagonalizable: true, // complex eigenvalues are always diagonalizable over ℂ
    };
  }
}

/**
 * Classify the phase portrait of a 2×2 linear system y' = Ay
 * using the trace-determinant plane.
 *
 * @param A - 2×2 matrix
 * @returns PhasePortraitClassification
 */
export function classifyPhasePortrait(A: Matrix2x2): PhasePortraitClassification {
  const tau = A.a11 + A.a22;
  const delta = A.a11 * A.a22 - A.a12 * A.a21;
  const disc = tau * tau - 4 * delta;

  let type: PhasePortraitClassification['type'];

  if (Math.abs(delta) < 1e-10) {
    type = 'degenerate';
  } else if (delta < 0) {
    type = 'saddle';
  } else if (disc > 1e-10) {
    // Real distinct eigenvalues, same sign
    type = tau < 0 ? 'stable-node' : 'unstable-node';
  } else if (disc < -1e-10) {
    // Complex eigenvalues
    if (Math.abs(tau) < 1e-10) {
      type = 'center';
    } else {
      type = tau < 0 ? 'stable-spiral' : 'unstable-spiral';
    }
  } else {
    // Repeated eigenvalue boundary (disc ≈ 0). Classified as degenerate
    // so it matches the lesson text and presets — the transition between
    // node and spiral passes through a defective (degenerate) node.
    type = 'degenerate';
  }

  return { type, trace: tau, determinant: delta, discriminant: disc };
}

// ── Matrix exponential (Topic 22) ──────────────────────────

/**
 * Multiply two 2×2 matrices: C = AB.
 */
function matMul2x2(
  a: number[][],
  b: number[][],
): number[][] {
  return [
    [
      a[0][0] * b[0][0] + a[0][1] * b[1][0],
      a[0][0] * b[0][1] + a[0][1] * b[1][1],
    ],
    [
      a[1][0] * b[0][0] + a[1][1] * b[1][0],
      a[1][0] * b[0][1] + a[1][1] * b[1][1],
    ],
  ];
}

/**
 * Compute the matrix exponential e^{At} for a 2×2 matrix.
 *
 * Uses eigendecomposition when possible:
 *   - Diagonalizable with real eigenvalues: e^{At} = P diag(e^{λt}) P⁻¹
 *   - Complex eigenvalues α ± iβ: rotation-dilation formula
 *   - Defective: Jordan block formula with te^{λt} terms
 *
 * Falls back to truncated power series for edge cases.
 *
 * @param A - 2×2 matrix
 * @param t - Time parameter
 * @param options - numTerms for series fallback; returnPartialSums for animation
 * @returns MatrixExponentialResult
 */
export function matrixExponential2x2(
  A: Matrix2x2,
  t: number,
  options?: { numTerms?: number; returnPartialSums?: boolean },
): MatrixExponentialResult {
  const N = options?.numTerms ?? 20;
  const returnPartials = options?.returnPartialSums ?? false;

  // Always compute partial sums if requested (for the convergence animation)
  if (returnPartials) {
    return matExpSeries(A, t, N, true);
  }

  const eigen = eigenDecomposition2x2(A);

  if (eigen.isReal && eigen.isDiagonalizable && eigen.eigenvectors) {
    // Diagonalizable with real eigenvalues: P diag(e^{λt}) P⁻¹
    const [lam1, lam2] = eigen.eigenvalues.real;
    const [v1, v2] = eigen.eigenvectors;

    // P = [v1 | v2], P⁻¹ via 2×2 inverse
    const det = v1[0] * v2[1] - v1[1] * v2[0];
    if (Math.abs(det) < 1e-14) {
      return matExpSeries(A, t, N, false);
    }

    const Pinv = [
      [v2[1] / det, -v2[0] / det],
      [-v1[1] / det, v1[0] / det],
    ];
    const P = [
      [v1[0], v2[0]],
      [v1[1], v2[1]],
    ];
    const D = [
      [Math.exp(lam1 * t), 0],
      [0, Math.exp(lam2 * t)],
    ];

    const matrix = matMul2x2(matMul2x2(P, D), Pinv);
    return { matrix };
  } else if (!eigen.isReal) {
    // Complex eigenvalues α ± iβ
    const alpha = eigen.eigenvalues.real[0];
    const beta = eigen.eigenvalues.imag[0];
    const eat = Math.exp(alpha * t);
    const cosbt = Math.cos(beta * t);
    const sinbt = Math.sin(beta * t);

    // e^{At} = e^{αt}[cos(βt)I + sin(βt)(A - αI)/β]
    const B11 = (A.a11 - alpha) / beta;
    const B12 = A.a12 / beta;
    const B21 = A.a21 / beta;
    const B22 = (A.a22 - alpha) / beta;

    const matrix = [
      [eat * (cosbt + sinbt * B11), eat * sinbt * B12],
      [eat * sinbt * B21, eat * (cosbt + sinbt * B22)],
    ];
    return { matrix };
  } else {
    // Defective: repeated eigenvalue λ, Jordan block
    // e^{Jt} = e^{λt}[I + t(A - λI)]
    const lam = eigen.eigenvalues.real[0];
    const elt = Math.exp(lam * t);
    const N11 = A.a11 - lam;
    const N12 = A.a12;
    const N21 = A.a21;
    const N22 = A.a22 - lam;

    const matrix = [
      [elt * (1 + t * N11), elt * t * N12],
      [elt * t * N21, elt * (1 + t * N22)],
    ];
    return { matrix };
  }
}

/**
 * Compute e^{At} via truncated power series: Σ_{k=0}^{N} (At)^k / k!
 * Used as fallback and for partial-sum animation.
 */
function matExpSeries(
  A: Matrix2x2,
  t: number,
  N: number,
  returnPartials: boolean,
): MatrixExponentialResult {
  const I: number[][] = [[1, 0], [0, 1]];
  const At: number[][] = [
    [A.a11 * t, A.a12 * t],
    [A.a21 * t, A.a22 * t],
  ];

  // Running power (At)^k / k!
  let term: number[][] = I.map((row) => [...row]);
  let sum: number[][] = I.map((row) => [...row]);

  const partials: number[][][] | undefined = returnPartials
    ? [I.map((row) => [...row])]
    : undefined;

  for (let k = 1; k <= N; k++) {
    // term = (previous term) * At / k
    const next = matMul2x2(term, At);
    term = next.map((row) => row.map((v) => v / k));

    sum = sum.map((row, i) => row.map((v, j) => v + term[i][j]));

    if (partials) {
      partials.push(sum.map((row) => [...row]));
    }
  }

  return { matrix: sum, partialSums: partials };
}

// ── System trajectory solver (Topic 22) ────────────────────

/**
 * Solve a 2×2 linear system y' = Ay (+ optional forcing g(t)) using RK4.
 *
 * @param A - 2×2 system matrix
 * @param y0 - Initial condition [y1_0, y2_0]
 * @param tRange - [t_start, t_end]
 * @param h - Step size
 * @param g - Optional forcing function g(t) → [g1, g2]
 * @returns SystemTrajectory with t, y1, y2 arrays
 */
export function computeSystemTrajectory(
  A: Matrix2x2,
  y0: [number, number],
  tRange: [number, number],
  h: number,
  g?: (t: number) => [number, number],
): SystemTrajectory {
  const BLOW_UP = 1e6;
  const [tStart, tEnd] = tRange;
  const direction = tEnd >= tStart ? 1 : -1;
  const step = direction * Math.abs(h);
  const nSteps = Math.ceil(Math.abs(tEnd - tStart) / Math.abs(h));

  const ts: number[] = [tStart];
  const y1s: number[] = [y0[0]];
  const y2s: number[] = [y0[1]];

  let t = tStart;
  let y: [number, number] = [y0[0], y0[1]];

  // f(t, y) = Ay + g(t)
  const f = (tc: number, yc: [number, number]): [number, number] => {
    const dy1 = A.a11 * yc[0] + A.a12 * yc[1];
    const dy2 = A.a21 * yc[0] + A.a22 * yc[1];
    if (g) {
      const [g1, g2] = g(tc);
      return [dy1 + g1, dy2 + g2];
    }
    return [dy1, dy2];
  };

  for (let i = 0; i < nSteps; i++) {
    const remaining = tEnd - t;
    const currentStep =
      Math.abs(remaining) < Math.abs(step) ? remaining : step;

    const k1 = f(t, y);
    const k2 = f(t + currentStep / 2, [
      y[0] + (currentStep / 2) * k1[0],
      y[1] + (currentStep / 2) * k1[1],
    ]);
    const k3 = f(t + currentStep / 2, [
      y[0] + (currentStep / 2) * k2[0],
      y[1] + (currentStep / 2) * k2[1],
    ]);
    const k4 = f(t + currentStep, [
      y[0] + currentStep * k3[0],
      y[1] + currentStep * k3[1],
    ]);

    y = [
      y[0] + (currentStep / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      y[1] + (currentStep / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    ];
    t = t + currentStep;

    ts.push(t);
    y1s.push(y[0]);
    y2s.push(y[1]);

    if (Math.abs(y[0]) > BLOW_UP || Math.abs(y[1]) > BLOW_UP) break;
  }

  return { t: ts, y1: y1s, y2: y2s, method: 'rk4-system' };
}

// ── Vector field computation (Topic 22) ────────────────────

/**
 * Compute the 2D vector field for y' = Ay on a grid.
 *
 * @param A - 2×2 system matrix
 * @param y1Range - [y1_min, y1_max]
 * @param y2Range - [y2_min, y2_max]
 * @param n1 - Grid points in y1 direction
 * @param n2 - Grid points in y2 direction
 * @returns Array of { y1, y2, dy1, dy2, magnitude }
 */
export function computeSystemField(
  A: Matrix2x2,
  y1Range: [number, number],
  y2Range: [number, number],
  n1: number,
  n2: number,
): Array<{ y1: number; y2: number; dy1: number; dy2: number; magnitude: number }> {
  const points: Array<{
    y1: number;
    y2: number;
    dy1: number;
    dy2: number;
    magnitude: number;
  }> = [];

  const d1 = (y1Range[1] - y1Range[0]) / (n1 - 1);
  const d2 = (y2Range[1] - y2Range[0]) / (n2 - 1);

  for (let i = 0; i < n1; i++) {
    const v1 = y1Range[0] + i * d1;
    for (let j = 0; j < n2; j++) {
      const v2 = y2Range[0] + j * d2;
      const dy1 = A.a11 * v1 + A.a12 * v2;
      const dy2 = A.a21 * v1 + A.a22 * v2;
      const magnitude = Math.sqrt(dy1 * dy1 + dy2 * dy2);
      points.push({ y1: v1, y2: v2, dy1, dy2, magnitude });
    }
  }

  return points;
}

// ── Topic 23: Stability & Dynamical Systems ─────────────────

// ── Interfaces (Topic 23) ──────────────────────────────────

/** Classified equilibrium of a 2D nonlinear system. */
export interface Equilibrium2D {
  /** Equilibrium position [y1, y2] */
  y: [number, number];
  /** Jacobian at this equilibrium */
  jacobian: Matrix2x2;
  /** Phase portrait classification from the Jacobian eigenvalues */
  classification: PhasePortraitClassification;
  /** Eigenvalues of the Jacobian */
  eigenvalues: { real: [number, number]; imag: [number, number] };
  /** True when all eigenvalues have nonzero real part */
  isHyperbolic: boolean;
}

/** Nullcline data: zero-level sets of f₁ and f₂ plus their intersections. */
export interface NullclineData {
  /** Points along the curve f₁(y1, y2) = 0 */
  f1Zero: Array<{ y1: number; y2: number }>;
  /** Points along the curve f₂(y1, y2) = 0 */
  f2Zero: Array<{ y1: number; y2: number }>;
  /** Approximate equilibria at nullcline intersections */
  intersections: Array<[number, number]>;
}

/** A single point in a nonlinear vector field. */
export interface NonlinearFieldPoint {
  y1: number;
  y2: number;
  dy1: number;
  dy2: number;
  magnitude: number;
}

/** Result of largest Lyapunov exponent computation. */
export interface LyapunovExponentResult {
  /** Largest Lyapunov exponent */
  exponent: number;
  /** Running average during computation */
  convergenceHistory: number[];
}

// ── Functions (Topic 23) ───────────────────────────────────

/**
 * Classify equilibria of a 2D nonlinear system by computing the Jacobian
 * numerically (via central differences) and applying eigenvalue classification.
 *
 * Reuses eigenDecomposition2x2 and classifyPhasePortrait from Topic 22.
 *
 * @param f - System RHS: (y1, y2) => [dy1, dy2]
 * @param equilibria - Array of [y1, y2] equilibrium positions
 * @param h - Finite difference step size (default 1e-6)
 */
export function classifyEquilibrium(
  f: (y1: number, y2: number) => [number, number],
  equilibria: Array<[number, number]>,
  h: number = 1e-6,
): Equilibrium2D[] {
  return equilibria.map(([y1, y2]) => {
    // Compute Jacobian via central differences
    const fxp = f(y1 + h, y2);
    const fxm = f(y1 - h, y2);
    const fyp = f(y1, y2 + h);
    const fym = f(y1, y2 - h);

    const jacobian: Matrix2x2 = {
      a11: (fxp[0] - fxm[0]) / (2 * h),
      a12: (fyp[0] - fym[0]) / (2 * h),
      a21: (fxp[1] - fxm[1]) / (2 * h),
      a22: (fyp[1] - fym[1]) / (2 * h),
    };

    const eigen = eigenDecomposition2x2(jacobian);
    const classification = classifyPhasePortrait(jacobian);

    const isHyperbolic =
      Math.abs(eigen.eigenvalues.real[0]) > 1e-10 &&
      Math.abs(eigen.eigenvalues.real[1]) > 1e-10;

    return {
      y: [y1, y2] as [number, number],
      jacobian,
      classification,
      eigenvalues: eigen.eigenvalues,
      isHyperbolic,
    };
  });
}

/**
 * Compute nullclines of a 2D nonlinear system on a grid.
 * Uses sign-change detection (simplified marching squares) to trace zero-level sets.
 *
 * The grid is pre-evaluated once, and intersection finding uses spatial binning
 * for O(N) instead of O(N·M) complexity.
 *
 * @param f - System RHS: (y1, y2) => [dy1, dy2]
 * @param y1Range - [y1_min, y1_max]
 * @param y2Range - [y2_min, y2_max]
 * @param resolution - Grid resolution per dimension (default 200)
 */
export function computeNullclines(
  f: (y1: number, y2: number) => [number, number],
  y1Range: [number, number],
  y2Range: [number, number],
  resolution: number = 200,
): NullclineData {
  const f1Zero: Array<{ y1: number; y2: number }> = [];
  const f2Zero: Array<{ y1: number; y2: number }> = [];
  const intersections: Array<[number, number]> = [];

  const dy1 = (y1Range[1] - y1Range[0]) / resolution;
  const dy2 = (y2Range[1] - y2Range[0]) / resolution;

  // Pre-evaluate f on the entire grid once (avoids redundant calls)
  const gridF1 = new Float64Array(resolution * resolution);
  const gridF2 = new Float64Array(resolution * resolution);
  for (let i = 0; i < resolution; i++) {
    const v1 = y1Range[0] + (i + 0.5) * dy1;
    for (let j = 0; j < resolution; j++) {
      const v2 = y2Range[0] + (j + 0.5) * dy2;
      const [fv1, fv2] = f(v1, v2);
      const idx = i * resolution + j;
      gridF1[idx] = fv1;
      gridF2[idx] = fv2;
    }
  }

  // Detect sign changes using the pre-evaluated grid
  for (let i = 0; i < resolution; i++) {
    const v1 = y1Range[0] + (i + 0.5) * dy1;
    for (let j = 0; j < resolution; j++) {
      const v2 = y2Range[0] + (j + 0.5) * dy2;
      const idx = i * resolution + j;
      const fv1 = gridF1[idx];
      const fv2 = gridF2[idx];

      // Check right neighbor for f₁ sign change
      if (i < resolution - 1) {
        const fr1 = gridF1[(i + 1) * resolution + j];
        if (fv1 * fr1 <= 0 && (Math.abs(fv1) + Math.abs(fr1)) > 1e-14) {
          const t = Math.abs(fv1) / (Math.abs(fv1) + Math.abs(fr1));
          f1Zero.push({ y1: v1 + t * dy1, y2: v2 });
        }
      }
      // Check top neighbor for f₁ sign change
      if (j < resolution - 1) {
        const ft1 = gridF1[i * resolution + (j + 1)];
        if (fv1 * ft1 <= 0 && (Math.abs(fv1) + Math.abs(ft1)) > 1e-14) {
          const t = Math.abs(fv1) / (Math.abs(fv1) + Math.abs(ft1));
          f1Zero.push({ y1: v1, y2: v2 + t * dy2 });
        }
      }
      // Check right neighbor for f₂ sign change
      if (i < resolution - 1) {
        const fr2 = gridF2[(i + 1) * resolution + j];
        if (fv2 * fr2 <= 0 && (Math.abs(fv2) + Math.abs(fr2)) > 1e-14) {
          const t = Math.abs(fv2) / (Math.abs(fv2) + Math.abs(fr2));
          f2Zero.push({ y1: v1 + t * dy1, y2: v2 });
        }
      }
      // Check top neighbor for f₂ sign change
      if (j < resolution - 1) {
        const ft2 = gridF2[i * resolution + (j + 1)];
        if (fv2 * ft2 <= 0 && (Math.abs(fv2) + Math.abs(ft2)) > 1e-14) {
          const t = Math.abs(fv2) / (Math.abs(fv2) + Math.abs(ft2));
          f2Zero.push({ y1: v1, y2: v2 + t * dy2 });
        }
      }
    }
  }

  // Spatial binning for O(N) intersection finding
  const tol = 3 * Math.max(dy1, dy2);
  const cellSize = tol;
  const toCellCoord = (value: number) => Math.floor(value / cellSize);
  const cellKey = (y1: number, y2: number) =>
    `${toCellCoord(y1)},${toCellCoord(y2)}`;

  // Bin f2Zero points
  const f2Bins = new Map<string, Array<{ y1: number; y2: number }>>();
  for (const p2 of f2Zero) {
    const key = cellKey(p2.y1, p2.y2);
    const bucket = f2Bins.get(key);
    if (bucket) bucket.push(p2);
    else f2Bins.set(key, [p2]);
  }

  // Bin found intersections for deduplication
  const intBins = new Map<string, Array<[number, number]>>();
  const isNearExisting = (pt: [number, number]) => {
    const cy1 = toCellCoord(pt[0]);
    const cy2 = toCellCoord(pt[1]);
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const bucket = intBins.get(`${cy1 + di},${cy2 + dj}`);
        if (!bucket) continue;
        for (const q of bucket) {
          if (Math.sqrt((pt[0] - q[0]) ** 2 + (pt[1] - q[1]) ** 2) < tol) return true;
        }
      }
    }
    return false;
  };

  // Search for intersections: for each f1Zero point, check nearby f2Zero bins
  for (const p1 of f1Zero) {
    const cy1 = toCellCoord(p1.y1);
    const cy2 = toCellCoord(p1.y2);
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const bucket = f2Bins.get(`${cy1 + di},${cy2 + dj}`);
        if (!bucket) continue;
        for (const p2 of bucket) {
          const dist = Math.sqrt((p1.y1 - p2.y1) ** 2 + (p1.y2 - p2.y2) ** 2);
          if (dist < tol) {
            const mid: [number, number] = [(p1.y1 + p2.y1) / 2, (p1.y2 + p2.y2) / 2];
            if (!isNearExisting(mid)) {
              intersections.push(mid);
              const key = cellKey(mid[0], mid[1]);
              const bucket2 = intBins.get(key);
              if (bucket2) bucket2.push(mid);
              else intBins.set(key, [mid]);
            }
          }
        }
      }
    }
  }

  return { f1Zero, f2Zero, intersections };
}

/**
 * Compute the largest Lyapunov exponent of a 2D system via the standard algorithm:
 * integrate the base trajectory + variational equation together using RK4,
 * periodically renormalize the perturbation vector.
 *
 * Both the trajectory and the variational equation are integrated with RK4
 * for consistent numerical accuracy.
 *
 * @param f - System RHS: (y1, y2) => [dy1, dy2]
 * @param y0 - Initial condition [y1, y2]
 * @param tTotal - Total integration time
 * @param dt - Time step
 * @param renormInterval - Steps between renormalization (default 10)
 */
export function computeLyapunovExponent(
  f: (y1: number, y2: number) => [number, number],
  y0: [number, number],
  tTotal: number,
  dt: number,
  renormInterval: number = 10,
): LyapunovExponentResult {
  const fdh = 1e-6; // finite difference step for Jacobian

  /** Compute Jacobian of f at (y1, y2) via central differences. */
  function jacobian(y1: number, y2: number): [number, number, number, number] {
    const fxp = f(y1 + fdh, y2);
    const fxm = f(y1 - fdh, y2);
    const fyp = f(y1, y2 + fdh);
    const fym = f(y1, y2 - fdh);
    return [
      (fxp[0] - fxm[0]) / (2 * fdh), // J11
      (fyp[0] - fym[0]) / (2 * fdh), // J12
      (fxp[1] - fxm[1]) / (2 * fdh), // J21
      (fyp[1] - fym[1]) / (2 * fdh), // J22
    ];
  }

  /** RHS of the combined system: (y1, y2, w1, w2) → (dy1, dy2, dw1, dw2). */
  function combined(cy1: number, cy2: number, cw1: number, cw2: number): [number, number, number, number] {
    const [dy1, dy2] = f(cy1, cy2);
    const [J11, J12, J21, J22] = jacobian(cy1, cy2);
    return [dy1, dy2, J11 * cw1 + J12 * cw2, J21 * cw1 + J22 * cw2];
  }

  let y1 = y0[0];
  let y2 = y0[1];
  let w1 = 1.0;
  let w2 = 0.0;

  let sumLog = 0;
  let count = 0;
  const convergenceHistory: number[] = [];
  const steps = Math.floor(tTotal / dt);

  for (let n = 0; n < steps; n++) {
    // Coupled RK4 step for trajectory + variational equation
    const k1 = combined(y1, y2, w1, w2);
    const k2 = combined(
      y1 + 0.5 * dt * k1[0], y2 + 0.5 * dt * k1[1],
      w1 + 0.5 * dt * k1[2], w2 + 0.5 * dt * k1[3],
    );
    const k3 = combined(
      y1 + 0.5 * dt * k2[0], y2 + 0.5 * dt * k2[1],
      w1 + 0.5 * dt * k2[2], w2 + 0.5 * dt * k2[3],
    );
    const k4 = combined(
      y1 + dt * k3[0], y2 + dt * k3[1],
      w1 + dt * k3[2], w2 + dt * k3[3],
    );

    y1 += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y2 += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    w1 += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    w2 += (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);

    // Renormalize periodically
    if ((n + 1) % renormInterval === 0) {
      const norm = Math.sqrt(w1 * w1 + w2 * w2);
      if (norm > 1e-14) {
        sumLog += Math.log(norm);
        count++;
        w1 /= norm;
        w2 /= norm;
        convergenceHistory.push(sumLog / ((count * renormInterval) * dt));
      }
    }
  }

  const exponent = count > 0
    ? sumLog / (count * renormInterval * dt)
    : 0;

  return { exponent, convergenceHistory };
}

/**
 * Compute a nonlinear vector field on a grid.
 * The nonlinear counterpart of computeSystemField from Topic 22.
 *
 * @param f - System RHS: (y1, y2) => [dy1, dy2]
 * @param y1Range - [y1_min, y1_max]
 * @param y2Range - [y2_min, y2_max]
 * @param n1 - Grid points in y1 direction
 * @param n2 - Grid points in y2 direction
 */
export function computeNonlinearField(
  f: (y1: number, y2: number) => [number, number],
  y1Range: [number, number],
  y2Range: [number, number],
  n1: number,
  n2: number,
): NonlinearFieldPoint[] {
  const points: NonlinearFieldPoint[] = [];

  const d1 = (y1Range[1] - y1Range[0]) / (n1 - 1);
  const d2 = (y2Range[1] - y2Range[0]) / (n2 - 1);

  for (let i = 0; i < n1; i++) {
    const v1 = y1Range[0] + i * d1;
    for (let j = 0; j < n2; j++) {
      const v2 = y2Range[0] + j * d2;
      const [dy1, dy2] = f(v1, v2);
      const magnitude = Math.sqrt(dy1 * dy1 + dy2 * dy2);
      points.push({ y1: v1, y2: v2, dy1, dy2, magnitude });
    }
  }

  return points;
}

/**
 * Solve a 2D nonlinear system y' = f(y) using RK4.
 * The nonlinear counterpart of computeSystemTrajectory from Topic 22.
 *
 * @param f - System RHS: (y1, y2) => [dy1, dy2]
 * @param y0 - Initial condition [y1, y2]
 * @param tRange - [t_start, t_end]
 * @param h - Step size
 * @returns SystemTrajectory with method 'rk4-system'
 */
export function computeNonlinearTrajectory(
  f: (y1: number, y2: number) => [number, number],
  y0: [number, number],
  tRange: [number, number],
  h: number,
): SystemTrajectory {
  const tArr: number[] = [];
  const y1Arr: number[] = [];
  const y2Arr: number[] = [];

  let t = tRange[0];
  let y1 = y0[0];
  let y2 = y0[1];

  tArr.push(t);
  y1Arr.push(y1);
  y2Arr.push(y2);

  const direction = tRange[1] >= tRange[0] ? 1 : -1;
  const step = direction * Math.abs(h);
  const maxSteps = Math.ceil(Math.abs(tRange[1] - tRange[0]) / Math.abs(h)) + 1;

  for (let n = 0; n < maxSteps; n++) {
    const k1 = f(y1, y2);
    const k2 = f(y1 + 0.5 * step * k1[0], y2 + 0.5 * step * k1[1]);
    const k3 = f(y1 + 0.5 * step * k2[0], y2 + 0.5 * step * k2[1]);
    const k4 = f(y1 + step * k3[0], y2 + step * k3[1]);

    y1 += (step / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y2 += (step / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    t += step;

    // Bail out if trajectory blows up
    if (!isFinite(y1) || !isFinite(y2) || Math.abs(y1) > 1e6 || Math.abs(y2) > 1e6) {
      break;
    }

    tArr.push(t);
    y1Arr.push(y1);
    y2Arr.push(y2);

    if (direction > 0 ? t >= tRange[1] : t <= tRange[1]) break;
  }

  return { t: tArr, y1: y1Arr, y2: y2Arr, method: 'rk4-system' };
}
