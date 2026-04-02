/**
 * Data presets for the Jacobian & Multivariate Chain Rule topic (Topic 10).
 * All functions are inline arrow functions — cheap at import time.
 * Analytical Jacobians are provided for accuracy and performance.
 */

// ── Interfaces ────────────────────────────────────────────

/** A 2D vector field preset for JacobianGridExplorer, JacobianLinearApproxExplorer,
 *  and JacobianDeterminantExplorer. */
export interface VectorFieldPreset {
  name: string;
  label: string;
  f: (x: number, y: number) => [number, number];
  J: (x: number, y: number) => [[number, number], [number, number]];
  xDomain: [number, number];
  yDomain: [number, number];
  defaultPoint: [number, number];
  description?: string;
}

/** A chain rule preset for ChainRuleMatrixExplorer. */
export interface ChainRulePreset {
  name: string;
  label: string;
  layers: Array<{
    label: string;
    f: (...args: number[]) => number[];
    J: (...args: number[]) => number[][];
    inputDim: number;
    outputDim: number;
  }>;
  defaultInput: number[];
}

/** A coordinate transformation preset for static examples. */
export interface CoordinateTransformPreset {
  name: string;
  label: string;
  forward: (u: number, v: number) => [number, number];
  jacobian: (u: number, v: number) => [[number, number], [number, number]];
  detJ: (u: number, v: number) => number;
  uDomain: [number, number];
  vDomain: [number, number];
  /** LaTeX string for the area/volume element */
  areaElement: string;
}

// ── Vector field presets ──────────────────────────────────

export const VECTOR_FIELD_PRESETS: VectorFieldPreset[] = [
  {
    name: 'polar',
    label: 'Polar → Cartesian',
    description: 'f(r, θ) = (r cos θ, r sin θ)',
    f: (r, theta) => [r * Math.cos(theta), r * Math.sin(theta)],
    J: (r, theta) => [
      [Math.cos(theta), -r * Math.sin(theta)],
      [Math.sin(theta), r * Math.cos(theta)],
    ],
    xDomain: [0.5, 3],
    yDomain: [0, Math.PI * 2],
    defaultPoint: [2, Math.PI / 4],
  },
  {
    name: 'complex-squaring',
    label: 'Complex squaring',
    description: 'f(x, y) = (x² − y², 2xy)',
    f: (x, y) => [x * x - y * y, 2 * x * y],
    J: (x, y) => [
      [2 * x, -2 * y],
      [2 * y, 2 * x],
    ],
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 0.5],
  },
  {
    name: 'shear',
    label: 'Shear',
    description: 'f(x, y) = (x + y, y)',
    f: (x, y) => [x + y, y],
    J: (_x, _y) => [
      [1, 1],
      [0, 1],
    ],
    xDomain: [-2, 2],
    yDomain: [-2, 2],
    defaultPoint: [1, 1],
  },
  {
    name: 'conformal-exp',
    label: 'Conformal exponential',
    description: 'f(x, y) = (eˣ cos y, eˣ sin y)',
    f: (x, y) => [Math.exp(x) * Math.cos(y), Math.exp(x) * Math.sin(y)],
    J: (x, y) => [
      [Math.exp(x) * Math.cos(y), -Math.exp(x) * Math.sin(y)],
      [Math.exp(x) * Math.sin(y), Math.exp(x) * Math.cos(y)],
    ],
    xDomain: [-1, 1.5],
    yDomain: [-Math.PI, Math.PI],
    defaultPoint: [0.5, 0.5],
  },
];

// ── Chain rule presets ────────────────────────────────────

/** Sigmoid function and its derivative for the neural network preset */
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const sigmoidPrime = (z: number) => {
  const s = sigmoid(z);
  return s * (1 - s);
};

