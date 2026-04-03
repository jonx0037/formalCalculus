/**
 * Shared utility module for the Multivariable Differential Calculus track.
 * Created by Topic 9 (gradient), to be extended by Topics 10–12.
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides:
 *  - Numerical and analytical gradient computation
 *  - Directional derivative evaluation
 *  - Contour data generation for 2D scalar fields
 *  - Wireframe surface data for pseudo-3D rendering
 *  - 3D-to-2D isometric projection
 *  - Gradient descent trajectory computation
 *  - Gradient flow (steepest ascent) via Euler integration
 *  - Differentiability checking (total derivative error)
 *  - Jacobian matrix and determinant computation (Topic 10)
 *  - Multivariate chain rule with step-by-step tracking (Topic 10)
 *  - Area distortion and coordinate transform utilities (Topic 10)
 *  - Hessian matrix and eigenvalue decomposition (Topic 11)
 *  - Critical point classification via eigenvalue signs (Topic 11)
 *  - Newton's method step computation (Topic 11)
 *  - Condition number and quadratic form evaluation (Topic 11)
 *  - Inverse Jacobian and local invertibility analysis (Topic 12)
 *  - Implicit function slice computation via Newton iteration (Topic 12)
 *  - Multivariate Newton's method for systems F(x) = 0 (Topic 12)
 *  - Contraction mapping iteration with convergence diagnostics (Topic 12)
 *  - Lagrange multiplier computation for constrained optimization (Topic 12)
 *  - Bivariate normal density evaluation (Topic 13)
 *  - Marginal density via numerical integration (Topic 13)
 *  - Conditional density computation (Topic 13)
 */

import { seededRandom } from './limits';

// ── Re-exports ─────────────────────────────────────────────

export { seededRandom } from './limits';

// ── Interfaces ─────────────────────────────────────────────

/** A point in R^n (typically R^2 for visualization) */
export interface PointND {
  coords: number[];
  dim: number;
}

/** Gradient result at a point */
export interface GradientResult {
  /** Evaluation point */
  point: number[];
  /** Gradient vector */
  gradient: number[];
  /** L2 magnitude ||nabla f|| */
  magnitude: number;
}

/** Directional derivative result */
export interface DirectionalDerivativeResult {
  /** Evaluation point */
  point: number[];
  /** Unit direction vector u */
  direction: number[];
  /** D_u f(a) = nabla f . u */
  value: number;
  /** ||nabla f|| (for comparison) */
  gradientMag: number;
  /** Angle between u and nabla f (radians) */
  angle: number;
}

/** Contour data for 2D visualization */
export interface ContourData {
  /** Contour level value */
  level: number;
  /** Points along the contour line as [x, y] pairs */
  points: Array<[number, number]>;
}

/** Single gradient descent step result */
export interface GDStepResult {
  /** Current parameter position */
  point: number[];
  /** Loss value at this point */
  loss: number;
  /** Gradient vector at this point */
  gradient: number[];
  /** ||nabla L|| */
  gradientNorm: number;
  /** Iteration index */
  iteration: number;
}

/** Complete gradient descent trajectory */
export interface GDTrajectory {
  /** All steps from start to termination */
  steps: GDStepResult[];
  /** Whether the optimizer converged (||nabla L|| < tolerance) */
  converged: boolean;
  /** Loss value at the final step */
  finalLoss: number;
}

/** Wireframe surface data for pseudo-3D rendering */
export interface WireframeData {
  /** x-axis grid values */
  xGrid: number[];
  /** y-axis grid values */
  yGrid: number[];
  /** zValues[i][j] = f(xGrid[i], yGrid[j]) */
  zValues: number[][];
}

// ── Jacobian interfaces (Topic 10) ────────────────────────

/** Jacobian matrix result at a point */
export interface JacobianResult {
  /** Evaluation point a ∈ ℝⁿ */
  point: number[];
  /** The m × n Jacobian matrix J_f(a) */
  matrix: number[][];
  /** Input dimension n */
  inputDim: number;
  /** Output dimension m */
  outputDim: number;
}

/** Jacobian determinant result (square Jacobians only) */
export interface JacobianDetResult {
  /** Evaluation point */
  point: number[];
  /** det J_f(a) — signed */
  determinant: number;
  /** |det J_f(a)| — area/volume scaling factor */
  absDeterminant: number;
  /** Whether det > 0 (orientation preserved) */
  orientationPreserved: boolean;
}

/**
 * Single step in a multivariate chain rule computation.
 * Named MultiChainRuleStep to avoid collision with the single-variable
 * ChainRuleStep in differentiation.ts.
 */
export interface MultiChainRuleStep {
  /** Index of this layer in the chain (0-based) */
  layerIndex: number;
  /** Input to this layer */
  inputPoint: number[];
  /** Output of this layer */
  outputPoint: number[];
  /** Jacobian matrix of this layer at its input */
  jacobian: number[][];
  /** Running product of Jacobians up to (and including) this layer */
  accumulatedProduct: number[][];
}

/** Complete multivariate chain rule result */
export interface MultiChainRuleResult {
  /** Each step in the chain, from first to last */
  steps: MultiChainRuleStep[];
  /** Final Jacobian of the full composition */
  finalJacobian: number[][];
  /** Input dimension of the first function */
  inputDim: number;
  /** Output dimension of the last function */
  outputDim: number;
}

/** Area distortion data for 2D visualization */
export interface AreaDistortionResult {
  /** Corners of the input square */
  inputVertices: Array<[number, number]>;
  /** Corners of the output parallelogram (image under f) */
  outputVertices: Array<[number, number]>;
  /** Area of the input square */
  inputArea: number;
  /** Area of the output quadrilateral (via shoelace) */
  outputArea: number;
  /** det J_f at the center point */
  detJ: number;
  /** outputArea / inputArea — converges to |det J| as size → 0 */
  ratio: number;
}

// ── Gradient computation ───────────────────────────────────

/**
 * Compute the numerical gradient of f at a point via central differences.
 *
 * For each coordinate i, approximates df/dx_i by
 *   [f(..., x_i + h, ...) - f(..., x_i - h, ...)] / (2h).
 * O(h^2) truncation error per component.
 */
export function numericalGradient(
  f: (...args: number[]) => number,
  point: number[],
  h: number = 1e-7,
): number[] {
  const n = point.length;
  const grad: number[] = new Array(n);
  const p = [...point];
  const step = Math.abs(h);
  for (let i = 0; i < n; i++) {
    const original = p[i];
    p[i] = original + step;
    const f1 = f(...p);
    p[i] = original - step;
    const f2 = f(...p);
    p[i] = original;
    grad[i] = (f1 - f2) / (2 * step);
  }
  return grad;
}

/**
 * Compute the gradient using analytical partial derivative functions.
 * Returns a GradientResult with the gradient vector and its L2 magnitude.
 */
export function analyticalGradient(
  partials: Array<(...args: number[]) => number>,
  point: number[],
): GradientResult {
  const gradient = partials.map((partial) => partial(...point));
  const magnitude = Math.sqrt(gradient.reduce((sum, g) => sum + g * g, 0));
  return { point: point.slice(), gradient, magnitude };
}

// ── Directional derivative ─────────────────────────────────

/**
 * Compute the directional derivative D_u f(a) = nabla f(a) . u.
 *
 * The direction vector is normalized internally. Returns the value,
 * gradient magnitude, and angle between direction and gradient.
 * The optional `point` parameter populates the result's evaluation point.
 */
export function directionalDerivative(
  grad: number[],
  direction: number[],
  point?: number[],
): DirectionalDerivativeResult {
  // Normalize direction
  const dirNorm = Math.sqrt(direction.reduce((s, d) => s + d * d, 0));
  const unit = dirNorm > 0 ? direction.map((d) => d / dirNorm) : direction;

  // Dot product
  const value = grad.reduce((sum, g, i) => sum + g * unit[i], 0);
  const gradMag = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));

  // Angle via cos(theta) = (grad . u) / (||grad|| * ||u||)
  let angle = 0;
  if (gradMag > 1e-12 && dirNorm > 1e-12) {
    const cosTheta = Math.max(-1, Math.min(1, value / gradMag));
    angle = Math.acos(cosTheta);
  }

  return {
    point: point ? point.slice() : [],
    direction: unit,
    value,
    gradientMag: gradMag,
    angle,
  };
}

