/**
 * Data presets for the Hessian & Second-Order Analysis topic (Topic 11).
 * All functions are inline arrow functions — cheap at import time.
 * Analytical gradients and Hessians are provided for accuracy and performance;
 * numerical computation via multivariate.ts is available as a fallback.
 */

// ── Interfaces ────────────────────────────────────────────

/** A 2D scalar field preset for HessianEigenExplorer, SaddlePointExplorer,
 *  and CurvatureHeatmapExplorer. */
export interface HessianSurfacePreset {
  name: string;
  label: string;
  /** f: ℝ² → ℝ */
  f: (x: number, y: number) => number;
  /** Analytical gradient */
  grad: (x: number, y: number) => [number, number];
  /** Analytical Hessian */
  hessian: (x: number, y: number) => [[number, number], [number, number]];
  xDomain: [number, number];
  yDomain: [number, number];
  /** Known critical points for visualization */
  criticalPoints: Array<{
    point: [number, number];
    type: 'local-min' | 'local-max' | 'saddle' | 'degenerate';
  }>;
  description?: string;
}

/** A preset for the NewtonMethodExplorer comparing GD vs Newton. */
export interface NewtonPreset {
  name: string;
  label: string;
  /** f: ℝ² → ℝ (the objective) */
  f: (x: number, y: number) => number;
  /** Analytical gradient */
  grad: (x: number, y: number) => [number, number];
  /** Analytical Hessian */
  hessian: (x: number, y: number) => [[number, number], [number, number]];
  xDomain: [number, number];
  yDomain: [number, number];
  /** Default starting point for optimization */
  defaultStart: [number, number];
  /** Known minimum */
  minimum: [number, number];
  /** Approximate condition number κ(H) at the minimum */
  conditionNumber: number;
  description?: string;
}

// ── Surface presets ─────────────────────────────────────────

export const HESSIAN_SURFACE_PRESETS: HessianSurfacePreset[] = [
  {
    name: 'paraboloid',
    label: 'Elliptic Paraboloid: x² + 4y²',
    description: 'Positive definite everywhere — the simplest bowl',
    f: (x, y) => x * x + 4 * y * y,
    grad: (x, y) => [2 * x, 8 * y],
    hessian: () => [
      [2, 0],
      [0, 8],
    ],
    xDomain: [-3, 3],
    yDomain: [-2, 2],
    criticalPoints: [{ point: [0, 0], type: 'local-min' }],
  },
  {
    name: 'saddle',
    label: 'Hyperbolic Paraboloid: x² − y²',
    description: 'Indefinite everywhere — the canonical saddle surface',
    f: (x, y) => x * x - y * y,
    grad: (x, y) => [2 * x, -2 * y],
    hessian: () => [
      [2, 0],
      [0, -2],
    ],
    xDomain: [-3, 3],
    yDomain: [-3, 3],
    criticalPoints: [{ point: [0, 0], type: 'saddle' }],
  },
  {
    name: 'multi-critical',
    label: 'Multi-Critical: x⁴ + y⁴ − 2x² − 2y² + 1',
    description: 'Nine critical points — minima, maxima, and saddles',
    f: (x, y) => x ** 4 + y ** 4 - 2 * x * x - 2 * y * y + 1,
    grad: (x, y) => [4 * x ** 3 - 4 * x, 4 * y ** 3 - 4 * y],
    hessian: (x, y) => [
      [12 * x * x - 4, 0],
      [0, 12 * y * y - 4],
    ],
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    criticalPoints: [
      { point: [0, 0], type: 'local-max' },
      { point: [1, 0], type: 'saddle' },
      { point: [-1, 0], type: 'saddle' },
      { point: [0, 1], type: 'saddle' },
      { point: [0, -1], type: 'saddle' },
      { point: [1, 1], type: 'local-min' },
      { point: [-1, 1], type: 'local-min' },
      { point: [1, -1], type: 'local-min' },
      { point: [-1, -1], type: 'local-min' },
    ],
  },
  {
    name: 'rosenbrock',
    label: 'Rosenbrock: (1−x)² + 100(y−x²)²',
    description: 'Severely ill-conditioned — gradient descent zigzags in the narrow valley',
    f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    grad: (x, y) => [
      -2 * (1 - x) + 200 * (y - x * x) * (-2 * x),
      200 * (y - x * x),
    ],
    hessian: (x, y) => [
      [2 - 400 * y + 1200 * x * x, -400 * x],
      [-400 * x, 200],
    ],
    xDomain: [-2, 2],
    yDomain: [-1, 3],
    criticalPoints: [{ point: [1, 1], type: 'local-min' }],
  },
];

