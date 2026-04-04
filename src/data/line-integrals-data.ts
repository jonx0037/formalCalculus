/**
 * Data presets for the Line Integrals & Conservative Fields topic.
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface VectorField2DPreset {
  name: string;
  label: string;
  /** x-component P(x, y) of the vector field F = (P, Q) */
  P: (x: number, y: number) => number;
  /** y-component Q(x, y) of the vector field F = (P, Q) */
  Q: (x: number, y: number) => number;
  isConservative: boolean;
  /** Potential function φ such that F = ∇φ (if conservative) */
  potential?: (x: number, y: number) => number;
  /** Analytical curl ∂Q/∂x − ∂P/∂y */
  curl: (x: number, y: number) => number;
  description: string;
}

export interface CurvePreset {
  name: string;
  label: string;
  /** Parameterization r(t) = [x(t), y(t)] */
  r: (t: number) => [number, number];
  /** Velocity r'(t) = [x'(t), y'(t)] */
  rPrime: (t: number) => [number, number];
  /** Parameter domain [a, b] */
  domain: [number, number];
  isClosed: boolean;
  description: string;
}

export interface RegionPreset {
  name: string;
  label: string;
  /** Boundary curve parameterization (closed, CCW) */
  boundary: CurvePreset;
  isSimplyConnected: boolean;
  description: string;
}

// ── Helper: wrap vector field preset as F(x,y) → [number, number] ──

/** Convert a VectorField2DPreset to the tuple form F(x,y) → [P, Q] */
export function asF(preset: VectorField2DPreset): (x: number, y: number) => [number, number] {
  return (x, y) => [preset.P(x, y), preset.Q(x, y)];
}

// ── Vector Field Presets ────────────────────────────────────

export const VECTOR_FIELD_PRESETS: VectorField2DPreset[] = [
  {
    name: 'constant',
    label: 'Constant (1, 0)',
    P: () => 1,
    Q: () => 0,
    isConservative: true,
    potential: (x) => x,
    curl: () => 0,
    description: 'Uniform flow to the right. Conservative with potential φ = x.',
  },
  {
    name: 'radial',
    label: 'Radial (x, y)',
    P: (x) => x,
    Q: (_x, y) => y,
    isConservative: true,
    potential: (x, y) => (x * x + y * y) / 2,
    curl: () => 0,
    description: 'Points outward from origin. Conservative with potential φ = (x² + y²)/2.',
  },
  {
    name: 'rotation',
    label: 'Rotation (−y, x)',
    P: (_x, y) => -y,
    Q: (x) => x,
    isConservative: false,
    curl: () => 2,
    description: 'Rigid counterclockwise rotation. Constant curl = 2 everywhere.',
  },
  {
    name: 'saddle',
    label: 'Saddle (x, −y)',
    P: (x) => x,
    Q: (_x, y) => -y,
    isConservative: true,
    potential: (x, y) => (x * x - y * y) / 2,
    curl: () => 0,
    description: 'Saddle-type expansion. Conservative with potential φ = (x² − y²)/2.',
  },
  {
    name: 'gravity',
    label: 'Gravity (0, −1)',
    P: () => 0,
    Q: () => -1,
    isConservative: true,
    potential: (_x, y) => -y,
    curl: () => 0,
    description: 'Uniform downward field. Conservative with potential φ = −y.',
  },
  {
    name: 'vortex',
    label: 'Vortex (−y, x)/(x²+y²)',
    P: (x, y) => {
      const r2 = x * x + y * y;
      return r2 < 1e-12 ? 0 : -y / r2;
    },
    Q: (x, y) => {
      const r2 = x * x + y * y;
      return r2 < 1e-12 ? 0 : x / r2;
    },
    isConservative: false,
    curl: (x, y) => {
      // Curl is 0 away from origin, but the field is NOT conservative
      // because the domain ℝ² \ {0} is not simply connected
      const r2 = x * x + y * y;
      return r2 < 1e-12 ? Infinity : 0;
    },
    description:
      'Irrotational away from origin (curl = 0), but circulation = 2π around any loop enclosing the origin. The punctured plane is not simply connected.',
  },
  {
    name: 'shear',
    label: 'Shear (y, 0)',
    P: (_x, y) => y,
    Q: () => 0,
    isConservative: false,
    curl: () => -1,
    description: 'Horizontal shear. Non-conservative with constant curl = −1.',
  },
  {
    name: 'quadratic',
    label: 'Quadratic (2xy + y², x² + 2xy)',
    P: (x, y) => 2 * x * y + y * y,
    Q: (x, y) => x * x + 2 * x * y,
    isConservative: true,
    potential: (x, y) => x * x * y + x * y * y,
    curl: () => 0,
    description: 'Conservative with potential φ = x²y + xy². Used in Example 11.',
  },
];