// ── Contour generation ─────────────────────────────────────

/**
 * Generate contour data for a 2D scalar field.
 *
 * Samples f on a uniform grid and uses the marching squares algorithm
 * to extract contour lines at nLevels equally-spaced levels between
 * the minimum and maximum grid values.
 *
 * Returns an array of ContourData, each containing a level value and
 * the points along that contour line in domain coordinates.
 */
export function generateContours(
  f: (x: number, y: number) => number,
  xDomain: [number, number],
  yDomain: [number, number],
  nLevels: number = 12,
  gridSize: number = 100,
): ContourData[] {
  // Sample the grid
  const dx = (xDomain[1] - xDomain[0]) / (gridSize - 1);
  const dy = (yDomain[1] - yDomain[0]) / (gridSize - 1);
  const values: number[] = new Array(gridSize * gridSize);
  let zMin = Infinity;
  let zMax = -Infinity;

  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      const x = xDomain[0] + i * dx;
      const y = yDomain[0] + j * dy;
      const z = f(x, y);
      values[j * gridSize + i] = z;
      if (isFinite(z)) {
        if (z < zMin) zMin = z;
        if (z > zMax) zMax = z;
      }
    }
  }

  if (!isFinite(zMin) || !isFinite(zMax) || zMin === zMax) return [];

  // Generate level thresholds (skip min and max for cleaner contours)
  const levelStep = (zMax - zMin) / (nLevels + 1);
  const levels: number[] = [];
  for (let k = 1; k <= nLevels; k++) {
    levels.push(zMin + k * levelStep);
  }

  // Marching squares contour extraction
  const contours: ContourData[] = [];
  for (const level of levels) {
    const points: Array<[number, number]> = [];
    marchingSquares(values, gridSize, gridSize, level, xDomain, yDomain, points);
    if (points.length > 0) {
      contours.push({ level, points });
    }
  }

  return contours;
}

/**
 * Simple marching squares implementation for contour extraction.
 * Finds edge intersections and outputs line segment endpoints.
 */
function marchingSquares(
  values: number[],
  width: number,
  height: number,
  level: number,
  xDomain: [number, number],
  yDomain: [number, number],
  out: Array<[number, number]>,
): void {
  const dx = (xDomain[1] - xDomain[0]) / (width - 1);
  const dy = (yDomain[1] - yDomain[0]) / (height - 1);

  for (let j = 0; j < height - 1; j++) {
    for (let i = 0; i < width - 1; i++) {
      const v00 = values[j * width + i];
      const v10 = values[j * width + (i + 1)];
      const v01 = values[(j + 1) * width + i];
      const v11 = values[(j + 1) * width + (i + 1)];

      // Cell corner classification (above/below level)
      const c = ((v00 >= level ? 8 : 0) |
                 (v10 >= level ? 4 : 0) |
                 (v11 >= level ? 2 : 0) |
                 (v01 >= level ? 1 : 0));

      if (c === 0 || c === 15) continue;

      const x0 = xDomain[0] + i * dx;
      const y0 = yDomain[0] + j * dy;

      // Interpolate edge crossings
      const lerp = (a: number, b: number) => {
        const d = b - a;
        return Math.abs(d) > 1e-12 ? (level - a) / d : 0.5;
      };

      // Edge midpoints in domain coords
      const top: [number, number] = [x0 + lerp(v00, v10) * dx, y0];
      const right: [number, number] = [x0 + dx, y0 + lerp(v10, v11) * dy];
      const bottom: [number, number] = [x0 + lerp(v01, v11) * dx, y0 + dy];
      const left: [number, number] = [x0, y0 + lerp(v00, v01) * dy];

      // Emit line segments based on case
      switch (c) {
        case 1: case 14: out.push(left, bottom); break;
        case 2: case 13: out.push(bottom, right); break;
        case 3: case 12: out.push(left, right); break;
        case 4: case 11: out.push(top, right); break;
        case 5: out.push(top, left); out.push(bottom, right); break;
        case 6: case 9: out.push(top, bottom); break;
        case 7: case 8: out.push(top, left); break;
        case 10: out.push(top, right); out.push(left, bottom); break;
      }
    }
  }
}

// ── Wireframe surface data ─────────────────────────────────

/**
 * Generate wireframe grid data for a 2D surface z = f(x, y).
 *
 * Samples f on a uniform gridSize x gridSize grid over the given domains.
 * Non-finite z-values are replaced with NaN for safe rendering.
 */
export function generateWireframe(
  f: (x: number, y: number) => number,
  xDomain: [number, number],
  yDomain: [number, number],
  gridSize: number = 40,
): WireframeData {
  const xGrid: number[] = new Array(gridSize);
  const yGrid: number[] = new Array(gridSize);
  const zValues: number[][] = new Array(gridSize);

  const dx = (xDomain[1] - xDomain[0]) / (gridSize - 1);
  const dy = (yDomain[1] - yDomain[0]) / (gridSize - 1);

  for (let i = 0; i < gridSize; i++) {
    xGrid[i] = xDomain[0] + i * dx;
  }
  for (let j = 0; j < gridSize; j++) {
    yGrid[j] = yDomain[0] + j * dy;
  }

  for (let i = 0; i < gridSize; i++) {
    zValues[i] = new Array(gridSize);
    for (let j = 0; j < gridSize; j++) {
      const z = f(xGrid[i], yGrid[j]);
      zValues[i][j] = isFinite(z) ? z : NaN;
    }
  }

  return { xGrid, yGrid, zValues };
}

// ── 3D projection ──────────────────────────────────────────

/**
 * Project a 3D point (x, y, z) to 2D screen coordinates.
 *
 * Uses an isometric-like projection with configurable azimuth and
 * elevation angles. The result is suitable for D3 SVG rendering
 * of pseudo-3D wireframe surfaces.
 *
 * The projection applies:
 *   screenX = x * cos(az) - y * sin(az)
 *   screenY = -x * sin(az) * sin(el) - y * cos(az) * sin(el) + z * cos(el)
 *
 * Default angles: azimuth = -30deg, elevation = 25deg.
 */
export function project3D(
  x: number,
  y: number,
  z: number,
  azimuth: number = -Math.PI / 6,
  elevation: number = (25 * Math.PI) / 180,
): [number, number] {
  const cosAz = Math.cos(azimuth);
  const sinAz = Math.sin(azimuth);
  const cosEl = Math.cos(elevation);
  const sinEl = Math.sin(elevation);

  const screenX = x * cosAz - y * sinAz;
  const screenY = -x * sinAz * sinEl - y * cosAz * sinEl + z * cosEl;

  return [screenX, screenY];
}

// ── Gradient descent ───────────────────────────────────────

/**
 * Run gradient descent on a scalar-valued function of n variables.
 *
 * Iterates x_{k+1} = x_k - learningRate * grad_f(x_k) until:
 *  - ||nabla f|| < tolerance (converged), or
 *  - maxSteps is reached, or
 *  - any coordinate exceeds 1e6 / loss is non-finite (diverged).
 *
 * Returns the full trajectory for visualization.
 */
export function gradientDescent(
  f: (...args: number[]) => number,
  grad_f: (...args: number[]) => number[],
  start: number[],
  learningRate: number,
  maxSteps: number = 200,
  tolerance: number = 1e-6,
): GDTrajectory {
  const steps: GDStepResult[] = [];
  let point = start.slice();
  let converged = false;

  for (let k = 0; k <= maxSteps; k++) {
    const loss = f(...point);
    const gradient = grad_f(...point);
    const gradientNorm = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0));

    steps.push({
      point: point.slice(),
      loss,
      gradient: gradient.slice(),
      gradientNorm,
      iteration: k,
    });

    // Divergence guard
    if (!isFinite(loss) || point.some((p) => Math.abs(p) > 1e6)) {
      break;
    }

    // Convergence check
    if (gradientNorm < tolerance) {
      converged = true;
      break;
    }

    if (k === maxSteps) break;

    // GD update
    point = point.map((p, i) => p - learningRate * gradient[i]);
  }

  return {
    steps,
    converged,
    finalLoss: steps.length > 0 ? steps[steps.length - 1].loss : NaN,
  };
}

