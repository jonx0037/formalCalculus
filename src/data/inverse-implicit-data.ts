/**
 * Data presets for the Inverse & Implicit Function Theorems topic (Topic 12).
 * Provides function definitions, analytical Jacobians, and domain configurations
 * for the four interactive visualizations.
 */

// ── InverseMapExplorer presets ───────────────────────────────

export interface InverseMapPreset {
  name: string;
  label: string;
  f: (x: number, y: number) => [number, number];
  J: (x: number, y: number) => [[number, number], [number, number]];
  detJ: (x: number, y: number) => number;
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];
  singularPoints?: Array<[number, number]>;
  description?: string;
}

export const INVERSE_MAP_PRESETS: InverseMapPreset[] = [
  {
    name: 'polar',
    label: 'Polar: (r cos θ, r sin θ)',
    f: (r, theta) => [r * Math.cos(theta), r * Math.sin(theta)],
    J: (r, theta) => [
      [Math.cos(theta), -r * Math.sin(theta)],
      [Math.sin(theta), r * Math.cos(theta)],
    ],
    detJ: (r, _theta) => r,
    xDomain: [0.1, 3],
    yDomain: [0, Math.PI * 1.5],
    defaultPoint: [1.5, Math.PI / 4],
    singularPoints: [[0, 0]],
    description: 'Polar coordinates: det J = r, singular at the origin',
  },
  {
    name: 'complex-squaring',
    label: 'Complex squaring: (x²−y², 2xy)',
    f: (x, y) => [x * x - y * y, 2 * x * y],
    J: (x, y) => [
      [2 * x, -2 * y],
      [2 * y, 2 * x],
    ],
    detJ: (x, y) => 4 * (x * x + y * y),
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 1],
    singularPoints: [[0, 0]],
    description: 'Complex z² map: det J = 4|z|², singular only at the origin',
  },
  {
    name: 'conformal-exp',
    label: 'Conformal exp: (eˣ cos y, eˣ sin y)',
    f: (x, y) => [Math.exp(x) * Math.cos(y), Math.exp(x) * Math.sin(y)],
    J: (x, y) => [
      [Math.exp(x) * Math.cos(y), -Math.exp(x) * Math.sin(y)],
      [Math.exp(x) * Math.sin(y), Math.exp(x) * Math.cos(y)],
    ],
    detJ: (x, _y) => Math.exp(2 * x),
    xDomain: [-1.5, 1.5],
    yDomain: [-Math.PI, Math.PI],
    defaultPoint: [0.5, 0.5],
    description: 'Complex exponential: det J = e^{2x} > 0 everywhere — locally invertible at every point, but not globally injective (2π-periodic in y)',
  },
  {
    name: 'shear-rotation',
    label: 'Shear: (x + y sin x, y cos x)',
    f: (x, y) => [x + y * Math.sin(x), y * Math.cos(x)],
    J: (x, y) => [
      [1 + y * Math.cos(x), Math.sin(x)],
      [-y * Math.sin(x), Math.cos(x)],
    ],
    detJ: (x, y) => Math.cos(x) + y * Math.cos(x) * Math.cos(x) + y * Math.sin(x) * Math.sin(x),
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [0.5, 1],
    description: 'Non-linear shear with rotation: det J varies, creating regions of invertibility and non-invertibility',
  },
];

// ── ImplicitCurveExplorer presets ────────────────────────────

export interface ImplicitCurvePreset {
  name: string;
  label: string;
  F: (x: number, y: number) => number;
  Fx: (x: number, y: number) => number;
  Fy: (x: number, y: number) => number;
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];
  singularPoints?: Array<[number, number]>;
  description?: string;
}

export const IMPLICIT_CURVE_PRESETS: ImplicitCurvePreset[] = [
  {
    name: 'circle',
    label: 'Circle: x² + y² = 1',
    F: (x, y) => x * x + y * y - 1,
    Fx: (x, _y) => 2 * x,
    Fy: (_x, y) => 2 * y,
    xDomain: [-1.5, 1.5],
    yDomain: [-1.5, 1.5],
    defaultPoint: [0, 1],
    singularPoints: [[1, 0], [-1, 0]],
    description: 'Unit circle: F_y = 2y = 0 at (±1, 0) — vertical tangents where the ImFT fails for y = g(x)',
  },
  {
    name: 'ellipse',
    label: 'Ellipse: x²/4 + y² = 1',
    F: (x, y) => x * x / 4 + y * y - 1,
    Fx: (x, _y) => x / 2,
    Fy: (_x, y) => 2 * y,
    xDomain: [-2.5, 2.5],
    yDomain: [-1.5, 1.5],
    defaultPoint: [0, 1],
    singularPoints: [[2, 0], [-2, 0]],
    description: 'Ellipse with semi-axes 2 and 1: singular at (±2, 0)',
  },
  {
    name: 'folium',
    label: 'Folium of Descartes: x³ + y³ = 3xy',
    F: (x, y) => x * x * x + y * y * y - 3 * x * y,
    Fx: (x, y) => 3 * x * x - 3 * y,
    Fy: (x, y) => 3 * y * y - 3 * x,
    xDomain: [-2, 3],
    yDomain: [-2, 3],
    defaultPoint: [1.5, 1.5],
    singularPoints: [[0, 0]],
    description: 'Folium of Descartes: self-intersecting at the origin — both F_x and F_y vanish, so neither the ImFT for y = g(x) nor x = h(y) applies',
  },
  {
    name: 'lemniscate',
    label: 'Lemniscate: (x²+y²)² = x²−y²',
    F: (x, y) => (x * x + y * y) * (x * x + y * y) - (x * x - y * y),
    Fx: (x, y) => 4 * x * (x * x + y * y) - 2 * x,
    Fy: (x, y) => 4 * y * (x * x + y * y) + 2 * y,
    xDomain: [-1.5, 1.5],
    yDomain: [-0.8, 0.8],
    defaultPoint: [0.9, 0.2],
    singularPoints: [[0, 0]],
    description: 'Lemniscate of Bernoulli: figure-eight with a crossing at the origin',
  },
];

