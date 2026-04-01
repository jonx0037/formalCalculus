/**
 * Data module for Topic 9: Partial Derivatives & the Gradient.
 *
 * Defines preset functions for all visualization components:
 *  - Surface presets (PartialDerivativeSliceExplorer, GradientFieldExplorer)
 *  - Directional derivative presets (DirectionalDerivativeExplorer)
 *  - Loss surface presets (GradientDescentExplorer)
 *  - Contour presets (ContourGradientExplorer)
 *  - Differentiability counterexample data
 *
 * All functions are inline arrow functions. No heavy computation at import time.
 */

// ── Interfaces ─────────────────────────────────────────────

export interface SurfacePreset {
  name: string;
  /** Display label (e.g., "f(x,y) = x² + y²") */
  label: string;
  /** The scalar field f(x, y) */
  f: (x: number, y: number) => number;
  /** Analytical partial derivative df/dx */
  f_x: (x: number, y: number) => number;
  /** Analytical partial derivative df/dy */
  f_y: (x: number, y: number) => number;
  /** x-axis domain bounds */
  xDomain: [number, number];
  /** y-axis domain bounds */
  yDomain: [number, number];
  /** Default evaluation point */
  defaultPoint: [number, number];
  /** Number of contour levels (default 12) */
  contourLevels?: number;
}

export interface DirectionalDerivativePreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  /** Returns [df/dx, df/dy] at (x, y) */
  grad_f: (x: number, y: number) => [number, number];
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];
  /** Default direction angle in radians */
  defaultAngle: number;
}

export interface LossSurfacePreset {
  name: string;
  label: string;
  /** Loss function L(x, y) */
  L: (x: number, y: number) => number;
  /** Gradient of L: returns [dL/dx, dL/dy] */
  grad_L: (x: number, y: number) => [number, number];
  xDomain: [number, number];
  yDomain: [number, number];
  /** Known minimum location */
  minimum: [number, number];
  /** Default starting point for GD */
  defaultStart: [number, number];
  /** Suggested learning rate */
  defaultLR: number;
  /** Notes (e.g., "anisotropic — expect oscillation") */
  notes?: string;
  /** Use log-spaced contour levels */
  logContours?: boolean;
}

export interface DifferentiabilityCounterexample {
  name: string;
  label: string;
  /** The function (defined piecewise, f(0,0) = 0) */
  f: (x: number, y: number) => number;
  /** Value of df/dx at origin */
  f_x_at_origin: number;
  /** Value of df/dy at origin */
  f_y_at_origin: number;
  /** Limit of f along various paths to the origin */
  pathValues: Array<{
    /** Path description (e.g., "y = x", "y = x²") */
    label: string;
    /** Limit along this path */
    value: number;
  }>;
}

// ── Surface Presets ────────────────────────────────────────

export const SURFACE_PRESETS: SurfacePreset[] = [
  {
    name: 'paraboloid',
    label: 'f(x,y) = x² + y²',
    f: (x, y) => x * x + y * y,
    f_x: (x, _y) => 2 * x,
    f_y: (_x, y) => 2 * y,
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 1],
  },
  {
    name: 'egg-carton',
    label: 'f(x,y) = sin(x)cos(y)',
    f: (x, y) => Math.sin(x) * Math.cos(y),
    f_x: (x, y) => Math.cos(x) * Math.cos(y),
    f_y: (x, y) => -Math.sin(x) * Math.sin(y),
    xDomain: [-Math.PI, Math.PI],
    yDomain: [-Math.PI, Math.PI],
    defaultPoint: [1, 0.5],
  },
  {
    name: 'bump',
    label: 'f(x,y) = x·e^(−x²−y²)',
    f: (x, y) => x * Math.exp(-(x * x + y * y)),
    f_x: (x, y) => (1 - 2 * x * x) * Math.exp(-(x * x + y * y)),
    f_y: (x, y) => -2 * x * y * Math.exp(-(x * x + y * y)),
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [0.5, 0],
  },
  {
    name: 'saddle',
    label: 'f(x,y) = (x² − y²)/2',
    f: (x, y) => (x * x - y * y) / 2,
    f_x: (x, _y) => x,
    f_y: (_x, y) => -y,
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 0.5],
  },
];

// ── Directional Derivative Presets ─────────────────────────