// ── Gradient flow ──────────────────────────────────────────

/**
 * Compute the gradient flow (steepest ascent path) via forward Euler integration.
 *
 * Integrates dx/dt = grad_f(x) starting from the given point.
 * The resulting path traces the steepest ascent direction — gradient descent
 * follows the same path in reverse.
 *
 * Stops early if the point exits 2x the implicit bounding box or
 * the gradient magnitude drops below 1e-10.
 */
export function gradientFlow(
  grad_f: (x: number, y: number) => [number, number],
  start: [number, number],
  stepSize: number = 0.01,
  nSteps: number = 500,
): Array<[number, number]> {
  const path: Array<[number, number]> = [[start[0], start[1]]];
  let x = start[0];
  let y = start[1];

  for (let k = 0; k < nSteps; k++) {
    const [gx, gy] = grad_f(x, y);
    const gmag = Math.sqrt(gx * gx + gy * gy);

    // Stop if gradient is vanishingly small (critical point)
    if (gmag < 1e-10) break;

    // Euler step
    x += stepSize * gx;
    y += stepSize * gy;

    // Domain exit check (generous bounds)
    if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 100 || Math.abs(y) > 100) {
      break;
    }

    path.push([x, y]);
  }

  return path;
}

// ── Differentiability checking ─────────────────────────────

/**
 * Check differentiability numerically by evaluating the total derivative
 * approximation error at multiple scales.
 *
 * For a differentiable function:
 *   |f(a+h) - f(a) - grad . h| / ||h|| -> 0 as ||h|| -> 0
 *
 * The function samples multiple random directions at each h value
 * (using seededRandom for reproducibility) and returns the maximum
 * error at each scale. If f is differentiable, errors should decrease
 * with h; if not (e.g., the counterexample xy/(x^2+y^2)), errors
 * will plateau or increase.
 */
export function checkDifferentiability(
  f: (x: number, y: number) => number,
  grad_at_a: [number, number],
  a: [number, number],
  hValues: number[] = [0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001],
): Array<{ hNorm: number; error: number }> {
  const rng = seededRandom(42);
  const nDirections = 16;
  const results: Array<{ hNorm: number; error: number }> = [];
  const fa = f(a[0], a[1]);

  for (const hMag of hValues) {
    let maxError = 0;

    for (let d = 0; d < nDirections; d++) {
      const theta = (d / nDirections) * 2 * Math.PI + rng() * 0.01;
      const ux = Math.cos(theta);
      const uy = Math.sin(theta);
      const hx = hMag * ux;
      const hy = hMag * uy;

      const fVal = f(a[0] + hx, a[1] + hy);
      const linearApprox = fa + grad_at_a[0] * hx + grad_at_a[1] * hy;
      const error = Math.abs(fVal - linearApprox) / hMag;

      if (isFinite(error) && error > maxError) {
        maxError = error;
      }
    }

    results.push({ hNorm: hMag, error: maxError });
  }

  return results;
}

// ── Jacobian computation (Topic 10) ──────────────────────

/**
 * Compute the determinant of a square matrix.
 * Uses direct formulas for n ≤ 3, cofactor expansion for n > 3.
 * Note: cofactor expansion is O(n!) — this function is designed for
 * the small matrices (2×2, 3×3) typical of Jacobian computations.
 * For n > 5, throws to prevent accidental browser hangs.
 */
function determinant(M: number[][]): number {
  const n = M.length;
  if (n === 0) return 1; // empty matrix convention
  if (n > 5) {
    throw new Error(
      `determinant(): matrix size ${n}×${n} exceeds safe limit for cofactor expansion. ` +
        `Use LU decomposition for large matrices.`,
    );
  }
  if (n === 1) return M[0][0];
  if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0];
  if (n === 3) {
    return (
      M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
      M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
      M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    );
  }
  // Cofactor expansion along the first row for n > 3
  let det = 0;
  for (let j = 0; j < n; j++) {
    const minor: number[][] = [];
    for (let i = 1; i < n; i++) {
      minor.push([...M[i].slice(0, j), ...M[i].slice(j + 1)]);
    }
    det += (j % 2 === 0 ? 1 : -1) * M[0][j] * determinant(minor);
  }
  return det;
}

/**
 * Compute the Jacobian matrix of f: ℝⁿ → ℝᵐ at a point via central differences.
 * Returns the m × n matrix where entry (i, j) = ∂fᵢ/∂xⱼ.
 * Generalizes numericalGradient to vector-valued functions.
 */
export function jacobianMatrix(
  f: (...args: number[]) => number[],
  point: number[],
  h: number = 1e-7,
): JacobianResult {
  const n = point.length;
  const f0 = f(...point);
  const m = f0.length;
  const matrix: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    const pPlus = [...point];
    const pMinus = [...point];
    pPlus[j] += h;
    pMinus[j] -= h;
    const fPlus = f(...pPlus);
    const fMinus = f(...pMinus);
    for (let i = 0; i < m; i++) {
      matrix[i][j] = (fPlus[i] - fMinus[i]) / (2 * h);
    }
  }

  return { point: [...point], matrix, inputDim: n, outputDim: m };
}

/**
 * Compute the Jacobian determinant for f: ℝⁿ → ℝⁿ (square case).
 * Throws if the Jacobian is not square (m ≠ n).
 */
export function jacobianDeterminant(
  f: (...args: number[]) => number[],
  point: number[],
  h: number = 1e-7,
): JacobianDetResult {
  const jr = jacobianMatrix(f, point, h);
  if (jr.inputDim !== jr.outputDim) {
    throw new Error(
      `Jacobian determinant requires a square matrix (n = m), ` +
        `got ${jr.outputDim} × ${jr.inputDim}`,
    );
  }
  const det = determinant(jr.matrix);
  return {
    point: [...point],
    determinant: det,
    absDeterminant: Math.abs(det),
    orientationPreserved: det > 0,
  };
}

/**
 * Multiply two matrices: A (m × k) times B (k × n) → C (m × n).
 * Used for composing Jacobians in the chain rule.
 */
export function linearMapComposition(
  A: number[][],
  B: number[][],
): number[][] {
  if (A.length === 0 || B.length === 0) {
    throw new Error('linearMapComposition: cannot multiply empty matrices');
  }
  const m = A.length;
  const k = A[0].length;
  if (k !== B.length) {
    throw new Error(
      `linearMapComposition: inner dimensions must match — A is ${m}×${k} but B is ${B.length}×${B[0].length}`,
    );
  }
  const n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let p = 0; p < k; p++) {
        sum += A[i][p] * B[p][j];
      }
      C[i][j] = sum;
    }
  }
  return C;
}

/**
 * Apply the multivariate chain rule to a sequence of differentiable functions.
 * Given functions [f₁, f₂, ..., fₖ], computes J_{fₖ ∘ ... ∘ f₁}(x₀).
 * Returns all intermediate steps for visualization (forward evaluation order).
 *
 * Each function must provide both f (the function) and J (its analytical Jacobian).
 * The chain is evaluated left-to-right (f₁ first), and the Jacobian product
 * accumulates right-to-left: J_total = J_fₖ · ... · J_f₂ · J_f₁.
 */