// ── Filtered Subsets ────────────────────────────────────────

export const CONSERVATIVE_FIELD_PRESETS: VectorField2DPreset[] =
  VECTOR_FIELD_PRESETS.filter((p) => p.isConservative);

export const NON_CONSERVATIVE_FIELD_PRESETS: VectorField2DPreset[] =
  VECTOR_FIELD_PRESETS.filter((p) => !p.isConservative);

// ── Curve Presets ───────────────────────────────────────────

export const CURVE_PRESETS: CurvePreset[] = [
  {
    name: 'line-segment',
    label: 'Line segment (0,0)→(1,1)',
    r: (t) => [t, t],
    rPrime: () => [1, 1],
    domain: [0, 1],
    isClosed: false,
    description: 'Straight line from the origin to (1, 1).',
  },
  {
    name: 'semicircle',
    label: 'Semicircle (1,0)→(−1,0)',
    r: (t) => [Math.cos(t), Math.sin(t)],
    rPrime: (t) => [-Math.sin(t), Math.cos(t)],
    domain: [0, Math.PI],
    isClosed: false,
    description: 'Upper semicircle of radius 1 from (1, 0) to (−1, 0).',
  },
  {
    name: 'full-circle',
    label: 'Unit circle',
    r: (t) => [Math.cos(t), Math.sin(t)],
    rPrime: (t) => [-Math.sin(t), Math.cos(t)],
    domain: [0, 2 * Math.PI],
    isClosed: true,
    description: 'Unit circle traversed counterclockwise.',
  },
  {
    name: 'parabolic-arc',
    label: 'Parabola (0,0)→(1,1)',
    r: (t) => [t, t * t],
    rPrime: (t) => [1, 2 * t],
    domain: [0, 1],
    isClosed: false,
    description: 'Parabolic arc y = x² from (0, 0) to (1, 1).',
  },
  {
    name: 's-curve',
    label: 'S-curve (0,0)→(π,0)',
    r: (t) => [t, Math.sin(t)],
    rPrime: (t) => [1, Math.cos(t)],
    domain: [0, Math.PI],
    isClosed: false,
    description: 'One arch of a sine curve from (0, 0) to (π, 0).',
  },
  {
    name: 'ellipse',
    label: 'Ellipse (a=2, b=1)',
    r: (t) => [2 * Math.cos(t), Math.sin(t)],
    rPrime: (t) => [-2 * Math.sin(t), Math.cos(t)],
    domain: [0, 2 * Math.PI],
    isClosed: true,
    description: 'Ellipse with semi-axes a = 2, b = 1.',
  },
];

// ── Region Presets ──────────────────────────────────────────

