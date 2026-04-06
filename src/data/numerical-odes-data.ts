/**
 * Data presets for the Numerical Methods for ODEs topic (Topic 24).
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides typed presets for:
 *  - Method comparison: 5 scalar IVPs with known exact solutions
 *  - Stability regions: 4 numerical methods (forward Euler, RK4, implicit Euler, trapezoidal)
 *  - Stiff systems: 3 systems with widely separated time scales
 *  - Neural ODE flows: 3 vector fields for the spiral-classification demo
 */

// ── Interfaces ─────────────────────────────────────────────

export interface MethodComparisonPreset {
  name: string;
  /** Human-readable label */
  label: string;
  /** Right-hand side f(t, y) of the scalar IVP */
  f: (t: number, y: number) => number;
  /** Closed-form solution for error computation */
  exactSolution: (t: number) => number;
  /** Initial time */
  t0: number;
  /** Initial value */
  y0: number;
  /** Final time */
  tEnd: number;
  /** Default step size for the slider's mid-position */
  defaultH: number;
  /** Plot domain */
  domain: { t: [number, number]; y: [number, number] };
  /** Whether explicit Euler will visibly diverge at the default step size */
  expectsBlowUp: boolean;
  description: string;
}

export interface StabilityRegionPreset {
  name: string;
  label: string;
  method: 'forward-euler' | 'rk4' | 'implicit-euler' | 'trapezoidal';
  /** Stability function R(z) modulus: returns |R(z)| for complex z = re + i·im */
  stabilityModulus: (re: number, im: number) => number;
  /** True if the method is A-stable (stable for all Re(z) ≤ 0) */
  isAStable: boolean;
  description: string;
}

export interface StiffSystemPreset {
  name: string;
  label: string;
  /** System RHS: (y1, y2) => [dy1/dt, dy2/dt] */
  f: (y1: number, y2: number) => [number, number];
  /** Analytical Jacobian for Newton iteration in implicit methods */
  jacobian: (y1: number, y2: number) => [[number, number], [number, number]];
  /** Initial condition */
  y0: [number, number];
  /** Integration interval */
  tRange: [number, number];
  /** Approximate stiffness ratio (|λ_max|/|λ_min| of the Jacobian) */
  stiffnessRatio: number;
  /** Display range for solution curves */
  yDisplayRange: [number, number];
  description: string;
}

export interface NeuralODEPreset {
  name: string;
  label: string;
  /** Continuous-time vector field: (x, y, t) => (dx/dt, dy/dt) */
  vectorField: (x: number, y: number, t: number) => [number, number];
  /** Sample points to flow through the field */
  samplePoints: Array<[number, number]>;
  /** Class labels (0 or 1) for two-class classification problems */
  sampleLabels: number[];
  /** Time interval to integrate over */
  tRange: [number, number];
  /** Plot domain */
  domain: { x: [number, number]; y: [number, number] };
  description: string;
}

// ── Method comparison presets ──────────────────────────────

/**
 * Five scalar IVPs spanning the full range of numerical-method behavior:
 * smooth exponential, sigmoidal logistic, oscillatory, stiff, and finite-time blow-up.
 * Each has a closed-form exact solution so global errors can be computed.
 */