export function multivariateChainRule(
  functions: Array<{
    f: (...args: number[]) => number[];
    J: (...args: number[]) => number[][];
  }>,
  input: number[],
): MultiChainRuleResult {
  const steps: MultiChainRuleStep[] = [];
  let currentPoint = [...input];

  for (let k = 0; k < functions.length; k++) {
    const { f, J } = functions[k];
    const jacobian = J(...currentPoint);
    const outputPoint = f(...currentPoint);

    // Accumulate: product = J_k · J_{k-1} · ... · J_1
    const accumulatedProduct =
      k === 0
        ? jacobian.map((row) => [...row])
        : linearMapComposition(jacobian, steps[k - 1].accumulatedProduct);

    steps.push({
      layerIndex: k,
      inputPoint: [...currentPoint],
      outputPoint: [...outputPoint],
      jacobian,
      accumulatedProduct,
    });

    currentPoint = outputPoint;
  }

  const finalJacobian =
    steps.length > 0
      ? steps[steps.length - 1].accumulatedProduct
      : Array.from({ length: input.length }, (_, i) =>
          Array.from({ length: input.length }, (_, j) => (i === j ? 1 : 0)),
        ); // n×n identity for empty chain

  return {
    steps,
    finalJacobian,
    inputDim: input.length,
    outputDim: steps.length > 0 ? steps[steps.length - 1].outputPoint.length : input.length,
  };
}

/**
 * Compute area distortion of a small square under f: ℝ² → ℝ².
 * Maps a square of given size centered at `point` through `f` and
 * compares the output area to the input area. The ratio converges
 * to |det J_f(point)| as squareSize → 0.
 */
export function areaDistortion(
  f: (x: number, y: number) => [number, number],
  point: [number, number],
  squareSize: number,
  J?: [[number, number], [number, number]],
): AreaDistortionResult {
  const [cx, cy] = point;
  const s = squareSize / 2;

  // Input square corners (counter-clockwise)
  const inputVertices: Array<[number, number]> = [
    [cx - s, cy - s],
    [cx + s, cy - s],
    [cx + s, cy + s],
    [cx - s, cy + s],
  ];

  // Map through f
  const outputVertices = inputVertices.map(([x, y]) => f(x, y)) as Array<[number, number]>;

  // Input area is squareSize²
  const inputArea = squareSize * squareSize;

  // Output area via shoelace formula
  const n = outputVertices.length;
  let shoelace = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = outputVertices[i];
    const [x2, y2] = outputVertices[(i + 1) % n];
    shoelace += x1 * y2 - x2 * y1;
  }
  const outputArea = Math.abs(shoelace) / 2;

  // Jacobian determinant at the center
  let detJ: number;
  if (J) {
    detJ = J[0][0] * J[1][1] - J[0][1] * J[1][0];
  } else {
    const wrapF = (...args: number[]) => {
      const result = f(args[0], args[1]);
      return [result[0], result[1]];
    };
    detJ = jacobianDeterminant(wrapF, point).determinant;
  }

  return {
    inputVertices,
    outputVertices,
    inputArea,
    outputArea,
    detJ,
    ratio: inputArea > 0 ? outputArea / inputArea : 0,
  };
}

/**
 * Apply a coordinate transformation to generate grid data for D3.
 * Returns grid lines in both input and output spaces.
 */
export function coordinateTransform(
  transform: (u: number, v: number) => [number, number],
  uDomain: [number, number],
  vDomain: [number, number],
  gridSize: number = 20,
): {
  inputGrid: Array<[number, number]>;
  outputGrid: Array<[number, number]>;
  inputLines: Array<Array<[number, number]>>;
  outputLines: Array<Array<[number, number]>>;
} {
  const inputGrid: Array<[number, number]> = [];
  const outputGrid: Array<[number, number]> = [];
  const inputLines: Array<Array<[number, number]>> = [];
  const outputLines: Array<Array<[number, number]>> = [];

  const uStep = (uDomain[1] - uDomain[0]) / gridSize;
  const vStep = (vDomain[1] - vDomain[0]) / gridSize;
  const nSamples = gridSize * 4; // samples per line for smooth curves

  // Constant-u lines (vertical in input space)
  for (let i = 0; i <= gridSize; i++) {
    const u = uDomain[0] + i * uStep;
    const inputLine: Array<[number, number]> = [];
    const outputLine: Array<[number, number]> = [];
    for (let j = 0; j <= nSamples; j++) {
      const v = vDomain[0] + (j / nSamples) * (vDomain[1] - vDomain[0]);
      inputLine.push([u, v]);
      const [ox, oy] = transform(u, v);
      if (isFinite(ox) && isFinite(oy)) {
        outputLine.push([ox, oy]);
      }
    }
    inputLines.push(inputLine);
    outputLines.push(outputLine);
  }

  // Constant-v lines (horizontal in input space)
  for (let j = 0; j <= gridSize; j++) {
    const v = vDomain[0] + j * vStep;
    const inputLine: Array<[number, number]> = [];
    const outputLine: Array<[number, number]> = [];
    for (let i = 0; i <= nSamples; i++) {
      const u = uDomain[0] + (i / nSamples) * (uDomain[1] - uDomain[0]);
      inputLine.push([u, v]);
      const [ox, oy] = transform(u, v);
      if (isFinite(ox) && isFinite(oy)) {
        outputLine.push([ox, oy]);
      }
    }
    inputLines.push(inputLine);
    outputLines.push(outputLine);
  }

  // Grid intersection points
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const u = uDomain[0] + i * uStep;
      const v = vDomain[0] + j * vStep;
      inputGrid.push([u, v]);
      const [ox, oy] = transform(u, v);
      if (isFinite(ox) && isFinite(oy)) {
        outputGrid.push([ox, oy]);
      }
    }
  }

  return { inputGrid, outputGrid, inputLines, outputLines };
}

// ══════════════════════════════════════════════════════════════
// Topic 11 — The Hessian & Second-Order Analysis
// ══════════════════════════════════════════════════════════════

// ── Constants (Topic 11) ──────────────────────────────────────

/** Default step size for numerical Hessian computation.
 *  Larger than the gradient step (1e-7) because second-order
 *  differences amplify floating-point noise as O(ε/h²). */
const HESSIAN_STEP_SIZE = 1e-5;

/** Tolerance for classifying eigenvalues as zero vs nonzero */
const DEFINITENESS_TOL = 1e-8;

/** Tolerance for detecting singular matrices (near-zero determinant) */
const SINGULARITY_TOL = 1e-10;

/** Convergence tolerance for the Jacobi eigenvalue algorithm */
const JACOBI_CONVERGENCE_TOL = 1e-12;

/** Max dimension for eigenvalue/determinant computations in the browser */
const MAX_EIGEN_DIM = 10;

// ── Interfaces (Topic 11) ─────────────────────────────────────

/** Hessian matrix result at a point */
export interface HessianResult {
  /** Evaluation point */
  point: number[];
  /** n × n Hessian matrix (symmetric for C² functions) */
  matrix: number[][];
  /** Eigenvalues sorted ascending */
  eigenvalues: number[];
  /** Corresponding unit eigenvectors */
  eigenvectors: number[][];
  /** det(H) */
  determinant: number;
  /** tr(H) = sum of diagonal entries */
  trace: number;
  /** Definiteness classification */
  classification:
    | 'positive-definite'
    | 'negative-definite'
    | 'indefinite'
    | 'positive-semidefinite'
    | 'negative-semidefinite'
    | 'zero';
}

/** Critical point classification result */
export interface CriticalPointResult {
  /** The critical point */
  point: number[];
  /** Gradient at the point (should be near zero) */
  gradient: number[];
  /** Full Hessian analysis */
  hessian: HessianResult;
  /** Classification: min, max, saddle, or degenerate */
  type: 'local-min' | 'local-max' | 'saddle' | 'degenerate';
}

/** Newton step result */
export interface NewtonStepResult {
  /** Current iterate */
  currentPoint: number[];
  /** Gradient at current iterate */
  gradient: number[];
  /** Hessian matrix at current iterate */
  hessian: number[][];
  /** Newton direction: -H⁻¹ ∇f */
  newtonDirection: number[];
  /** Next iterate: current + direction */
  nextPoint: number[];
  /** f(currentPoint) */
  functionValue: number;
  /** ||∇f(currentPoint)|| */
  gradientNorm: number;
  /** Condition number κ(H) */
  conditionNumber: number;
}

