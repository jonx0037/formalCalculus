/**
 * Data presets for the Surface Integrals & the Divergence Theorem topic.
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface SurfacePreset {
  name: string;
  label: string;
  /** Parameterization r(u, v) = [x, y, z] */
  r: (u: number, v: number) => [number, number, number];
  /** Tangent vector ∂r/∂u */
  r_u: (u: number, v: number) => [number, number, number];
  /** Tangent vector ∂r/∂v */
  r_v: (u: number, v: number) => [number, number, number];
  /** Parameter domain bounds */
  paramDomain: { u: [number, number]; v: [number, number] };
  /** Whether the surface is closed (encloses a volume) */
  isClosed: boolean;
  /** Optional boundary curve for Stokes' theorem (for open surfaces) */
  boundary?: {
    r: (t: number) => [number, number, number];
    rPrime: (t: number) => [number, number, number];
    domain: [number, number];
  };
  description: string;
}

export interface VectorField3DPreset {
  name: string;
  label: string;
  /** Vector field F(x, y, z) = [P, Q, R] */
  F: (x: number, y: number, z: number) => [number, number, number];
  /** Analytical divergence ∇ · F */
  divergence: (x: number, y: number, z: number) => number;
  /** Analytical curl ∇ × F */
  curl: (x: number, y: number, z: number) => [number, number, number];
  /** LaTeX for the divergence formula */
  divergenceFormula: string;
  /** LaTeX for the curl formula */
  curlFormula: string;
  description: string;
}

export interface VolumePreset {
  name: string;
  label: string;
  /** Closed boundary surface */
  boundary: SurfacePreset;
  /** Bounds for the volume integral (supports variable bounds) */
  bounds: {
    xRange: [number, number];
    yRange: [number, number] | ((x: number) => [number, number]);
    zRange: [number, number] | ((x: number, y: number) => [number, number]);
  };
  /** Exact volume of the region */
  exactVolume: number;
  description: string;
}

// ── Helper ──────────────────────────────────────────────────

/** Convert a VectorField3DPreset to the tuple form F(x,y,z) → [P, Q, R] */
export function asF3D(
  preset: VectorField3DPreset,
): (x: number, y: number, z: number) => [number, number, number] {
  return preset.F;
}

// ── Surface Presets ─────────────────────────────────────────

const sphere: SurfacePreset = {
  name: 'sphere',
  label: 'Sphere (R = 1)',
  r: (theta, phi) => [
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
  ],
  r_u: (theta, phi) => [
    -Math.sin(phi) * Math.sin(theta),
    Math.sin(phi) * Math.cos(theta),
    0,
  ],
  r_v: (theta, phi) => [
    Math.cos(phi) * Math.cos(theta),
    Math.cos(phi) * Math.sin(theta),
    -Math.sin(phi),
  ],
  paramDomain: { u: [0, 2 * Math.PI], v: [0, Math.PI] },
  isClosed: true,
  description: 'Unit sphere x² + y² + z² = 1, outward normal',
};

const hemisphere: SurfacePreset = {
  name: 'hemisphere',
  label: 'Upper hemisphere',
  r: (theta, phi) => [
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi),
  ],
  r_u: (theta, phi) => [
    -Math.sin(phi) * Math.sin(theta),
    Math.sin(phi) * Math.cos(theta),
    0,
  ],
  r_v: (theta, phi) => [
    Math.cos(phi) * Math.cos(theta),
    Math.cos(phi) * Math.sin(theta),
    -Math.sin(phi),
  ],
  paramDomain: { u: [0, 2 * Math.PI], v: [0, Math.PI / 2] },
  isClosed: false,
  boundary: {
    r: (t) => [Math.cos(t), Math.sin(t), 0],
    rPrime: (t) => [-Math.sin(t), Math.cos(t), 0],
    domain: [0, 2 * Math.PI],
  },
  description: 'Upper hemisphere z ≥ 0, boundary = unit circle in xy-plane',
};

const cylinder: SurfacePreset = {
  name: 'cylinder',
  label: 'Cylinder (R = 1, h = 1)',
  r: (theta, z) => [Math.cos(theta), Math.sin(theta), z],
  r_u: (theta) => [-Math.sin(theta), Math.cos(theta), 0],
  r_v: () => [0, 0, 1] as [number, number, number],
  paramDomain: { u: [0, 2 * Math.PI], v: [0, 1] },
  isClosed: false,
  description: 'Lateral surface of unit cylinder, 0 ≤ z ≤ 1',
};