export function getMethodComparisonPresets(): MethodComparisonPreset[] {
  return [
    {
      name: 'exponential-decay',
      label: "Exponential decay: y' = -y",
      f: (_t, y) => -y,
      exactSolution: (t) => Math.exp(-t),
      t0: 0,
      y0: 1,
      tEnd: 5,
      defaultH: 0.2,
      domain: { t: [0, 5], y: [-0.1, 1.1] },
      expectsBlowUp: false,
      description:
        'The simplest test problem. Smooth, well-conditioned, with eigenvalue λ = -1 well inside every method\'s stability region. All methods converge cleanly.',
    },
    {
      name: 'logistic-growth',
      label: "Logistic growth: y' = y(1-y)",
      f: (_t, y) => y * (1 - y),
      // General closed-form solution of y' = y(1-y) with y(0) = y0:
      //   y(t) = 1 / (1 + C·e^{-t}) where C = (1 - y0) / y0.
      // For y0 = 0.05, C = 0.95 / 0.05 = 19.
      exactSolution: (t) => 1 / (1 + 19 * Math.exp(-t)),
      t0: 0,
      y0: 0.05,
      tEnd: 8,
      defaultH: 0.4,
      domain: { t: [0, 8], y: [0, 1.1] },
      expectsBlowUp: false,
      description:
        'Sigmoidal growth saturating at the carrying capacity y = 1. Mildly nonlinear. Tests how methods handle a transition between near-zero and near-saturation regimes.',
    },
    {
      name: 'harmonic-oscillator',
      label: "Damped sinusoid: y' = -y + sin(t)",
      // Linear non-autonomous; exact solution is the steady-state solution.
      // y(t) = (1/2)(sin t - cos t) + C·e^{-t}, with C chosen so y(0) = 0.
      f: (t, y) => -y + Math.sin(t),
      exactSolution: (t) =>
        0.5 * (Math.sin(t) - Math.cos(t)) + 0.5 * Math.exp(-t),
      t0: 0,
      y0: 0,
      tEnd: 10,
      defaultH: 0.3,
      domain: { t: [0, 10], y: [-1, 1] },
      expectsBlowUp: false,
      description:
        'Forced linear ODE with a damped transient and a sinusoidal steady state. Good for visualizing phase error in lower-order methods.',
    },
    {
      name: 'stiff-linear',
      label: "Stiff linear: y' = -50y",
      f: (_t, y) => -50 * y,
      exactSolution: (t) => Math.exp(-50 * t),
      t0: 0,
      y0: 1,
      tEnd: 1,
      defaultH: 0.05,
      domain: { t: [0, 1], y: [-1.5, 1.5] },
      expectsBlowUp: true,
      description:
        'A mildly stiff equation: λ = -50, so forward Euler needs h < 2/50 = 0.04 for stability. At larger step sizes, Euler oscillates and blows up while RK4 and RK45 stay stable.',
    },
    {
      name: 'finite-time-blowup',
      label: "Finite-time blow-up: y' = y²",
      f: (_t, y) => y * y,
      // y(t) = y0 / (1 - y0·t), blows up at t = 1/y0
      exactSolution: (t) => 1 / (1 - t),
      t0: 0,
      y0: 1,
      tEnd: 0.95, // stop before t = 1
      defaultH: 0.05,
      domain: { t: [0, 0.95], y: [0, 25] },
      expectsBlowUp: false,
      description:
        'The solution diverges at t = 1. Adaptive methods automatically shrink their step size as the solution grows, while fixed-step methods either underestimate or overshoot the singularity.',
    },
  ];
}

// ── Stability region presets ───────────────────────────────

/**
 * Four classical stability functions R(z) = y_{n+1}/y_n applied to the test
 * equation y' = λy, evaluated at z = hλ. The stability region is {z : |R(z)| ≤ 1}.
 *
 * Forward Euler:    R(z) = 1 + z              (small unit disk centered at -1)
 * RK4:              R(z) = 1 + z + z²/2 + z³/6 + z⁴/24  (four-lobed region)
 * Implicit Euler:   R(z) = 1 / (1 - z)        (entire half-plane Re(z) ≤ 0)
 * Trapezoidal:      R(z) = (1 + z/2)/(1 - z/2)  (entire half-plane Re(z) ≤ 0)
 */