/** Quadratic form evaluation result */
export interface QuadraticFormResult {
  /** Evaluation point h */
  point: number[];
  /** The symmetric matrix A */
  matrix: number[][];
  /** h^T A h */
  value: number;
}

// ── Eigenvalue computation ────────────────────────────────────

/**
 * Compute eigenvalues and eigenvectors of a 2×2 symmetric matrix.
 * Uses the closed-form formula: λ = (a+c)/2 ± √((a-c)²/4 + b²).
 * Returns eigenvalues sorted ascending with corresponding unit eigenvectors.
 */
export function eigenvalues2x2(
  M: [[number, number], [number, number]],
): { eigenvalues: [number, number]; eigenvectors: [[number, number], [number, number]] } {
  const a = M[0][0];
  const b = M[0][1]; // = M[1][0] by symmetry
  const c = M[1][1];

  const mean = (a + c) / 2;
  const disc = Math.sqrt(((a - c) / 2) ** 2 + b * b);

  const lambda1 = mean - disc; // smaller
  const lambda2 = mean + disc; // larger

  // Compute eigenvectors
  let v1: [number, number];
  let v2: [number, number];

  if (Math.abs(b) < SINGULARITY_TOL) {
    // Diagonal matrix — eigenvectors are standard basis
    if (a <= c) {
      v1 = [1, 0];
      v2 = [0, 1];
    } else {
      v1 = [0, 1];
      v2 = [1, 0];
    }
  } else {
    // For (A - λI)v = 0, use the first row: (a - λ)v₁ + b·v₂ = 0
    // So v = (b, λ - a) normalized
    const raw1x = b;
    const raw1y = lambda1 - a;
    const norm1 = Math.sqrt(raw1x * raw1x + raw1y * raw1y);
    v1 = norm1 > SINGULARITY_TOL ? [raw1x / norm1, raw1y / norm1] : [1, 0];

    const raw2x = b;
    const raw2y = lambda2 - a;
    const norm2 = Math.sqrt(raw2x * raw2x + raw2y * raw2y);
    v2 = norm2 > SINGULARITY_TOL ? [raw2x / norm2, raw2y / norm2] : [0, 1];
  }

  return {
    eigenvalues: [lambda1, lambda2],
    eigenvectors: [v1, v2],
  };
}

/**
 * Compute eigenvalues of a symmetric n×n matrix via the Jacobi eigenvalue algorithm.
 * Guarded to n ≤ 10 for browser performance.
 * Returns eigenvalues sorted ascending with corresponding eigenvectors.
 */
export function eigenvaluesSymmetric(
  M: number[][],
): { eigenvalues: number[]; eigenvectors: number[][] } {
  const n = M.length;
  if (n === 0) return { eigenvalues: [], eigenvectors: [] };
  if (n > MAX_EIGEN_DIM) {
    throw new Error(
      `eigenvaluesSymmetric(): matrix size ${n}×${n} exceeds safe limit (${MAX_EIGEN_DIM}). ` +
        `Use a numerical linear algebra library for large matrices.`,
    );
  }

  // Special case: 1×1
  if (n === 1) {
    return { eigenvalues: [M[0][0]], eigenvectors: [[1]] };
  }

  // Special case: 2×2 — delegate to closed-form
  if (n === 2) {
    const result = eigenvalues2x2(M as [[number, number], [number, number]]);
    return {
      eigenvalues: [...result.eigenvalues],
      eigenvectors: result.eigenvectors.map((v) => [...v]),
    };
  }

  // Jacobi eigenvalue algorithm for n ≥ 3
  // Work on a copy
  const A: number[][] = M.map((row) => [...row]);
  // V accumulates eigenvectors (starts as identity)
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );

  const maxIter = 100 * n * n;
  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0;
    let q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > maxVal) {
          maxVal = Math.abs(A[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < JACOBI_CONVERGENCE_TOL) break; // converged

    // Compute Jacobi rotation to zero out A[p][q]
    const theta =
      Math.abs(A[p][p] - A[q][q]) < SINGULARITY_TOL
        ? Math.PI / 4
        : 0.5 * Math.atan2(2 * A[p][q], A[p][p] - A[q][q]);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // Apply rotation A' = G^T A G
    const newA: number[][] = A.map((row) => [...row]);
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        newA[i][p] = cosT * A[i][p] + sinT * A[i][q];
        newA[p][i] = newA[i][p];
        newA[i][q] = -sinT * A[i][p] + cosT * A[i][q];
        newA[q][i] = newA[i][q];
      }
    }
    newA[p][p] = cosT * cosT * A[p][p] + 2 * sinT * cosT * A[p][q] + sinT * sinT * A[q][q];
    newA[q][q] = sinT * sinT * A[p][p] - 2 * sinT * cosT * A[p][q] + cosT * cosT * A[q][q];
    newA[p][q] = 0;
    newA[q][p] = 0;

    // Copy back
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        A[i][j] = newA[i][j];
      }
    }

    // Accumulate eigenvector rotation: V' = V G
    for (let i = 0; i < n; i++) {
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = cosT * vip + sinT * viq;
      V[i][q] = -sinT * vip + cosT * viq;
    }
  }

  // Extract eigenvalues (diagonal of A) and sort ascending
  const eigs = Array.from({ length: n }, (_, i) => ({
    value: A[i][i],
    vector: V.map((row) => row[i]),
  }));
  eigs.sort((a, b) => a.value - b.value);

  return {
    eigenvalues: eigs.map((e) => e.value),
    eigenvectors: eigs.map((e) => e.vector),
  };
}

// ── Hessian computation ───────────────────────────────────────

/**
 * Classify definiteness from eigenvalues.
 */
function classifyDefiniteness(
  eigenvalues: number[],
  tol: number = DEFINITENESS_TOL,
): HessianResult['classification'] {
  const allPositive = eigenvalues.every((λ) => λ > tol);
  const allNegative = eigenvalues.every((λ) => λ < -tol);
  const allNonneg = eigenvalues.every((λ) => λ >= -tol);
  const allNonpos = eigenvalues.every((λ) => λ <= tol);
  const allZero = eigenvalues.every((λ) => Math.abs(λ) <= tol);

  if (allZero) return 'zero';
  if (allPositive) return 'positive-definite';
  if (allNegative) return 'negative-definite';
  if (allNonneg) return 'positive-semidefinite';
  if (allNonpos) return 'negative-semidefinite';
  return 'indefinite';
}

/**
 * Compute the Hessian matrix of f: ℝⁿ → ℝ at a point via central differences.
 *
 * Uses a larger step size (h = 1e-5) than the gradient (h = 1e-7) because
 * second-order differences amplify floating-point noise as O(ε/h²).
 *
 * Internally computes gradients at shifted points and differences them:
 *   H_{ij} ≈ (∂f/∂x_i(x + h·e_j) − ∂f/∂x_i(x − h·e_j)) / (2h)
 */
export function hessianMatrix(
  f: (...args: number[]) => number,
  point: number[],
  h: number = HESSIAN_STEP_SIZE,
): HessianResult {
  const n = point.length;
  const step = Math.abs(h);
  const H: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  // Compute Hessian via central differences on the gradient
  for (let j = 0; j < n; j++) {
    const pPlus = [...point];
    const pMinus = [...point];
    pPlus[j] += step;
    pMinus[j] -= step;

    const gradPlus = numericalGradient(f, pPlus, step * 0.1);
    const gradMinus = numericalGradient(f, pMinus, step * 0.1);

    for (let i = 0; i < n; i++) {
      H[i][j] = (gradPlus[i] - gradMinus[i]) / (2 * step);
    }
  }

  // Symmetrize: H_sym = (H + H^T) / 2
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const avg = (H[i][j] + H[j][i]) / 2;
      H[i][j] = avg;
      H[j][i] = avg;
    }
  }

  // Eigenvalue decomposition
  const { eigenvalues, eigenvectors } = eigenvaluesSymmetric(H);

  // Determinant and trace
  // determinant() uses cofactor expansion which throws for n > 5.
  // For n > 5, compute det from eigenvalues (product) instead.
  const det = n <= 5
    ? determinant(H)
    : eigenvalues.reduce((prod, λ) => prod * λ, 1);
  const tr = H.reduce((sum, row, i) => sum + row[i], 0);

  return {
    point: [...point],
    matrix: H,
    eigenvalues,
    eigenvectors,
    determinant: det,
    trace: tr,
    classification: classifyDefiniteness(eigenvalues),
  };
}