const torus: SurfacePreset = {
  name: 'torus',
  label: 'Torus (R = 2, r = 0.6)',
  r: (theta, phi) => {
    const R = 2, rr = 0.6;
    return [
      (R + rr * Math.cos(phi)) * Math.cos(theta),
      (R + rr * Math.cos(phi)) * Math.sin(theta),
      rr * Math.sin(phi),
    ];
  },
  r_u: (theta, phi) => {
    const R = 2, rr = 0.6;
    return [
      -(R + rr * Math.cos(phi)) * Math.sin(theta),
      (R + rr * Math.cos(phi)) * Math.cos(theta),
      0,
    ];
  },
  r_v: (theta, phi) => {
    const rr = 0.6;
    return [
      -rr * Math.sin(phi) * Math.cos(theta),
      -rr * Math.sin(phi) * Math.sin(theta),
      rr * Math.cos(phi),
    ];
  },
  paramDomain: { u: [0, 2 * Math.PI], v: [0, 2 * Math.PI] },
  isClosed: true,
  description: 'Torus centered at origin, major radius 2, minor radius 0.6',
};

const paraboloidCap: SurfacePreset = {
  name: 'paraboloid-cap',
  label: 'Paraboloid cap',
  r: (u, v) => {
    const x = u * Math.cos(v);
    const y = u * Math.sin(v);
    return [x, y, 1 - u * u];
  },
  r_u: (u, v) => [Math.cos(v), Math.sin(v), -2 * u],
  r_v: (u, v) => [-u * Math.sin(v), u * Math.cos(v), 0],
  paramDomain: { u: [0, 1], v: [0, 2 * Math.PI] },
  isClosed: false,
  boundary: {
    r: (t) => [Math.cos(t), Math.sin(t), 0],
    rPrime: (t) => [-Math.sin(t), Math.cos(t), 0],
    domain: [0, 2 * Math.PI],
  },
  description: 'z = 1 − x² − y² for x² + y² ≤ 1, boundary = unit circle at z = 0',
};

const saddleGraph: SurfacePreset = {
  name: 'saddle-graph',
  label: 'Saddle z = x² − y²',
  r: (x, y) => [x, y, x * x - y * y],
  r_u: (x) => [1, 0, 2 * x],
  r_v: (_x, y) => [0, 1, -2 * y],
  paramDomain: { u: [-1, 1], v: [-1, 1] },
  isClosed: false,
  description: 'Hyperbolic paraboloid (saddle surface) over [−1,1]²',
};

export const surfacePresets: SurfacePreset[] = [
  sphere,
  hemisphere,
  cylinder,
  torus,
  paraboloidCap,
  saddleGraph,
];

export const openSurfacePresets: SurfacePreset[] = [hemisphere, paraboloidCap, saddleGraph];

export const closedSurfacePresets: SurfacePreset[] = [sphere, torus];

// ── Disk preset for Stokes' (reduces to Green's theorem) ────

const disk: SurfacePreset = {
  name: 'disk',
  label: 'Disk at z = 0',
  r: (u, v) => [u * Math.cos(v), u * Math.sin(v), 0],
  r_u: (_, v) => [Math.cos(v), Math.sin(v), 0],
  r_v: (u, v) => [-u * Math.sin(v), u * Math.cos(v), 0],
  paramDomain: { u: [0, 1], v: [0, 2 * Math.PI] },
  isClosed: false,
  boundary: {
    r: (t) => [Math.cos(t), Math.sin(t), 0],
    rPrime: (t) => [-Math.sin(t), Math.cos(t), 0],
    domain: [0, 2 * Math.PI],
  },
  description: 'Unit disk in the xy-plane (Stokes\' reduces to Green\'s theorem)',
};