export function getStabilityRegionPresets(): StabilityRegionPreset[] {
  return [
    {
      name: 'forward-euler',
      label: 'Forward Euler',
      method: 'forward-euler',
      stabilityModulus: (re, im) => {
        // |1 + z| where z = re + i·im
        const x = 1 + re;
        const y = im;
        return Math.sqrt(x * x + y * y);
      },
      isAStable: false,
      description:
        'Stability region is the unit disk |1 + z| ≤ 1 — a circle of radius 1 centered at z = -1. Conditional stability: requires h·|λ| ≤ 2 for stable equations.',
    },
    {
      name: 'rk4',
      label: 'Classical RK4',
      method: 'rk4',
      stabilityModulus: (re, im) => {
        // R(z) = 1 + z + z²/2 + z³/6 + z⁴/24, complex arithmetic
        // Compute z, z², z³, z⁴ via repeated complex multiplication
        let zr = 1.0, zi = 0.0; // z⁰ = 1
        let sumR = 1.0, sumI = 0.0; // running sum
        const factorials = [1, 1, 2, 6, 24];
        for (let k = 1; k <= 4; k++) {
          // (zr + i zi) * (re + i im) = (zr·re - zi·im) + i (zr·im + zi·re)
          const newR = zr * re - zi * im;
          const newI = zr * im + zi * re;
          zr = newR;
          zi = newI;
          sumR += zr / factorials[k];
          sumI += zi / factorials[k];
        }
        return Math.sqrt(sumR * sumR + sumI * sumI);
      },
      isAStable: false,
      description:
        'Stability region |1 + z + z²/2 + z³/6 + z⁴/24| ≤ 1 is a four-lobed region containing roughly z = -2.78 on the real axis. Larger than forward Euler but still bounded.',
    },
    {
      name: 'implicit-euler',
      label: 'Implicit (Backward) Euler',
      method: 'implicit-euler',
      stabilityModulus: (re, im) => {
        // |1 / (1 - z)| = 1 / |1 - z|
        const x = 1 - re;
        const y = -im;
        const denom = Math.sqrt(x * x + y * y);
        return denom > 1e-14 ? 1 / denom : Infinity;
      },
      isAStable: true,
      description:
        'Stability region |1 - z| ≥ 1 is the exterior of the unit disk centered at z = +1. Contains the entire left half-plane — A-stable. The price: each step requires solving an implicit equation.',
    },
    {
      name: 'trapezoidal',
      label: 'Trapezoidal Rule',
      method: 'trapezoidal',
      stabilityModulus: (re, im) => {
        // |(1 + z/2) / (1 - z/2)|
        const numR = 1 + re / 2;
        const numI = im / 2;
        const denR = 1 - re / 2;
        const denI = -im / 2;
        const numMag = Math.sqrt(numR * numR + numI * numI);
        const denMag = Math.sqrt(denR * denR + denI * denI);
        return denMag > 1e-14 ? numMag / denMag : Infinity;
      },
      isAStable: true,
      description:
        'Stability region is exactly the closed left half-plane {Re(z) ≤ 0}. A-stable AND second-order accurate — the best of both worlds. The "Crank-Nicolson" method in PDE language.',
    },
  ];
}

// ── Stiff system presets ───────────────────────────────────

/**
 * Three stiff systems with widely separated time scales.
 * The stiffness ratio = |λ_max|/|λ_min| of the Jacobian.
 */
export function getStiffSystemPresets(): StiffSystemPreset[] {
  return [
    {
      name: 'linear-stiff',
      label: "Linear stiff: λ₁ = -1, λ₂ = -1000",
      f: (y1, y2) => [-y1, -1000 * y2],
      jacobian: (_y1, _y2) => [
        [-1, 0],
        [0, -1000],
      ],
      y0: [1, 1],
      tRange: [0, 2],
      stiffnessRatio: 1000,
      yDisplayRange: [-0.5, 1.5],
      description:
        'Diagonal linear system. The fast component y₂ decays in t ≈ 0.001 but forces explicit methods to use h < 0.002 for stability. The slow component y₁ evolves on a time scale 1000× longer.',
    },
    {
      name: 'van-der-pol-stiff',
      label: 'Van der Pol oscillator (μ = 25)',
      f: (y1, y2) => [y2, 25 * (1 - y1 * y1) * y2 - y1],
      jacobian: (y1, y2) => [
        [0, 1],
        [-2 * 25 * y1 * y2 - 1, 25 * (1 - y1 * y1)],
      ],
      y0: [2, 0],
      tRange: [0, 50],
      stiffnessRatio: 50, // approximate; varies along the trajectory
      yDisplayRange: [-3, 3],
      description:
        'Self-sustained oscillator with relaxation dynamics. Spends most of its period in slow regimes punctuated by fast transitions — a textbook stiff oscillator.',
    },
    {
      name: 'robertson-reduced',
      label: 'Robertson kinetics (2-component reduction)',
      // Reduced 2D version of the 3D Robertson chemical kinetics system
      // y1 = A, y2 = B; y1 + y2 + C = 1 (mass conservation eliminated)
      f: (y1, y2) => [
        -0.04 * y1 + 1e4 * y2 * (1 - y1 - y2),
        0.04 * y1 - 1e4 * y2 * (1 - y1 - y2) - 3e7 * y2 * y2,
      ],
      jacobian: (y1, y2) => {
        const C = 1 - y1 - y2;
        return [
          [-0.04 - 1e4 * y2, 1e4 * (C - y2)],
          [0.04 + 1e4 * y2, -1e4 * (C - y2) - 6e7 * y2],
        ];
      },
      y0: [1, 0],
      tRange: [0, 0.3],
      stiffnessRatio: 1e7,
      yDisplayRange: [-0.1, 1.1],
      description:
        'A reduced version of the classical Robertson chemical kinetics benchmark. Three rate constants spanning seven orders of magnitude (0.04, 10⁴, 3×10⁷) make this the canonical stiff test problem.',
    },
  ];
}

