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
  for (let i = 0; i < n; i++) {
    const forward = point.slice();
    const backward = point.slice();
    forward[i] += h;
    backward[i] -= h;
    grad[i] = (f(...forward) - f(...backward)) / (2 * h);
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
 */
export function directionalDerivative(
  grad: number[],
  direction: number[],
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
    point: [],
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