const tiltedDisk: SurfacePreset = {
  name: 'tilted-disk',
  label: 'Tilted disk',
  r: (u, v) => {
    const x = u * Math.cos(v);
    const y = u * Math.sin(v);
    return [x, y, 0.5 * x];
  },
  r_u: (_, v) => [Math.cos(v), Math.sin(v), 0.5 * Math.cos(v)],
  r_v: (u, v) => [-u * Math.sin(v), u * Math.cos(v), -0.5 * u * Math.sin(v)],
  paramDomain: { u: [0, 1], v: [0, 2 * Math.PI] },
  isClosed: false,
  boundary: {
    r: (t) => [Math.cos(t), Math.sin(t), 0.5 * Math.cos(t)],
    rPrime: (t) => [-Math.sin(t), Math.cos(t), -0.5 * Math.sin(t)],
    domain: [0, 2 * Math.PI],
  },
  description: 'Disk tilted by z = x/2, boundary is an ellipse in 3D',
};

export const stokesSurfacePresets: SurfacePreset[] = [
  hemisphere,
  disk,
  tiltedDisk,
  paraboloidCap,
];

// ── Vector Field Presets ────────────────────────────────────

export const vectorField3DPresets: VectorField3DPreset[] = [
  {
    name: 'radial',
    label: 'Radial (x, y, z)',
    F: (x, y, z) => [x, y, z],
    divergence: () => 3,
    curl: () => [0, 0, 0],
    divergenceFormula: '\\nabla \\cdot \\mathbf{F} = 3',
    curlFormula: '\\nabla \\times \\mathbf{F} = \\mathbf{0}',
    description: 'Uniform expansion from origin. div = 3 everywhere, curl = 0.',
  },
  {
    name: 'vertical',
    label: 'Vertical (0, 0, 1)',
    F: () => [0, 0, 1] as [number, number, number],
    divergence: () => 0,
    curl: () => [0, 0, 0],
    divergenceFormula: '\\nabla \\cdot \\mathbf{F} = 0',
    curlFormula: '\\nabla \\times \\mathbf{F} = \\mathbf{0}',
    description: 'Uniform upward flow. Both div and curl are zero.',
  },
  {
    name: 'rotation',
    label: 'Rotation (−y, x, 0)',
    F: (_x, y, x2) => [-y, x2 === undefined ? 0 : _x, 0],
    divergence: () => 0,
    curl: () => [0, 0, 2],
    divergenceFormula: '\\nabla \\cdot \\mathbf{F} = 0',
    curlFormula: '\\nabla \\times \\mathbf{F} = (0, 0, 2)',
    description: 'Rigid rotation about z-axis. div = 0 (incompressible), curl = 2ẑ.',
  },
  {
    name: 'source',
    label: 'Source r/r³',
    F: (x, y, z) => {
      const r = Math.sqrt(x * x + y * y + z * z);
      if (r < 1e-8) return [0, 0, 0] as [number, number, number];
      const inv = 1 / (r * r * r);
      return [x * inv, y * inv, z * inv];
    },
    divergence: (x, y, z) => {
      const r = Math.sqrt(x * x + y * y + z * z);
      return r < 1e-8 ? Infinity : 0;
    },
    curl: () => [0, 0, 0],
    divergenceFormula: '\\nabla \\cdot \\mathbf{F} = 0 \\;(r \\neq 0)',
    curlFormula: '\\nabla \\times \\mathbf{F} = \\mathbf{0}',
    description: 'Inverse-square field. div = 0 away from origin (distributional source at 0).',
  },
  {
    name: 'uniform',
    label: 'Uniform (1, 0, 0)',
    F: () => [1, 0, 0] as [number, number, number],
    divergence: () => 0,
    curl: () => [0, 0, 0],
    divergenceFormula: '\\nabla \\cdot \\mathbf{F} = 0',
    curlFormula: '\\nabla \\times \\mathbf{F} = \\mathbf{0}',
    description: 'Uniform flow in x-direction. Both div and curl are zero.',
  },
  {
    name: 'quadratic',
    label: 'Quadratic (x², y², z²)',
    F: (x, y, z) => [x * x, y * y, z * z],
    divergence: (x, y, z) => 2 * x + 2 * y + 2 * z,
    curl: () => [0, 0, 0],
    divergenceFormula: '\\nabla \\cdot \\mathbf{F} = 2x + 2y + 2z',
    curlFormula: '\\nabla \\times \\mathbf{F} = \\mathbf{0}',
    description: 'Quadratic radial field. div = 2(x+y+z), curl = 0 (it is ∇(x³/3+y³/3+z³/3)).',
  },
];