// ── Newton method presets ────────────────────────────────────

export const NEWTON_PRESETS: NewtonPreset[] = [
  {
    name: 'isotropic',
    label: 'Isotropic Bowl: x² + y²',
    description: 'κ = 1 — GD and Newton perform identically',
    f: (x, y) => x * x + y * y,
    grad: (x, y) => [2 * x, 2 * y],
    hessian: () => [
      [2, 0],
      [0, 2],
    ],
    xDomain: [-4, 4],
    yDomain: [-4, 4],
    defaultStart: [3, 3],
    minimum: [0, 0],
    conditionNumber: 1,
  },
  {
    name: 'elliptic',
    label: 'Elliptic Bowl: 5x² + y²',
    description: 'κ = 5 — moderate ill-conditioning shows GD zigzag',
    f: (x, y) => 5 * x * x + y * y,
    grad: (x, y) => [10 * x, 2 * y],
    hessian: () => [
      [10, 0],
      [0, 2],
    ],
    xDomain: [-4, 4],
    yDomain: [-4, 4],
    defaultStart: [-3, 3],
    minimum: [0, 0],
    conditionNumber: 5,
  },
  {
    name: 'rosenbrock',
    label: 'Rosenbrock: (1−x)² + 100(y−x²)²',
    description: 'κ ≈ 2500 — severely ill-conditioned narrow valley',
    f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    grad: (x, y) => [
      -2 * (1 - x) - 400 * x * (y - x * x),
      200 * (y - x * x),
    ],
    hessian: (x, y) => [
      [2 - 400 * y + 1200 * x * x, -400 * x],
      [-400 * x, 200],
    ],
    xDomain: [-2, 2],
    yDomain: [-1, 3],
    defaultStart: [-1.5, 2],
    minimum: [1, 1],
    conditionNumber: 2508,
  },
  {
    name: 'beale',
    label: "Beale: Σ(cₖ − x(1−yᵏ))²",
    description: 'Classic nonlinear test function with curved valley',
    f: (x, y) => {
      const t1 = 1.5 - x * (1 - y);
      const t2 = 2.25 - x * (1 - y * y);
      const t3 = 2.625 - x * (1 - y * y * y);
      return t1 * t1 + t2 * t2 + t3 * t3;
    },
    grad: (x, y) => {
      const t1 = 1.5 - x * (1 - y);
      const t2 = 2.25 - x * (1 - y * y);
      const t3 = 2.625 - x * (1 - y * y * y);
      const dx =
        2 * t1 * (-(1 - y)) +
        2 * t2 * (-(1 - y * y)) +
        2 * t3 * (-(1 - y * y * y));
      const dy =
        2 * t1 * x +
        2 * t2 * (2 * x * y) +
        2 * t3 * (3 * x * y * y);
      return [dx, dy];
    },
    hessian: (x, y) => {
      // Numerical approximation is acceptable here —
      // the analytical Hessian of Beale's function is unwieldy.
      // We compute it via finite differences on the analytical gradient.
      const h = 1e-5;
      const g = (xx: number, yy: number): [number, number] => {
        const t1 = 1.5 - xx * (1 - yy);
        const t2 = 2.25 - xx * (1 - yy * yy);
        const t3 = 2.625 - xx * (1 - yy * yy * yy);
        const dx =
          2 * t1 * (-(1 - yy)) +
          2 * t2 * (-(1 - yy * yy)) +
          2 * t3 * (-(1 - yy * yy * yy));
        const dy =
          2 * t1 * xx +
          2 * t2 * (2 * xx * yy) +
          2 * t3 * (3 * xx * yy * yy);
        return [dx, dy];
      };
      const gxp = g(x + h, y);
      const gxm = g(x - h, y);
      const gyp = g(x, y + h);
      const gym = g(x, y - h);
      const hxx = (gxp[0] - gxm[0]) / (2 * h);
      const hxy = (gyp[0] - gym[0]) / (2 * h);
      const hyy = (gyp[1] - gym[1]) / (2 * h);
      return [
        [hxx, hxy],
        [hxy, hyy],
      ];
    },
    xDomain: [-1, 4.5],
    yDomain: [-1, 2],
    defaultStart: [-0.5, 1.5],
    minimum: [3, 0.5],
    conditionNumber: 50,
  },
];