// ── Critical point classification ────────────────────────────

/**
 * Classify a critical point of f: ℝⁿ → ℝ.
 * Computes gradient (should be near zero) and Hessian, then classifies
 * based on eigenvalue signs.
 */
export function classifyCriticalPoint(
  f: (...args: number[]) => number,
  point: number[],
  h: number = HESSIAN_STEP_SIZE,
): CriticalPointResult {
  const grad = numericalGradient(f, point);
  const hess = hessianMatrix(f, point, h);

  let type: CriticalPointResult['type'];
  switch (hess.classification) {
    case 'positive-definite':
      type = 'local-min';
      break;
    case 'negative-definite':
      type = 'local-max';
      break;
    case 'indefinite':
      type = 'saddle';
      break;
    default:
      type = 'degenerate';
  }

  return {
    point: [...point],
    gradient: grad,
    hessian: hess,
    type,
  };
}

// ── Quadratic form ───────────────────────────────────────────

/**
 * Evaluate the quadratic form h^T A h for a symmetric matrix A.
 */
export function quadraticForm(A: number[][], h: number[]): number {
  const n = A.length;
  let value = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      value += h[i] * A[i][j] * h[j];
    }
  }
  return value;
}

// ── Matrix inversion (for Newton's method) ───────────────────

/**
 * Invert a 2×2 matrix. Returns null if singular (|det| < tol).
 */
function invert2x2(
  M: number[][],
  tol: number = SINGULARITY_TOL,
): number[][] | null {
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  if (Math.abs(det) < tol) return null;
  const invDet = 1 / det;
  return [
    [M[1][1] * invDet, -M[0][1] * invDet],
    [-M[1][0] * invDet, M[0][0] * invDet],
  ];
}

/**
 * Invert an n×n matrix via Gauss-Jordan elimination.
 * Returns null if singular. Guarded to n ≤ 10.
 */
function invertMatrix(
  M: number[][],
  tol: number = SINGULARITY_TOL,
): number[][] | null {
  const n = M.length;
  if (n === 2) return invert2x2(M, tol);

  // Augmented matrix [M | I]
  const aug: number[][] = M.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < tol) return null; // singular

    if (maxRow !== col) {
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    }

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = col; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = col; j < 2 * n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }

  // Extract inverse from right half
  return aug.map((row) => row.slice(n));
}

// ── Newton's method ──────────────────────────────────────────

/**
 * Compute one Newton step: x_{k+1} = x_k − H_f(x_k)⁻¹ ∇f(x_k).
 *
 * If the Hessian is singular or near-singular, falls back to a
 * gradient descent step with unit step size.
 */
export function newtonStep(
  f: (...args: number[]) => number,
  point: number[],
  h: number = HESSIAN_STEP_SIZE,
): NewtonStepResult {
  const grad = numericalGradient(f, point);
  const hess = hessianMatrix(f, point, h);
  const gradNorm = Math.sqrt(grad.reduce((s, g) => s + g * g, 0));
  const fVal = f(...point);
  const kappa = conditionNumber(hess.matrix);

  // Try to invert the Hessian
  const Hinv = invertMatrix(hess.matrix);

  let direction: number[];
  if (Hinv) {
    // Newton direction: -H⁻¹ ∇f
    const n = point.length;
    direction = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        direction[i] -= Hinv[i][j] * grad[j];
      }
    }
  } else {
    // Fallback to a damped negative-gradient step with backtracking
    // to avoid excessively large updates when ||∇f|| is large.
    const descentDir = grad.map((g) => -g);
    const gradNormSq = grad.reduce((s, g) => s + g * g, 0);

    if (gradNormSq < 1e-24) {
      direction = new Array(point.length).fill(0);
    } else {
      let stepScale = 1;
      const c = 1e-4; // Armijo sufficient decrease parameter
      const minStepScale = 1e-6;

      while (stepScale > minStepScale) {
        const candidate = point.map((x, i) => x + stepScale * descentDir[i]);
        const candidateVal = f(...candidate);
        if (Number.isFinite(candidateVal) && candidateVal < fVal - c * stepScale * gradNormSq) {
          break;
        }
        stepScale *= 0.5;
      }
      direction = descentDir.map((d) => d * stepScale);
    }
  }

  const nextPoint = point.map((x, i) => x + direction[i]);

  return {
    currentPoint: [...point],
    gradient: grad,
    hessian: hess.matrix,
    newtonDirection: direction,
    nextPoint,
    functionValue: fVal,
    gradientNorm: gradNorm,
    conditionNumber: kappa,
  };
}

// ── Condition number ─────────────────────────────────────────

/**
 * Compute the condition number κ = |λ_max| / |λ_min| of a symmetric matrix.
 * Returns Infinity if the smallest eigenvalue is zero.
 */
export function conditionNumber(M: number[][]): number {
  const { eigenvalues } = eigenvaluesSymmetric(M);
  if (eigenvalues.length === 0) return 1;

  const absEigs = eigenvalues.map(Math.abs);
  const maxEig = Math.max(...absEigs);
  const minEig = Math.min(...absEigs);

  if (minEig < SINGULARITY_TOL) return Infinity;
  return maxEig / minEig;
}

// ══════════════════════════════════════════════════════════════
// Topic 12 — Inverse & Implicit Function Theorems
// ══════════════════════════════════════════════════════════════

// ── Interfaces (Topic 12) ────────────────────────────────────

/** Result of computing an approximate inverse Jacobian */
export interface InverseJacobianResult {
  /** Evaluation point */
  point: number[];
  /** J_f(point) */
  jacobian: number[][];
  /** [J_f(point)]^{-1}, or empty if singular */
  inverseJacobian: number[][];
  /** det J_f(point) */
  determinant: number;
  /** κ(J_f) = |λ_max| / |λ_min| */
  conditionNumber: number;
  /** Whether |det| > threshold */
  isInvertible: boolean;
}

/** Result of computing a local implicit function slice */
export interface ImplicitSliceResult {
  /** x grid values */
  xValues: number[];
  /** y = g(x) values (NaN where Newton failed) */
  yValues: number[];
  /** g'(x) = -F_x / F_y at each point */
  derivatives: number[];
  /** (a, b) where F(a,b) ≈ 0 */
  basePoint: [number, number];
  /** Whether the ImFT applies at each x (F_y ≠ 0 and Newton converged) */
  valid: boolean[];
}

/** Single step of Newton's method for systems F(x) = 0 */
export interface NewtonSystemStep {
  iteration: number;
  point: number[];
  /** F(x_k) */
  functionValue: number[];
  jacobian: number[][];
  /** -J^{-1} F */
  newtonDirection: number[];
  nextPoint: number[];
  /** ‖F(x_k)‖ */
  residualNorm: number;
}

/** Newton method trajectory for systems */
export interface NewtonSystemResult {
  steps: NewtonSystemStep[];
  converged: boolean;
  /** Final point (root if converged) */
  root: number[];
  iterations: number;
}

/** Contraction mapping iteration result */
export interface ContractionResult {
  /** x_0, x_1, ..., x_k */
  iterates: number[];
  /** Final iterate */
  fixedPoint: number;
  converged: boolean;
  /** λ^k / (1-λ) · |x_1 - x_0| per iterate */
  errorBounds: number[];
  /** Estimated λ from consecutive iterate ratios */
  contractionFactor: number;
}

/** Lagrange multiplier result */
export interface LagrangeResult {
  /** Constrained optimum x* */
  optimum: number[];
  /** Lagrange multiplier(s) */
  lambda: number[];
  /** ∇f at x* */
  gradF: number[];
  /** ∇g_i at x* (one row per constraint) */
  gradG: number[][];
  /** f(x*) */
  objectiveValue: number;
}

