/**
 * Data presets for the Change of Variables & the Jacobian Determinant topic.
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface CoordinateTransformPreset {
  name: string;
  label: string;
  /** The coordinate transformation φ: (u,v) → (x,y) */
  phi: (u: number, v: number) => [number, number];
  /** The Jacobian matrix at (u,v) */
  jacobian: (u: number, v: number) => [[number, number], [number, number]];
  /** |det J_φ(u,v)| */
  detJ: (u: number, v: number) => number;
  /** Parameter domain for the grid */
  paramDomain: { u: [number, number]; v: [number, number] };
  description: string;
}

export interface PolarIntegralPreset {
  name: string;
  label: string;
  /** Integrand in Cartesian coordinates */
  f: (x: number, y: number) => number;
  /** Integrand in polar coordinates (already composed with the transform) */
  fPolar: (r: number, theta: number) => number;
  /** Region in polar coordinates */
  region: { rRange: [number, number]; thetaRange: [number, number] };
  /** Exact value of the integral */
  exactValue: number;
}

export interface CoordinateSystem3DPreset {
  name: string;
  label: string;
  system: 'cylindrical' | 'spherical';
  /** The coordinate transformation to Cartesian */
  phi: (p1: number, p2: number, p3: number) => [number, number, number];
  /** |det J| as a function of the parameters */
  detJ: (p1: number, p2: number, p3: number) => number;
  /** LaTeX string for the volume element */
  volumeElement: string;
  /** Parameter ranges for sliders */
  paramRanges: { p1: [number, number]; p2: [number, number]; p3: [number, number] };
  /** Display labels for parameters */
  paramLabels: [string, string, string];
}

export interface FlowPreset {
  name: string;
  label: string;
  /**
   * Forward map z → x, evaluated at default param values.
   * The explorer rebuilds these from `params` via `buildFlow` — these
   * static versions are for documentation and non-interactive callers.
   */
  forward: (z: number) => number;
  /** Inverse map x → z at default params */
  inverse: (x: number) => number;
  /** log|det J_f(z)| at default params */
  logDetJ: (z: number) => number;
  /** Adjustable parameters with ranges */
  params: Record<string, { min: number; max: number; default: number; label: string }>;
}

// ── Coordinate Transform Presets ────────────────────────────

export const COORDINATE_TRANSFORM_PRESETS: CoordinateTransformPreset[] = [
  {
    name: 'identity',
    label: 'Identity',
    phi: (u, v) => [u, v],
    jacobian: () => [[1, 0], [0, 1]],
    detJ: () => 1,
    paramDomain: { u: [-2, 2], v: [-2, 2] },
    description: 'The identity map: no deformation. Every cell has |det J| = 1.',
  },
  {
    name: 'polar',
    label: 'Polar',
    phi: (r, theta) => [r * Math.cos(theta), r * Math.sin(theta)],
    jacobian: (r, theta) => [
      [Math.cos(theta), -r * Math.sin(theta)],
      [Math.sin(theta), r * Math.cos(theta)],
    ],
    detJ: (r) => Math.abs(r),
    paramDomain: { u: [0.1, 2], v: [0, 2 * Math.PI] },
    description: 'Polar coordinates: (r,θ) → (r cos θ, r sin θ). The Jacobian determinant is r — cells near the origin are compressed.',
  },
  {
    name: 'elliptical',
    label: 'Elliptical',
    phi: (u, v) => [2 * u * Math.cos(v), u * Math.sin(v)],
    jacobian: (u, v) => [
      [2 * Math.cos(v), -2 * u * Math.sin(v)],
      [Math.sin(v), u * Math.cos(v)],
    ],
    detJ: (u) => Math.abs(2 * u),
    paramDomain: { u: [0.1, 1.5], v: [0, 2 * Math.PI] },
    description: 'Elliptical coordinates with semi-axes a=2, b=1. The Jacobian determinant is 2u — like polar but scaled by the eccentricity.',
  },
  {
    name: 'shear',
    label: 'Shear',
    phi: (u, v) => [u + v, v],
    jacobian: () => [[1, 1], [0, 1]],
    detJ: () => 1,
    paramDomain: { u: [-2, 2], v: [-2, 2] },
    description: 'Affine shear: (u,v) → (u+v, v). Area-preserving — the Jacobian determinant is 1 everywhere.',
  },
  {
    name: 'scaling',
    label: 'Scaling',
    phi: (u, v) => [2 * u, 0.5 * v],
    jacobian: () => [[2, 0], [0, 0.5]],
    detJ: () => 1,
    paramDomain: { u: [-1.5, 1.5], v: [-3, 3] },
    description: 'Anisotropic scaling: stretch by 2 in x, compress by ½ in y. The Jacobian determinant is |2 × 0.5| = 1.',
  },
  {
    name: 'parabolic',
    label: 'Parabolic',
    phi: (u, v) => [(u * u - v * v) / 2, u * v],
    jacobian: (u, v) => [[u, -v], [v, u]],
    detJ: (u, v) => Math.abs(u * u + v * v),
    paramDomain: { u: [0.2, 2], v: [0.2, 2] },
    description: 'Parabolic coordinates: |det J| = u² + v². Cells expand rapidly away from the origin.',
  },
];

// ── Polar Integral Presets ──────────────────────────────────