// Fix rotation field — the closure captured wrong args
vectorField3DPresets[2] = {
  ...vectorField3DPresets[2],
  F: (x, y) => [-y, x, 0],
};

// ── Stokes-specific vector field presets ─────────────────────

export const stokesFieldPresets: VectorField3DPreset[] = [
  vectorField3DPresets[2], // rotation (-y, x, 0), curl = (0,0,2)
  {
    name: 'linear',
    label: 'Linear (y, z, x)',
    F: (_x, y, z) => [y, z, _x],
    divergence: () => 0,
    curl: () => [-1, -1, -1],
    divergenceFormula: '\\nabla \\cdot \\mathbf{F} = 0',
    curlFormula: '\\nabla \\times \\mathbf{F} = (-1, -1, -1)',
    description: 'Cyclic permutation field. div = 0, constant curl = (−1,−1,−1).',
  },
  {
    name: 'quadratic-curl',
    label: 'Quadratic (yz, xz, xy)',
    F: (x, y, z) => [y * z, x * z, x * y],
    divergence: () => 0,
    curl: (x, y, z) => [x - x, y - y, z - z],
    divergenceFormula: '\\nabla \\cdot \\mathbf{F} = 0',
    curlFormula: '\\nabla \\times \\mathbf{F} = \\mathbf{0}',
    description: 'This is ∇(xyz), so curl = 0. Stokes\' integral = 0 for any surface.',
  },
];

// ── Volume Presets ──────────────────────────────────────────

export const volumePresets: VolumePreset[] = [
  {
    name: 'cube',
    label: 'Unit cube [0,1]³',
    boundary: {
      ...sphere, // placeholder — cube boundary is computed differently
      name: 'cube-boundary',
      label: 'Cube boundary',
      isClosed: true,
      description: 'Six faces of the unit cube',
    },
    bounds: {
      xRange: [0, 1] as [number, number],
      yRange: [0, 1] as [number, number],
      zRange: [0, 1] as [number, number],
    },
    exactVolume: 1,
    description: 'Unit cube [0,1]³, volume = 1',
  },
  {
    name: 'sphere',
    label: 'Unit sphere',
    boundary: sphere,
    bounds: {
      xRange: [-1, 1] as [number, number],
      yRange: ((x: number) => {
        const b = Math.sqrt(Math.max(0, 1 - x * x));
        return [-b, b] as [number, number];
      }) as (x: number) => [number, number],
      zRange: ((x: number, y: number) => {
        const b = Math.sqrt(Math.max(0, 1 - x * x - y * y));
        return [-b, b] as [number, number];
      }) as (x: number, y: number) => [number, number],
    },
    exactVolume: (4 / 3) * Math.PI,
    description: 'Unit ball x² + y² + z² ≤ 1, volume = 4π/3',
  },
  {
    name: 'cylinder',
    label: 'Unit cylinder',
    boundary: cylinder,
    bounds: {
      xRange: [-1, 1] as [number, number],
      yRange: ((x: number) => {
        const b = Math.sqrt(Math.max(0, 1 - x * x));
        return [-b, b] as [number, number];
      }) as (x: number) => [number, number],
      zRange: [0, 1] as [number, number],
    },
    exactVolume: Math.PI,
    description: 'Cylinder x² + y² ≤ 1, 0 ≤ z ≤ 1, volume = π',
  },
  {
    name: 'cone',
    label: 'Cone',
    boundary: {
      ...sphere,
      name: 'cone-boundary',
      label: 'Cone boundary',
      isClosed: true,
      description: 'Cone surface + base disk',
    },
    bounds: {
      xRange: [-1, 1] as [number, number],
      yRange: ((x: number) => {
        const b = Math.sqrt(Math.max(0, 1 - x * x));
        return [-b, b] as [number, number];
      }) as (x: number) => [number, number],
      zRange: ((x: number, y: number) => {
        const r = Math.sqrt(x * x + y * y);
        return [r, 1] as [number, number];
      }) as (x: number, y: number) => [number, number],
    },
    exactVolume: Math.PI / 3,
    description: 'Cone z ≥ √(x²+y²), z ≤ 1, volume = π/3',
  },
];