export const REGION_PRESETS: RegionPreset[] = [
  {
    name: 'unit-disk',
    label: 'Unit disk',
    boundary: {
      name: 'unit-circle',
      label: 'Unit circle',
      r: (t) => [Math.cos(t), Math.sin(t)],
      rPrime: (t) => [-Math.sin(t), Math.cos(t)],
      domain: [0, 2 * Math.PI],
      isClosed: true,
      description: 'Unit circle, CCW.',
    },
    isSimplyConnected: true,
    description: 'Disk of radius 1 centered at the origin. Area = π.',
  },
  {
    name: 'rectangle',
    label: 'Unit square [0,1]×[0,1]',
    boundary: {
      name: 'square-boundary',
      label: 'Unit square boundary',
      r: (t) => {
        // Parameterize the square boundary CCW in [0, 4]:
        // [0,1]: bottom (0,0)→(1,0), [1,2]: right (1,0)→(1,1),
        // [2,3]: top (1,1)→(0,1), [3,4]: left (0,1)→(0,0)
        if (t <= 1) return [t, 0];
        if (t <= 2) return [1, t - 1];
        if (t <= 3) return [3 - t, 1];
        return [0, 4 - t];
      },
      rPrime: (t) => {
        if (t <= 1) return [1, 0];
        if (t <= 2) return [0, 1];
        if (t <= 3) return [-1, 0];
        return [0, -1];
      },
      domain: [0, 4],
      isClosed: true,
      description: 'Unit square boundary, CCW.',
    },
    isSimplyConnected: true,
    description: 'Unit square [0,1] × [0,1]. Area = 1.',
  },
  {
    name: 'triangle',
    label: 'Triangle (0,0)-(1,0)-(0,1)',
    boundary: {
      name: 'triangle-boundary',
      label: 'Triangle boundary',
      r: (t) => {
        // [0,1]: bottom (0,0)→(1,0), [1,2]: hypotenuse (1,0)→(0,1),
        // [2,3]: left (0,1)→(0,0)
        if (t <= 1) return [t, 0] as [number, number];
        if (t <= 2) return [2 - t, t - 1] as [number, number];
        return [0, 3 - t] as [number, number];
      },
      rPrime: (t) => {
        if (t <= 1) return [1, 0];
        if (t <= 2) return [-1, 1];
        return [0, -1];
      },
      domain: [0, 3],
      isClosed: true,
      description: 'Triangle boundary, CCW.',
    },
    isSimplyConnected: true,
    description: 'Right triangle with vertices (0,0), (1,0), (0,1). Area = 1/2.',
  },
  {
    name: 'large-disk',
    label: 'Disk (r=1.5)',
    boundary: {
      name: 'disk-r1.5-boundary',
      label: 'Circle (r=1.5)',
      r: (t) => [1.5 * Math.cos(t), 1.5 * Math.sin(t)],
      rPrime: (t) => [-1.5 * Math.sin(t), 1.5 * Math.cos(t)],
      domain: [0, 2 * Math.PI],
      isClosed: true,
      description: 'Boundary circle of the disk r ≤ 1.5, CCW.',
    },
    isSimplyConnected: true,
    description:
      'Disk of radius 1.5 centered at the origin. Area = 2.25π. Useful for demonstrating Green\'s theorem on a larger region (e.g., with the vortex field, note that the vortex singularity at the origin lies inside this disk).',
  },
];

// ── Potential Function Presets (for PotentialFunctionExplorer) ──

export interface PotentialPreset {
  name: string;
  label: string;
  /** Potential function φ(x, y) */
  f: (x: number, y: number) => number;
  /** Gradient field ∇φ = (∂φ/∂x, ∂φ/∂y) */
  grad: VectorField2DPreset;
}

export const POTENTIAL_PRESETS: PotentialPreset[] = [
  {
    name: 'paraboloid',
    label: 'φ = x² + y² (paraboloid)',
    f: (x, y) => x * x + y * y,
    grad: VECTOR_FIELD_PRESETS[1], // radial (x, y)
  },
  {
    name: 'saddle',
    label: 'φ = xy (saddle)',
    f: (x, y) => x * y,
    grad: {
      name: 'saddle-gradient',
      label: '∇(xy) = (y, x)',
      P: (_x, y) => y,
      Q: (x) => x,
      isConservative: true,
      potential: (x, y) => x * y,
      curl: () => 0,
      description: 'Gradient of the saddle surface φ = xy.',
    },
  },
  {
    name: 'wavy',
    label: 'φ = sin(x)cos(y)',
    f: (x, y) => Math.sin(x) * Math.cos(y),
    grad: {
      name: 'wavy-gradient',
      label: '∇(sin x cos y)',
      P: (x, y) => Math.cos(x) * Math.cos(y),
      Q: (x, y) => -Math.sin(x) * Math.sin(y),
      isConservative: true,
      potential: (x, y) => Math.sin(x) * Math.cos(y),
      curl: () => 0,
      description: 'Gradient of the wavy surface φ = sin(x)cos(y).',
    },
  },
  {
    name: 'logarithmic',
    label: 'φ = −ln(x² + y²)',
    f: (x, y) => {
      const r2 = x * x + y * y;
      return r2 < 1e-12 ? 0 : -Math.log(r2);
    },
    grad: {
      name: 'log-gradient',
      label: '∇(−ln(x²+y²))',
      P: (x, y) => {
        const r2 = x * x + y * y;
        return r2 < 1e-12 ? 0 : -2 * x / r2;
      },
      Q: (x, y) => {
        const r2 = x * x + y * y;
        return r2 < 1e-12 ? 0 : -2 * y / r2;
      },
      isConservative: true,
      potential: (x, y) => {
        const r2 = x * x + y * y;
        return r2 < 1e-12 ? 0 : -Math.log(r2);
      },
      curl: () => 0,
      description: 'Logarithmic well — attractive radial field.',
    },
  },
];
