/**
 * Data presets for the Multiple Integrals & Fubini's Theorem topic.
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface DoubleIntegralPreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  /** Exact integral over the default domain (null if unknown in closed form) */
  exactIntegral: number | null;
  domain: { x: [number, number]; y: [number, number] };
  /** ML context note shown in the UI */
  mlNote?: string;
}

export interface FubiniPreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  domain: { x: [number, number]; y: [number, number] };
  /** Exact value of the double integral */
  exactIntegral: number;
}

export interface RegionPreset {
  name: string;
  label: string;
  /** Type I description: x in [a, b], g1(x) ≤ y ≤ g2(x) */
  typeI: {
    xRange: [number, number];
    g1: (x: number) => number;
    g2: (x: number) => number;
  };
  /** Type II description: y in [c, d], h1(y) ≤ x ≤ h2(y) */
  typeII: {
    yRange: [number, number];
    h1: (y: number) => number;
    h2: (y: number) => number;
  };
  /** Exact area of the region */
  area: number;
  /** Integration formula in the more natural order */
  preferredOrder: 'xy' | 'yx';
}

export interface MonteCarloPreset {
  name: string;
  label: string;
  f: (x: number, y: number) => number;
  domain: { x: [number, number]; y: [number, number] };
  /** Optional: only count points inside this region (rejection sampling) */
  inRegion?: (x: number, y: number) => boolean;
  /** Exact value of the integral */
  exactValue: number;
}

export interface DensityPreset {
  name: string;
  label: string;
  density: (x: number, y: number) => number;
  /** Named parameters for display (e.g., ρ, σ_x) */
  params?: Record<string, number>;
  domain: { x: [number, number]; y: [number, number] };
}

// ── Double Integral Presets ─────────────────────────────────

export const DOUBLE_INTEGRAL_PRESETS: DoubleIntegralPreset[] = [
  {
    name: 'x-plus-y',
    label: 'f(x,y) = x + y',
    f: (x, y) => x + y,
    exactIntegral: 1, // ∫₀¹∫₀¹(x+y)dydx = 1
    domain: { x: [0, 1], y: [0, 1] },
    mlNote: 'Linear model: ŷ = w₁x + w₂y',
  },
  {
    name: 'x2-plus-y2',
    label: 'f(x,y) = x² + y²',
    f: (x, y) => x * x + y * y,
    exactIntegral: 2 / 3, // ∫₀¹∫₀¹(x²+y²)dydx = 2/3
    domain: { x: [0, 1], y: [0, 1] },
    mlNote: 'Squared error loss surface',
  },
  {
    name: 'sin-product',
    label: 'f(x,y) = sin(πx)sin(πy)',
    f: (x, y) => Math.sin(Math.PI * x) * Math.sin(Math.PI * y),
    exactIntegral: 4 / (Math.PI * Math.PI), // (2/π)² = 4/π²
    domain: { x: [0, 1], y: [0, 1] },
    mlNote: 'Fourier basis function for 2D data',
  },
  {
    name: 'gaussian-bump',
    label: 'f(x,y) = e^{-(x²+y²)}',
    f: (x, y) => Math.exp(-(x * x + y * y)),
    // ∫₀¹ e^{-x²} dx = √π/2 · erf(1), so ∫∫ e^{-(x²+y²)} dA = (√π/2 · erf(1))²
    exactIntegral: Math.pow(Math.sqrt(Math.PI) / 2 * 0.8427007929497149, 2), // ≈ 0.5577
    domain: { x: [0, 1], y: [0, 1] },
    mlNote: 'Radial basis function kernel',
  },
  {
    name: 'xy',
    label: 'f(x,y) = xy',
    f: (x, y) => x * y,
    exactIntegral: 1 / 4, // ∫₀¹∫₀¹ xy dy dx = 1/4
    domain: { x: [0, 1], y: [0, 1] },
    mlNote: 'Interaction term in polynomial regression',
  },
];

// ── Fubini Presets ──────────────────────────────────────────

export const FUBINI_PRESETS: FubiniPreset[] = [
  {
    name: 'x-plus-y',
    label: 'f(x,y) = x + y',
    f: (x, y) => x + y,
    domain: { x: [0, 1], y: [0, 1] },
    exactIntegral: 1,
  },
  {
    name: 'x-sin-xy',
    label: 'f(x,y) = x sin(xy)',
    f: (x, y) => x * Math.sin(x * y),
    domain: { x: [0, Math.PI], y: [0, 1] },
    exactIntegral: Math.PI, // π
  },
  {
    name: 'x2y',
    label: 'f(x,y) = x²y',
    f: (x, y) => x * x * y,
    domain: { x: [0, 1], y: [0, 2] },
    exactIntegral: 2 / 3, // (1/3)(2²/2) = 2/3
  },
];

// ── Region Presets ──────────────────────────────────────────