// ── LagrangeMultiplierExplorer presets ───────────────────────

export interface LagrangePreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  gradf: (x: number, y: number) => [number, number];
  g: (x: number, y: number) => number;
  gradg: (x: number, y: number) => [number, number];
  cDefault: number;
  cDomain: [number, number];
  xDomain: [number, number];
  yDomain: [number, number];
  optimum: (c: number) => [number, number];
  lambda: (c: number) => number;
  description?: string;
}

export const LAGRANGE_PRESETS: LagrangePreset[] = [
  {
    name: 'min-distance-line',
    label: 'Min x² + y² on x + y = c',
    f: (x, y) => x * x + y * y,
    gradf: (x, y) => [2 * x, 2 * y],
    g: (x, y) => x + y,
    gradg: (_x, _y) => [1, 1],
    cDefault: 2,
    cDomain: [-3, 3],
    xDomain: [-3, 3],
    yDomain: [-3, 3],
    optimum: (c) => [c / 2, c / 2],
    lambda: (c) => c,
    description: 'Minimize distance to origin on a line: optimum at (c/2, c/2), λ = c',
  },
  {
    name: 'max-product-circle',
    label: 'Max xy on x² + y² = c',
    f: (x, y) => x * y,
    gradf: (x, y) => [y, x],
    g: (x, y) => x * x + y * y,
    gradg: (x, y) => [2 * x, 2 * y],
    cDefault: 1,
    cDomain: [0.25, 4],
    xDomain: [-2.5, 2.5],
    yDomain: [-2.5, 2.5],
    optimum: (c) => {
      const r = Math.sqrt(c / 2);
      return [r, r];
    },
    lambda: (c) => 0.5,
    description: 'Maximize xy on a circle: optimum at (√(c/2), √(c/2)), λ = 1/2',
  },
  {
    name: 'min-rosenbrock-ellipse',
    label: 'Min (1−x)² + 10(y−x²)² on ellipse',
    f: (x, y) => (1 - x) * (1 - x) + 10 * (y - x * x) * (y - x * x),
    gradf: (x, y) => [
      -2 * (1 - x) - 40 * x * (y - x * x),
      20 * (y - x * x),
    ],
    g: (x, y) => x * x / 4 + y * y,
    gradg: (x, y) => [x / 2, 2 * y],
    cDefault: 1,
    cDomain: [0.25, 4],
    xDomain: [-3, 3],
    yDomain: [-2, 2],
    // Approximate optimum — no closed form
    optimum: (c) => {
      const r = Math.sqrt(c);
      return [2 * r * 0.7, r * 0.5];
    },
    lambda: (_c) => 0,
    description: 'Minimize the Rosenbrock function on an ellipse — no closed-form solution, found numerically',
  },
];

// ── ContractionMappingExplorer presets ───────────────────────

export interface ContractionPreset {
  name: string;
  label: string;
  T: (x: number) => number;
  Tprime: (x: number) => number;
  domain: [number, number];
  fixedPoint: number;
  contractionFactor: number;
  description?: string;
}

export const CONTRACTION_PRESETS: ContractionPreset[] = [
  {
    name: 'cosine',
    label: 'T(x) = cos(x)',
    T: (x) => Math.cos(x),
    Tprime: (x) => -Math.sin(x),
    domain: [0, 1.5],
    fixedPoint: 0.7390851332,
    contractionFactor: 0.6736,
    description: 'cos(x) is a contraction on [0, 1.5] with |sin(x)| ≤ sin(1) ≈ 0.84. Fixed point ≈ 0.739',
  },
  {
    name: 'sqrt-iteration',
    label: 'T(x) = (x + 2/x) / 2',
    T: (x) => (x + 2 / x) / 2,
    Tprime: (x) => (1 - 2 / (x * x)) / 2,
    domain: [0.5, 3],
    fixedPoint: Math.SQRT2,
    contractionFactor: 0.25,
    description: 'Babylonian method for √2: T(x) = (x + 2/x)/2. Quadratic convergence near √2',
  },
  {
    name: 'exp-average',
    label: 'T(x) = (x + e⁻ˣ) / 2',
    T: (x) => (x + Math.exp(-x)) / 2,
    Tprime: (x) => (1 - Math.exp(-x)) / 2,
    domain: [0, 2],
    fixedPoint: 0.5671432904,
    contractionFactor: 0.35,
    description: 'Average of x and e^{-x}: contraction with λ ≈ 0.35. Fixed point ≈ 0.567 (solves x = e^{-x})',
  },
];