// ── Functions (Topic 12) ─────────────────────────────────────

/**
 * Solve a 2×2 linear system Ax = b via Cramer's rule.
 * Returns null if A is singular.
 */
export function solve2x2(
  A: [[number, number], [number, number]],
  b: [number, number],
  threshold: number = SINGULARITY_TOL,
): [number, number] | null {
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  if (Math.abs(det) < threshold) return null;
  const invDet = 1 / det;
  return [
    (b[0] * A[1][1] - b[1] * A[0][1]) * invDet,
    (A[0][0] * b[1] - A[1][0] * b[0]) * invDet,
  ];
}

/**
 * Compute the inverse of the Jacobian matrix at a point.
 * f: ℝⁿ → ℝⁿ (must be square). Returns invertibility analysis.
 * Uses existing jacobianMatrix and invertMatrix helpers.
 */
export function inverseJacobianApprox(
  f: (...args: number[]) => number[],
  point: number[],
  h: number = 1e-7,
  threshold: number = SINGULARITY_TOL,
): InverseJacobianResult {
  // Wrap f to match jacobianMatrix's expected signature
  const fWrapped = (...args: number[]) => f(...args);
  const n = point.length;

  // Compute J_f(point) using existing jacobianMatrix
  const jResult = jacobianMatrix(fWrapped, point, h);
  const J = jResult.matrix;
  const det = determinant(J);
  const isInvertible = Math.abs(det) > threshold;

  let invJ: number[][] = [];
  let kappa = Infinity;

  // Derive isInvertible from actually obtaining an inverse, not just the determinant,
  // to avoid inconsistency between det check and pivot-tolerance check in invertMatrix.
  const inv = Math.abs(det) > threshold ? invertMatrix(J, threshold) : null;
  const actuallyInvertible = inv !== null;
  if (inv) {
    invJ = inv;
    // Condition number: use singular value approximation for small n
    // For 2x2, use eigenvalues of J^T J
    if (n === 2) {
      const JtJ = [
        [J[0][0] * J[0][0] + J[1][0] * J[1][0], J[0][0] * J[0][1] + J[1][0] * J[1][1]],
        [J[0][1] * J[0][0] + J[1][1] * J[1][0], J[0][1] * J[0][1] + J[1][1] * J[1][1]],
      ];
      const { eigenvalues: eigs } = eigenvalues2x2(JtJ);
      const sVals = eigs.map((e) => Math.sqrt(Math.max(0, e)));
      const sMax = Math.max(...sVals);
      const sMin = Math.min(...sVals);
      kappa = sMin > SINGULARITY_TOL ? sMax / sMin : Infinity;
    } else {
      // Rough estimate via matrix norms
      const normJ = Math.sqrt(J.flat().reduce((s, v) => s + v * v, 0));
      const normInv = Math.sqrt(invJ.flat().reduce((s, v) => s + v * v, 0));
      kappa = normJ * normInv;
    }
  }

  return {
    point: [...point],
    jacobian: J,
    inverseJacobian: invJ,
    determinant: det,
    conditionNumber: kappa,
    isInvertible: actuallyInvertible,
  };
}

/**
 * Compute a local implicit function slice near (a, b) where F(a, b) ≈ 0.
 * F: ℝ² → ℝ (scalar). Returns y = g(x) values near x = a
 * using Newton's method on F(x, ·) = 0 for each x.
 */
export function implicitFunctionSlice(
  F: (x: number, y: number) => number,
  Fy: (x: number, y: number) => number,
  basePoint: [number, number],
  xRange: [number, number],
  nPoints: number = 100,
  maxNewtonIter: number = 20,
): ImplicitSliceResult {
  const [a, b] = basePoint;
  const xValues: number[] = [];
  const yValues: number[] = [];
  const derivatives: number[] = [];
  const valid: boolean[] = [];

  const dx = (xRange[1] - xRange[0]) / (nPoints - 1);

  // Start from the base point and march outward for continuity
  const sortedIndices = Array.from({ length: nPoints }, (_, i) => i)
    .sort((i, j) => Math.abs(xRange[0] + i * dx - a) - Math.abs(xRange[0] + j * dx - a));

  // Seed yCache with the grid index nearest to the base point.
  // sortedIndices[0] is already the closest since the array is sorted by |x_i - a|.
  const yCache = new Map<number, number>();
  yCache.set(sortedIndices[0], b);

  for (const idx of sortedIndices) {
    const x = xRange[0] + idx * dx;
    // Use immediate grid neighbors as initial guess — O(1) per point.
    // Since we process outward from the base point, adjacent indices
    // are always the most recently computed neighbors.
    const y0 = yCache.get(idx - 1) ?? yCache.get(idx + 1) ?? b;

    // Newton iteration on F(x, ·) = 0
    let y = y0;
    let converged = false;
    for (let iter = 0; iter < maxNewtonIter; iter++) {
      const fVal = F(x, y);
      const fyVal = Fy(x, y);
      if (Math.abs(fyVal) < SINGULARITY_TOL) break;
      const step = -fVal / fyVal;
      y += step;
      if (Math.abs(fVal) < 1e-12) {
        converged = true;
        break;
      }
    }

    xValues[idx] = x;
    yValues[idx] = converged ? y : NaN;
    valid[idx] = converged && Math.abs(Fy(x, y)) > SINGULARITY_TOL;

    if (converged) {
      yCache.set(idx, y);
      // Compute implicit derivative g'(x) = -F_x / F_y
      const Fx = (F(x + 1e-7, y) - F(x - 1e-7, y)) / (2e-7);
      const fyAtPoint = Fy(x, y);
      derivatives[idx] = Math.abs(fyAtPoint) > SINGULARITY_TOL ? -Fx / fyAtPoint : NaN;
    } else {
      derivatives[idx] = NaN;
    }
  }

  return { xValues, yValues, derivatives, basePoint, valid };
}

/**
 * Newton's method for systems F(x) = 0.
 * F: ℝⁿ → ℝⁿ. Iterates x_{k+1} = x_k - J_F(x_k)^{-1} F(x_k).
 * Returns all intermediate steps for visualization.
 */
export function newtonMethodMultivariate(
  F: (...args: number[]) => number[],
  x0: number[],
  maxIter: number = 50,
  tol: number = 1e-10,
  h: number = 1e-7,
): NewtonSystemResult {
  const steps: NewtonSystemStep[] = [];
  let point = [...x0];

  for (let k = 0; k < maxIter; k++) {
    const fVal = F(...point);
    const residualNorm = Math.sqrt(fVal.reduce((s, v) => s + v * v, 0));

    const J = jacobianMatrix(F, point, h).matrix;
    const invJ = invertMatrix(J);

    let direction: number[];
    if (invJ) {
      // Newton direction: -J^{-1} F
      direction = invJ.map((row) =>
        -row.reduce((s, val, j) => s + val * fVal[j], 0),
      );
    } else {
      // Singular Jacobian — use gradient descent fallback
      direction = fVal.map((v) => -v * 0.01);
    }

    const nextPoint = point.map((x, i) => x + direction[i]);

    steps.push({
      iteration: k,
      point: [...point],
      functionValue: [...fVal],
      jacobian: J,
      newtonDirection: direction,
      nextPoint: [...nextPoint],
      residualNorm,
    });

    if (residualNorm < tol) {
      return { steps, converged: true, root: [...point], iterations: k };
    }

    point = nextPoint;
  }

  return { steps, converged: false, root: [...point], iterations: maxIter };
}

/**
 * Iterate a contraction mapping T: ℝ → ℝ from x₀.
 * Returns all iterates and convergence diagnostics including
 * the a priori error bound λ^k / (1 - λ) · |x₁ - x₀|.
 */