export const POLAR_INTEGRAL_PRESETS: PolarIntegralPreset[] = [
  {
    name: 'area',
    label: 'Area (f = 1)',
    f: () => 1,
    fPolar: () => 1,
    region: { rRange: [0, 1], thetaRange: [0, 2 * Math.PI] },
    exactValue: Math.PI,
  },
  {
    name: 'r-squared',
    label: 'x² + y²',
    f: (x, y) => x * x + y * y,
    fPolar: (r) => r * r,
    region: { rRange: [0, 1], thetaRange: [0, 2 * Math.PI] },
    exactValue: Math.PI / 2,
  },
  {
    name: 'gaussian',
    label: 'e^{-(x²+y²)}',
    f: (x, y) => Math.exp(-(x * x + y * y)),
    fPolar: (r) => Math.exp(-r * r),
    region: { rRange: [0, 3], thetaRange: [0, 2 * Math.PI] },
    exactValue: Math.PI * (1 - Math.exp(-9)),
  },
  {
    name: 'xy',
    label: 'xy (quarter disk)',
    f: (x, y) => x * y,
    fPolar: (r, theta) => r * r * Math.cos(theta) * Math.sin(theta),
    region: { rRange: [0, 1], thetaRange: [0, Math.PI / 2] },
    exactValue: 1 / 8,
  },
  {
    name: 'sqrt-r',
    label: '√(x² + y²) (annulus)',
    f: (x, y) => Math.sqrt(x * x + y * y),
    fPolar: (r) => r,
    region: { rRange: [1, 2], thetaRange: [0, 2 * Math.PI] },
    exactValue: (2 * Math.PI * (8 - 1)) / 3,
  },
];

// ── 3D Coordinate System Presets ────────────────────────────

export const COORDINATE_SYSTEM_3D_PRESETS: CoordinateSystem3DPreset[] = [
  {
    name: 'cylindrical',
    label: 'Cylindrical',
    system: 'cylindrical',
    phi: (r, theta, z) => [r * Math.cos(theta), r * Math.sin(theta), z],
    detJ: (r) => Math.abs(r),
    volumeElement: 'r\\,dr\\,d\\theta\\,dz',
    paramRanges: { p1: [0.1, 2], p2: [0, 2 * Math.PI], p3: [-2, 2] },
    paramLabels: ['r', 'θ', 'z'],
  },
  {
    name: 'spherical',
    label: 'Spherical',
    system: 'spherical',
    phi: (rho, theta, phi) => [
      rho * Math.sin(phi) * Math.cos(theta),
      rho * Math.sin(phi) * Math.sin(theta),
      rho * Math.cos(phi),
    ],
    detJ: (rho, _theta, phi) => rho * rho * Math.sin(phi),
    volumeElement: '\\rho^2 \\sin\\phi\\,d\\rho\\,d\\theta\\,d\\phi',
    paramRanges: { p1: [0.1, 2], p2: [0, 2 * Math.PI], p3: [0.01, Math.PI] },
    paramLabels: ['ρ', 'θ', 'φ'],
  },
];

// ── Normalizing Flow Presets ────────────────────────────────

export const FLOW_PRESETS: FlowPreset[] = [
  {
    name: 'affine',
    label: 'Affine (shift + scale)',
    forward: (z) => 1.5 * z + 1,
    inverse: (x) => (x - 1) / 1.5,
    logDetJ: () => Math.log(1.5),
    params: {
      scale: { min: 0.3, max: 3, default: 1.5, label: 'Scale (σ)' },
      shift: { min: -3, max: 3, default: 1, label: 'Shift (μ)' },
    },
  },
  {
    name: 'cubic',
    label: 'Cubic',
    forward: (z) => z + 0.5 * z * z * z / 3,
    inverse: (x) => {
      let z = x;
      for (let i = 0; i < 10; i++) {
        z = z - (z + 0.5 * z * z * z / 3 - x) / (1 + 0.5 * z * z);
      }
      return z;
    },
    logDetJ: (z) => Math.log(1 + 0.5 * z * z),
    params: {
      alpha: { min: 0.1, max: 1.0, default: 0.5, label: 'Curvature (α)' },
    },
  },
  {
    name: 'coupling',
    label: 'Exp coupling',
    forward: (z) => Math.exp(0.5) * z + 0.3,
    inverse: (x) => (x - 0.3) * Math.exp(-0.5),
    logDetJ: () => 0.5,
    params: {
      s: { min: -1, max: 1, default: 0.5, label: 'Log-scale (s)' },
      t: { min: -2, max: 2, default: 0.3, label: 'Translation (t)' },
    },
  },
  {
    name: 'composed',
    label: 'Two-layer composition',
    // Layer 1: affine(1.2, 0.5), Layer 2: affine(0.8, -0.3)
    forward: (z) => 0.8 * (1.2 * z + 0.5) - 0.3,
    inverse: (x) => ((x + 0.3) / 0.8 - 0.5) / 1.2,
    logDetJ: () => Math.log(1.2) + Math.log(0.8),
    params: {
      s1: { min: 0.5, max: 2, default: 1.2, label: 'Layer 1 scale' },
      s2: { min: 0.3, max: 1.5, default: 0.8, label: 'Layer 2 scale' },
    },
  },
];
