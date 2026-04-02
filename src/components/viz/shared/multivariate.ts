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

  if (Math.abs(b) < 1e-14) {
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
    v1 = norm1 > 1e-14 ? [raw1x / norm1, raw1y / norm1] : [1, 0];

    const raw2x = b;
    const raw2y = lambda2 - a;
    const norm2 = Math.sqrt(raw2x * raw2x + raw2y * raw2y);
    v2 = norm2 > 1e-14 ? [raw2x / norm2, raw2y / norm2] : [0, 1];
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
  if (n > 10) {
    throw new Error(
      `eigenvaluesSymmetric(): matrix size ${n}×${n} exceeds safe limit. ` +
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

    if (maxVal < 1e-12) break; // converged

    // Compute Jacobi rotation to zero out A[p][q]
    const theta =
      Math.abs(A[p][p] - A[q][q]) < 1e-14
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
  tol: number = 1e-8,
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
  h: number = 1e-5,
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
  const det = determinant(H);
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
  h: number = 1e-5,
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
  tol: number = 1e-10,
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
  tol: number = 1e-10,
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
  h: number = 1e-5,
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
    // Fallback to negative gradient (GD step)
    direction = grad.map((g) => -g);
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

  if (minEig < 1e-14) return Infinity;
  return maxEig / minEig;
}