export function contractionIteration(
  T: (x: number) => number,
  x0: number,
  maxIter: number = 100,
  tol: number = 1e-12,
): ContractionResult {
  const iterates: number[] = [x0];
  const errorBounds: number[] = [Infinity];

  let x = x0;
  let converged = false;

  for (let k = 0; k < maxIter; k++) {
    const xNext = T(x);
    iterates.push(xNext);

    if (Math.abs(xNext - x) < tol) {
      converged = true;
      // Fill remaining error bounds
      errorBounds.push(0);
      break;
    }

    x = xNext;
  }

  // Estimate contraction factor λ from consecutive iterate ratios
  let lambda = 0;
  let ratioCount = 0;
  for (let k = 2; k < iterates.length; k++) {
    const d1 = Math.abs(iterates[k] - iterates[k - 1]);
    const d0 = Math.abs(iterates[k - 1] - iterates[k - 2]);
    if (d0 > SINGULARITY_TOL) {
      lambda += d1 / d0;
      ratioCount++;
    }
  }
  lambda = ratioCount > 0 ? lambda / ratioCount : 0.5;

  // Compute a priori error bounds: λ^k / (1 - λ) · |x₁ - x₀|
  const d0 = iterates.length > 1 ? Math.abs(iterates[1] - iterates[0]) : 0;
  const errorScale = lambda < 1 ? d0 / (1 - lambda) : Infinity;
  while (errorBounds.length < iterates.length) {
    const k = errorBounds.length;
    errorBounds.push(Math.pow(lambda, k) * errorScale);
  }

  return {
    iterates,
    fixedPoint: iterates[iterates.length - 1],
    converged,
    errorBounds,
    contractionFactor: lambda,
  };
}

/**
 * Solve a constrained optimization problem via Lagrange conditions.
 * For f: ℝ² → ℝ with single constraint g(x,y) = c.
 * Numerically searches along the constraint curve for ∇f ∥ ∇g.
 */
export function lagrangeMultiplier(
  f: (x: number, y: number) => number,
  gradf: (x: number, y: number) => [number, number],
  g: (x: number, y: number) => number,
  gradg: (x: number, y: number) => [number, number],
  c: number,
  searchDomain: { x: [number, number]; y: [number, number] },
  nGrid: number = 200,
): LagrangeResult {
  // Strategy: sample points near the constraint g(x,y) = c and find
  // where the cross product ∇f × ∇g ≈ 0 (parallelism in 2D)
  const { x: [xMin, xMax], y: [yMin, yMax] } = searchDomain;

  let bestX = (xMin + xMax) / 2;
  let bestY = (yMin + yMax) / 2;
  let bestScore = Infinity;

  // Coarse grid search
  for (let i = 0; i < nGrid; i++) {
    for (let j = 0; j < nGrid; j++) {
      const x = xMin + (xMax - xMin) * i / (nGrid - 1);
      const y = yMin + (yMax - yMin) * j / (nGrid - 1);

      const constraintErr = Math.abs(g(x, y) - c);
      if (constraintErr > 0.1) continue;

      const gf = gradf(x, y);
      const gg = gradg(x, y);
      const ggNorm = Math.sqrt(gg[0] * gg[0] + gg[1] * gg[1]);
      if (ggNorm < SINGULARITY_TOL) continue;

      // Cross product in 2D: gf[0]*gg[1] - gf[1]*gg[0]
      const cross = Math.abs(gf[0] * gg[1] - gf[1] * gg[0]);
      // Score = parallelism error + constraint error (weighted)
      const score = cross + constraintErr * 100;

      if (score < bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
  }

  // Refine with local Newton-like iteration
  for (let iter = 0; iter < 20; iter++) {
    const gVal = g(bestX, bestY);
    const gg = gradg(bestX, bestY);
    const ggNorm = Math.sqrt(gg[0] * gg[0] + gg[1] * gg[1]);
    if (ggNorm < SINGULARITY_TOL) break;

    // Project onto constraint: move along ∇g to satisfy g = c
    const err = gVal - c;
    bestX -= err * gg[0] / (ggNorm * ggNorm);
    bestY -= err * gg[1] / (ggNorm * ggNorm);

    // Move along constraint tangent to minimize cross product
    const gf = gradf(bestX, bestY);
    const gg2 = gradg(bestX, bestY);
    const tangent: [number, number] = [-gg2[1], gg2[0]]; // perpendicular to ∇g
    const tNorm = Math.sqrt(tangent[0] * tangent[0] + tangent[1] * tangent[1]);
    if (tNorm < SINGULARITY_TOL) break;
    tangent[0] /= tNorm;
    tangent[1] /= tNorm;

    // Directional derivative of the Lagrangian condition along tangent
    const dt = 1e-6;
    const crossHere = gf[0] * gg2[1] - gf[1] * gg2[0];
    const xp = bestX + dt * tangent[0];
    const yp = bestY + dt * tangent[1];
    const gfp = gradf(xp, yp);
    const ggp = gradg(xp, yp);
    const crossThere = gfp[0] * ggp[1] - gfp[1] * ggp[0];
    const dCross = (crossThere - crossHere) / dt;

    if (Math.abs(dCross) > SINGULARITY_TOL) {
      const step = -crossHere / dCross;
      const clampedStep = Math.max(-0.5, Math.min(0.5, step));
      bestX += clampedStep * tangent[0];
      bestY += clampedStep * tangent[1];
    }
  }

  const gf = gradf(bestX, bestY);
  const gg = gradg(bestX, bestY);

  // Compute λ: ∇f = λ ∇g → λ = (∇f · ∇g) / (∇g · ∇g)
  const ggDot = gg[0] * gg[0] + gg[1] * gg[1];
  const lam = ggDot > SINGULARITY_TOL ? (gf[0] * gg[0] + gf[1] * gg[1]) / ggDot : 0;

  return {
    optimum: [bestX, bestY],
    lambda: [lam],
    gradF: gf,
    gradG: [gg],
    objectiveValue: f(bestX, bestY),
  };
}

// ══════════════════════════════════════════════════════════════
// Topic 13: Multiple Integrals — Density Functions
// ══════════════════════════════════════════════════════════════

/**
 * Evaluate the bivariate normal density at (x, y).
 *
 *   p(x, y) = (1 / 2π σ_x σ_y √(1 - ρ²)) exp(-Q/2)
 *
 * where Q = [((x-μ_x)/σ_x)² - 2ρ((x-μ_x)/σ_x)((y-μ_y)/σ_y) + ((y-μ_y)/σ_y)²] / (1 - ρ²).
 */
export function bivariateDensity(
  x: number,
  y: number,
  muX: number = 0,
  muY: number = 0,
  sigmaX: number = 1,
  sigmaY: number = 1,
  rho: number = 0,
): number {
  const zx = (x - muX) / sigmaX;
  const zy = (y - muY) / sigmaY;
  const rhoSq = rho * rho;
  const denom = 1 - rhoSq;
  if (denom <= 0) return 0; // degenerate case

  const Q = (zx * zx - 2 * rho * zx * zy + zy * zy) / denom;
  const norm = 2 * Math.PI * sigmaX * sigmaY * Math.sqrt(denom);
  return Math.exp(-Q / 2) / norm;
}

/**
 * Compute the marginal density p_X(x) = ∫ p(x, y) dy
 * via the trapezoidal rule over [yMin, yMax].
 */
export function marginalDensity(
  density: (x: number, y: number) => number,
  x: number,
  yRange: [number, number],
  nPoints: number = 200,
): number {
  const [yMin, yMax] = yRange;
  const h = (yMax - yMin) / nPoints;
  let sum = (density(x, yMin) + density(x, yMax)) / 2;
  for (let i = 1; i < nPoints; i++) {
    sum += density(x, yMin + i * h);
  }
  return sum * h;
}

/**
 * Compute the conditional density p(y | x) = p(x, y) / p_X(x).
 * Uses marginalDensity for the denominator.
 */
export function conditionalDensity(
  density: (x: number, y: number) => number,
  x: number,
  y: number,
  yRange: [number, number],
  nPoints: number = 200,
): number {
  const pX = marginalDensity(density, x, yRange, nPoints);
  if (pX < 1e-15) return 0;
  return density(x, y) / pX;
}