export const DIRECTIONAL_DERIVATIVE_PRESETS: DirectionalDerivativePreset[] = [
  {
    name: 'isotropic',
    label: 'f(x,y) = x² + y²',
    f: (x, y) => x * x + y * y,
    grad_f: (x, y) => [2 * x, 2 * y],
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 1],
    defaultAngle: 0,
  },
  {
    name: 'anisotropic',
    label: 'f(x,y) = 2x² + y²',
    f: (x, y) => 2 * x * x + y * y,
    grad_f: (x, y) => [4 * x, 2 * y],
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 1],
    defaultAngle: Math.PI / 4,
  },
  {
    name: 'periodic',
    label: 'f(x,y) = sin(x + y)',
    f: (x, y) => Math.sin(x + y),
    grad_f: (x, y) => [Math.cos(x + y), Math.cos(x + y)],
    xDomain: [-Math.PI, Math.PI],
    yDomain: [-Math.PI, Math.PI],
    defaultPoint: [0.5, 0.5],
    defaultAngle: 0,
  },
];

// ── Loss Surface Presets (Gradient Descent) ────────────────

export const LOSS_SURFACE_PRESETS: LossSurfacePreset[] = [
  {
    name: 'isotropic',
    label: 'L(x,y) = x² + y²',
    L: (x, y) => x * x + y * y,
    grad_L: (x, y) => [2 * x, 2 * y],
    xDomain: [-3, 3],
    yDomain: [-3, 3],
    minimum: [0, 0],
    defaultStart: [2.5, 2],
    defaultLR: 0.1,
    notes: 'Isotropic — gradient descent takes a direct path',
  },
  {
    name: 'anisotropic',
    label: 'L(x,y) = x² + 10y²',
    L: (x, y) => x * x + 10 * y * y,
    grad_L: (x, y) => [2 * x, 20 * y],
    xDomain: [-3, 3],
    yDomain: [-3, 3],
    minimum: [0, 0],
    defaultStart: [2.5, 2],
    defaultLR: 0.05,
    notes: 'Anisotropic — expect oscillation along the y-axis',
  },
  {
    name: 'rosenbrock',
    label: 'L(x,y) = (1−x)² + 100(y−x²)²',
    L: (x, y) => (1 - x) * (1 - x) + 100 * (y - x * x) * (y - x * x),
    grad_L: (x, y) => [
      -2 * (1 - x) - 400 * x * (y - x * x),
      200 * (y - x * x),
    ],
    xDomain: [-2, 2],
    yDomain: [-1, 3],
    minimum: [1, 1],
    defaultStart: [-1.5, 2],
    defaultLR: 0.001,
    notes: 'Rosenbrock — narrow curved valley, classic optimization test',
    logContours: true,
  },
];

// ── Contour Presets (Gradient Orthogonality) ───────────────

export const CONTOUR_PRESETS: SurfacePreset[] = [
  {
    name: 'circular',
    label: 'f(x,y) = x² + y²  (circular contours)',
    f: (x, y) => x * x + y * y,
    f_x: (x, _y) => 2 * x,
    f_y: (_x, y) => 2 * y,
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 1],
  },
  {
    name: 'elliptical',
    label: 'f(x,y) = x² + 4y²  (elliptical contours)',
    f: (x, y) => x * x + 4 * y * y,
    f_x: (x, _y) => 2 * x,
    f_y: (_x, y) => 8 * y,
    xDomain: [-2.5, 2.5],
    yDomain: [-1.5, 1.5],
    defaultPoint: [1, 0.5],
  },
  {
    name: 'saddle-contour',
    label: 'f(x,y) = x² − y²  (hyperbolic contours)',
    f: (x, y) => x * x - y * y,
    f_x: (x, _y) => 2 * x,
    f_y: (_x, y) => -2 * y,
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 0.5],
  },
];

// ── Differentiability Counterexample ───────────────────────

export const COUNTEREXAMPLE_DATA: DifferentiabilityCounterexample = {
  name: 'xy-over-r2',
  label: 'f(x,y) = xy/(x² + y²)',
  f: (x, y) => {
    const r2 = x * x + y * y;
    return r2 > 1e-14 ? (x * y) / r2 : 0;
  },
  f_x_at_origin: 0,
  f_y_at_origin: 0,
  pathValues: [
    { label: 'y = 0 (x-axis)', value: 0 },
    { label: 'x = 0 (y-axis)', value: 0 },
    { label: 'y = x', value: 0.5 },
    { label: 'y = −x', value: -0.5 },
    { label: 'y = x²', value: 0 },
  ],
};