export const REGION_PRESETS: RegionPreset[] = [
  {
    name: 'triangle',
    label: 'Triangle: 0 ≤ y ≤ x, 0 ≤ x ≤ 1',
    typeI: {
      xRange: [0, 1],
      g1: (_x) => 0,
      g2: (x) => x,
    },
    typeII: {
      yRange: [0, 1],
      h1: (y) => y,   // at height y, x ranges from y to 1
      h2: (_y) => 1,
    },
    area: 0.5,
    preferredOrder: 'xy',
  },
  {
    name: 'disk',
    label: 'Disk: x² + y² ≤ 1',
    typeI: {
      xRange: [-1, 1],
      g1: (x) => -Math.sqrt(Math.max(0, 1 - x * x)),
      g2: (x) => Math.sqrt(Math.max(0, 1 - x * x)),
    },
    typeII: {
      yRange: [-1, 1],
      h1: (y) => -Math.sqrt(Math.max(0, 1 - y * y)),
      h2: (y) => Math.sqrt(Math.max(0, 1 - y * y)),
    },
    area: Math.PI,
    preferredOrder: 'xy',
  },
  {
    name: 'parabolic',
    label: 'Between y = x² and y = x',
    typeI: {
      xRange: [0, 1],
      g1: (x) => x * x,
      g2: (x) => x,
    },
    typeII: {
      yRange: [0, 1],
      h1: (y) => y, // x = y (lower curve in Type II)
      h2: (y) => Math.sqrt(y), // x = √y (upper curve)
    },
    area: 1 / 6,
    preferredOrder: 'xy',
  },
  {
    name: 'semicircle',
    label: 'Upper semicircle: y ≥ 0, x² + y² ≤ 1',
    typeI: {
      xRange: [-1, 1],
      g1: (_x) => 0,
      g2: (x) => Math.sqrt(Math.max(0, 1 - x * x)),
    },
    typeII: {
      yRange: [0, 1],
      h1: (y) => -Math.sqrt(Math.max(0, 1 - y * y)),
      h2: (y) => Math.sqrt(Math.max(0, 1 - y * y)),
    },
    area: Math.PI / 2,
    preferredOrder: 'xy',
  },
];

// ── Monte Carlo Presets ─────────────────────────────────────

export const MONTE_CARLO_PRESETS: MonteCarloPreset[] = [
  {
    name: 'pi-estimation',
    label: 'Estimate π (unit disk)',
    f: (_x, _y) => 1,
    domain: { x: [-1, 1], y: [-1, 1] },
    inRegion: (x, y) => x * x + y * y <= 1,
    exactValue: Math.PI,
  },
  {
    name: 'x2-plus-y2',
    label: '∫∫(x²+y²) over [0,1]²',
    f: (x, y) => x * x + y * y,
    domain: { x: [0, 1], y: [0, 1] },
    exactValue: 2 / 3,
  },
  {
    name: 'gaussian-disk',
    label: '∫∫ e^{-(x²+y²)} over unit disk',
    f: (x, y) => Math.exp(-(x * x + y * y)),
    domain: { x: [-1, 1], y: [-1, 1] },
    inRegion: (x, y) => x * x + y * y <= 1,
    exactValue: Math.PI * (1 - Math.exp(-1)), // π(1 - e⁻¹)
  },
];

// ── Density Presets ─────────────────────────────────────────

export const DENSITY_PRESETS: DensityPreset[] = [
  {
    name: 'standard-normal',
    label: 'Standard Bivariate Normal (ρ = 0)',
    density: (x, y) => {
      return Math.exp(-(x * x + y * y) / 2) / (2 * Math.PI);
    },
    params: { muX: 0, muY: 0, sigmaX: 1, sigmaY: 1, rho: 0 },
    domain: { x: [-3, 3], y: [-3, 3] },
  },
  {
    name: 'correlated',
    label: 'Correlated Normal (ρ = 0.7)',
    density: (x, y) => {
      const rho = 0.7;
      const denom = 1 - rho * rho;
      const Q = (x * x - 2 * rho * x * y + y * y) / denom;
      return Math.exp(-Q / 2) / (2 * Math.PI * Math.sqrt(denom));
    },
    params: { muX: 0, muY: 0, sigmaX: 1, sigmaY: 1, rho: 0.7 },
    domain: { x: [-3, 3], y: [-3, 3] },
  },
  {
    name: 'mixture',
    label: 'Mixture of Two Gaussians',
    density: (x, y) => {
      const g1 = Math.exp(-((x - 1) * (x - 1) + y * y) / (2 * 0.5 * 0.5)) /
        (2 * Math.PI * 0.5 * 0.5);
      const g2 = Math.exp(-((x + 1) * (x + 1) + y * y) / (2 * 0.7 * 0.7)) /
        (2 * Math.PI * 0.7 * 0.7);
      return 0.5 * g1 + 0.5 * g2;
    },
    params: { mu1X: 1, mu2X: -1, sigma1: 0.5, sigma2: 0.7, weight: 0.5 },
    domain: { x: [-3, 3], y: [-3, 3] },
  },
];