export const CHAIN_RULE_PRESETS: ChainRulePreset[] = [
  {
    name: 'two-function',
    label: 'Two-function composition',
    layers: [
      {
        label: 'g',
        f: (x, y) => [x * x + y, x * y],
        J: (x, y) => [
          [2 * x, 1],
          [y, x],
        ],
        inputDim: 2,
        outputDim: 2,
      },
      {
        label: 'f',
        f: (u, v) => [u * u + v * v],
        J: (u, v) => [[2 * u, 2 * v]],
        inputDim: 2,
        outputDim: 1,
      },
    ],
    defaultInput: [1, 1],
  },
  {
    name: 'three-function',
    label: 'Three-function composition',
    layers: [
      {
        label: 'f₁',
        f: (x, y) => [x + y, x - y],
        J: (_x, _y) => [
          [1, 1],
          [1, -1],
        ],
        inputDim: 2,
        outputDim: 2,
      },
      {
        label: 'f₂',
        f: (u, v) => [u * v, u + v],
        J: (u, v) => [
          [v, u],
          [1, 1],
        ],
        inputDim: 2,
        outputDim: 2,
      },
      {
        label: 'f₃',
        f: (p, q) => [p * p - q],
        J: (p, q) => [[2 * p, -1]],
        inputDim: 2,
        outputDim: 1,
      },
    ],
    defaultInput: [1, 0.5],
  },
  {
    name: 'neural-network',
    label: 'Neural network (2-layer)',
    layers: [
      {
        label: 'Linear₁',
        // W₁ = [[0.5, -0.3], [0.8, 0.2]], b₁ = [0.1, -0.1]
        f: (x1, x2) => [0.5 * x1 - 0.3 * x2 + 0.1, 0.8 * x1 + 0.2 * x2 - 0.1],
        J: (_x1, _x2) => [
          [0.5, -0.3],
          [0.8, 0.2],
        ],
        inputDim: 2,
        outputDim: 2,
      },
      {
        label: 'σ',
        f: (z1, z2) => [sigmoid(z1), sigmoid(z2)],
        J: (z1, z2) => [
          [sigmoidPrime(z1), 0],
          [0, sigmoidPrime(z2)],
        ],
        inputDim: 2,
        outputDim: 2,
      },
      {
        label: 'Linear₂',
        // W₂ = [[0.6, 0.4]], b₂ = [0]
        f: (a1, a2) => [0.6 * a1 + 0.4 * a2],
        J: (_a1, _a2) => [[0.6, 0.4]],
        inputDim: 2,
        outputDim: 1,
      },
      {
        label: 'Loss',
        // L(ŷ) = (ŷ - 0.7)² (target = 0.7)
        f: (yhat) => [(yhat - 0.7) * (yhat - 0.7)],
        J: (yhat) => [[2 * (yhat - 0.7)]],
        inputDim: 1,
        outputDim: 1,
      },
    ],
    defaultInput: [1, 0.5],
  },
];

// ── Coordinate transform presets ──────────────────────────

export const COORDINATE_TRANSFORM_PRESETS: CoordinateTransformPreset[] = [
  {
    name: 'polar',
    label: 'Polar coordinates',
    forward: (r, theta) => [r * Math.cos(theta), r * Math.sin(theta)],
    jacobian: (r, theta) => [
      [Math.cos(theta), -r * Math.sin(theta)],
      [Math.sin(theta), r * Math.cos(theta)],
    ],
    detJ: (r, _theta) => r,
    uDomain: [0.2, 2.5],
    vDomain: [0, 2 * Math.PI],
    areaElement: 'r\\,dr\\,d\\theta',
  },
  {
    name: 'spherical-slice',
    label: 'Spherical (θ–φ slice, r = 1)',
    forward: (theta, phi) => [
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
    ],
    jacobian: (theta, phi) => [
      [-Math.sin(phi) * Math.sin(theta), Math.cos(phi) * Math.cos(theta)],
      [Math.sin(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta)],
    ],
    detJ: (theta, phi) =>
      Math.sin(phi) * Math.cos(phi) * (Math.cos(theta) ** 2 + Math.sin(theta) ** 2),
    uDomain: [0, 2 * Math.PI],
    vDomain: [0.1, Math.PI - 0.1],
    areaElement: 'r^2 \\sin\\phi\\,dr\\,d\\theta\\,d\\phi',
  },
  {
    name: 'affine-scaling',
    label: 'Affine scaling (2x, 3y)',
    forward: (x, y) => [2 * x, 3 * y],
    jacobian: (_x, _y) => [
      [2, 0],
      [0, 3],
    ],
    detJ: (_x, _y) => 6,
    uDomain: [-1, 1],
    vDomain: [-1, 1],
    areaElement: '6\\,dx\\,dy',
  },
];