// ── Neural ODE presets ─────────────────────────────────────

/**
 * Three analytical vector fields that mimic the behavior of trained neural ODEs:
 * a "spiral untangling" field for two-class classification, a planar normalizing
 * flow, and a simple ResNet-comparable rotation field.
 *
 * These are NOT trained networks — they're closed-form vector fields with
 * hand-tuned parameters that produce visually compelling demos in the browser.
 */
export function getNeuralODEPresets(): NeuralODEPreset[] {
  // Helper: spiral classification — two interleaved spirals get untangled by
  // a rotational vector field with a radial gain. Points starting on opposite
  // spirals end up in different half-planes after the flow.
  const spiralPoints: Array<[number, number]> = [];
  const spiralLabels: number[] = [];
  const N_PER_CLASS = 30;
  for (let i = 0; i < N_PER_CLASS; i++) {
    const t = (i / N_PER_CLASS) * 4 * Math.PI;
    const r = 0.1 + 0.15 * t / Math.PI;
    // Class 0: starts at angle t
    spiralPoints.push([r * Math.cos(t), r * Math.sin(t)]);
    spiralLabels.push(0);
    // Class 1: starts at angle t + π
    spiralPoints.push([r * Math.cos(t + Math.PI), r * Math.sin(t + Math.PI)]);
    spiralLabels.push(1);
  }

  // Grid sample for the planar-flow demo
  const gridPoints: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      gridPoints.push([-1.5 + (3 * i) / 7, -1.5 + (3 * j) / 7]);
    }
  }

  return [
    {
      name: 'spiral-classification',
      label: 'Spiral classification (canonical Neural ODE demo)',
      vectorField: (x, y, _t) => {
        // Smooth radial gain: stronger rotation closer to the origin
        const r = Math.sqrt(x * x + y * y);
        const gain = 1.5 * Math.exp(-r * r / 2);
        // Pure rotation modulated by gain — untangles concentric spirals
        return [-gain * y, gain * x];
      },
      samplePoints: spiralPoints,
      sampleLabels: spiralLabels,
      tRange: [0, 3],
      domain: { x: [-2, 2], y: [-2, 2] },
      description:
        'Two interleaved spirals representing two classes. The learned vector field rotates them at different rates depending on radius, untangling them into linearly separable half-planes by t = T. This is the canonical demo from Chen et al. 2018.',
    },
    {
      name: 'planar-flow',
      label: 'Planar normalizing flow',
      vectorField: (x, y, _t) => {
        // A "shearing" flow that bends a uniform grid into a curved one,
        // analogous to how normalizing flows transform a base distribution
        const u = Math.tanh(x + 0.5 * y);
        return [0.6 * u, 0.4 * (1 - u * u)];
      },
      samplePoints: gridPoints,
      sampleLabels: gridPoints.map(() => 0),
      tRange: [0, 2.5],
      domain: { x: [-2, 2], y: [-2, 2] },
      description:
        'A continuous normalizing flow: a uniform grid of points gets warped by an invertible vector field. The change-of-variables formula tracks how the probability density transforms — the same idea behind RealNVP and FFJORD.',
    },
    {
      name: 'resnet-comparison',
      label: 'ResNet vs. Neural ODE',
      vectorField: (x, y, t) => {
        // Time-varying rotation: a "depth-dependent" ResNet block
        const omega = 1 + 0.3 * Math.sin(t);
        return [-omega * y, omega * x];
      },
      samplePoints: [
        [1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7],
        [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7],
      ],
      sampleLabels: [0, 0, 0, 0, 1, 1, 1, 1],
      tRange: [0, Math.PI],
      domain: { x: [-1.5, 1.5], y: [-1.5, 1.5] },
      description:
        'A continuous-depth analog of a stack of ResNet blocks. Each "layer" is an Euler step of the flow; the trained ResNet weights become a discretized vector field. Adaptive solvers can take fewer effective steps than the ResNet has layers.',
    },
  ];
}
