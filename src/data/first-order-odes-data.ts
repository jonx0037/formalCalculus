/**
 * Data presets for the First-Order ODEs & Existence Theorems topic.
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides typed presets for:
 *  - General ODE direction field exploration (6 presets)
 *  - Linear first-order equations with integrating factors (4 presets)
 *  - Picard iteration with precomputed iterates (4 presets)
 *  - Exact equations with potential functions (3 presets)
 */

// ── Interfaces ─────────────────────────────────────────────

export interface ODEPreset {
  name: string;
  /** LaTeX-renderable label */
  label: string;
  /** The right-hand side f(t, y) */
  f: (t: number, y: number) => number;
  /** Viewing window */
  domain: { t: [number, number]; y: [number, number] };
  /** Exact solution if known: y(t) given initial condition (t0, y0) */
  exactSolution?: (t: number, y0: number, t0: number) => number;
  isLinear: boolean;
  isSeparable: boolean;
  /** f depends only on y, not t */
  isAutonomous: boolean;
  /** L such that |f(t,y₁) − f(t,y₂)| ≤ L|y₁ − y₂| */
  lipschitzConstant?: number;
  /** Values y* where f(t, y*) = 0 for all t (autonomous only) */
  equilibria: number[];
  /** Finite-time blow-up time if applicable */
  blowUpTime?: (y0: number, t0: number) => number | undefined;
  tags: string[];
}

export interface LinearODEPreset {
  name: string;
  label: string;
  /** Coefficient in y' + p(t)y = q(t) */
  p: (t: number) => number;
  /** Forcing term */
  q: (t: number) => number;
  /** Integrating factor μ(t) = exp(∫₀ᵗ p(s)ds) */
  mu: (t: number) => number;
  /** General solution y(t) given initial condition y(t0) = y0 */
  generalSolution: (t: number, y0: number, t0: number) => number;
  domain: { t: [number, number]; y: [number, number] };
}

export interface PicardPreset {
  name: string;
  label: string;
  /** Right-hand side f(t, y) */
  f: (t: number, y: number) => number;
  t0: number;
  y0: number;
  /** Exact solution y(t) */
  exactSolution: (t: number) => number;
  /**
   * Precomputed Picard iterates as functions of t.
   * iterates[0] = y_0(t), iterates[1] = y_1(t), etc.
   * Contains only the available closed-form iterates; if higher iterates
   * are not stored in closed form, callers should rely on maxN and/or a
   * numerical fallback rather than expecting undefined entries.
   */
  iterates: Array<(t: number) => number>;
  /** Maximum number of precomputed iterates */
  maxN: number;
}

export interface ExactEquationPreset {
  name: string;
  label: string;
  /** M(t, y) in M dt + N dy = 0 */
  M: (t: number, y: number) => number;
  /** N(t, y) */
  N: (t: number, y: number) => number;
  /** Potential function Ψ(t, y) such that Ψ_t = M, Ψ_y = N */
  psi: (t: number, y: number) => number;
  /** Whether M_y = N_t (exact) */
  isExact: boolean;
}

// ── General ODE presets ────────────────────────────────────

export function getODEPresets(): ODEPreset[] {
  return [
    {
      name: 'exponential',
      label: "y' = y",
      f: (_t, y) => y,
      domain: { t: [-2, 3], y: [-3, 3] },
      exactSolution: (t, y0, t0) => y0 * Math.exp(t - t0),
      isLinear: true,
      isSeparable: true,
      isAutonomous: true,
      lipschitzConstant: 1,
      equilibria: [0],
      tags: ['linear', 'separable', 'autonomous', 'exponential'],
    },
    {
      name: 'logistic',
      label: "y' = y(1 - y)",
      f: (_t, y) => y * (1 - y),
      domain: { t: [-1, 6], y: [-0.5, 2] },
      exactSolution: (t, y0, t0) => {
        if (y0 === 0) return 0;
        if (y0 === 1) return 1;
        const C = (1 / y0 - 1) * Math.exp(t0);
        return 1 / (1 + C * Math.exp(-(t)));
      },
      isLinear: false,
      isSeparable: true,
      isAutonomous: true,
      equilibria: [0, 1],
      tags: ['separable', 'autonomous', 'logistic', 'sigmoid'],
    },
    {
      name: 'sinusoidal',
      label: "y' = sin(t) - y",
      f: (t, y) => Math.sin(t) - y,
      domain: { t: [-1, 10], y: [-2, 2] },
      exactSolution: (t, y0, t0) => {
        // y' + y = sin(t) → particular: (sin(t) - cos(t))/2
        const yp = (Math.sin(t) - Math.cos(t)) / 2;
        const yp0 = (Math.sin(t0) - Math.cos(t0)) / 2;
        const C = y0 - yp0;
        return yp + C * Math.exp(-(t - t0));
      },
      isLinear: true,
      isSeparable: false,
      isAutonomous: false,
      lipschitzConstant: 1,
      equilibria: [],
      tags: ['linear', 'oscillatory', 'forcing'],
    },
    {
      name: 'riccati',
      label: "y' = t - y²",
      f: (t, y) => t - y * y,
      domain: { t: [-2, 4], y: [-3, 3] },
      isLinear: false,
      isSeparable: false,
      isAutonomous: false,
      equilibria: [],
      tags: ['nonlinear', 'riccati'],
    },
    {
      name: 'blowup',
      label: "y' = y²",
      f: (_t, y) => y * y,
      domain: { t: [-1, 2], y: [-3, 6] },
      exactSolution: (t, y0, t0) => {
        if (y0 === 0) return 0;
        return 1 / (1 / y0 - (t - t0));
      },
      isLinear: false,
      isSeparable: true,
      isAutonomous: true,
      equilibria: [0],
      blowUpTime: (y0, t0) => (y0 > 0 ? t0 + 1 / y0 : undefined),
      tags: ['separable', 'autonomous', 'blow-up', 'nonlinear'],
    },
    {
      name: 'nonLipschitz',
      label: "y' = y^{2/3}",
      f: (_t, y) => Math.sign(y) * Math.pow(Math.abs(y), 2 / 3),
      domain: { t: [-1, 4], y: [-1, 3] },
      isLinear: false,
      isSeparable: true,
      isAutonomous: true,
      equilibria: [0],
      tags: ['separable', 'autonomous', 'non-lipschitz', 'uniqueness-failure'],
    },
  ];
}

// ── Linear ODE presets (integrating factor) ────────────────

export function getLinearODEPresets(): LinearODEPreset[] {
  return [
    {
      name: 'decay-forcing',
      label: "y' + 2y = e^{-t}",
      p: () => 2,
      q: (t) => Math.exp(-t),
      mu: (t) => Math.exp(2 * t),
      generalSolution: (t, y0, t0) => {
        // y(t) = e^{-t} + (y0 - e^{-t0}) * e^{-2(t-t0)}
        const yp0 = Math.exp(-t0);
        return Math.exp(-t) + (y0 - yp0) * Math.exp(-2 * (t - t0));
      },
      domain: { t: [-0.5, 4], y: [-1, 4] },
    },
    {
      name: 'variable-coeff',
      label: "y' + y/t = t²  (t > 0)",
      p: (t) => (t > 0 ? 1 / t : 0),
      q: (t) => t * t,
      mu: (t) => (t > 0 ? t : 1),
      generalSolution: (t, y0, t0) => {
        // μ = t → (ty)' = t³ → ty = t⁴/4 + C → y = t³/4 + C/t
        const C = t0 * y0 - (t0 * t0 * t0 * t0) / 4;
        return t > 0 ? (t * t * t) / 4 + C / t : y0;
      },
      domain: { t: [0.2, 4], y: [-2, 8] },
    },
    {
      name: 'sinusoidal-coeff',
      label: "y' - y = sin(t)",
      p: () => -1,
      q: (t) => Math.sin(t),
      mu: (t) => Math.exp(-t),
      generalSolution: (t, y0, t0) => {
        // y' - y = sin(t): particular = -(sin(t) + cos(t))/2
        const yp = -(Math.sin(t) + Math.cos(t)) / 2;
        const yp0 = -(Math.sin(t0) + Math.cos(t0)) / 2;
        return yp + (y0 - yp0) * Math.exp(t - t0);
      },
      domain: { t: [-1, 4], y: [-4, 4] },
    },
    {
      name: 'cos-coeff',
      label: "y' + cos(t)·y = cos(t)",
      p: (t) => Math.cos(t),
      q: (t) => Math.cos(t),
      mu: (t) => Math.exp(Math.sin(t)),
      generalSolution: (t, y0, t0) => {
        // μ = e^{sin t} → (μy)' = μ cos t = d/dt[e^{sin t}]
        // → μ(t)y(t) = e^{sin t} + C → y(t) = 1 + C e^{-sin t}
        const C = (y0 - 1) * Math.exp(Math.sin(t0));
        return 1 + C * Math.exp(-Math.sin(t));
      },
      domain: { t: [-1, 8], y: [-2, 4] },
    },
  ];
}

// ── Picard iteration presets ───────────────────────────────

/**
 * Factorial for Taylor series of Picard iterates.
 */
function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function getPicardPresets(): PicardPreset[] {
  return [
    {
      name: 'exponential',
      label: "y' = y,  y(0) = 1",
      f: (_t, y) => y,
      t0: 0,
      y0: 1,
      exactSolution: (t) => Math.exp(t),
      // Picard iterates are partial sums of e^t = Σ t^k / k!
      iterates: Array.from({ length: 9 }, (_, n) => {
        return (t: number) => {
          let sum = 0;
          for (let k = 0; k <= n; k++) {
            sum += Math.pow(t, k) / factorial(k);
          }
          return sum;
        };
      }),
      maxN: 8,
    },
    {
      name: 'neg-exponential',
      label: "y' = -y,  y(0) = 1",
      f: (_t, y) => -y,
      t0: 0,
      y0: 1,
      exactSolution: (t) => Math.exp(-t),
      // Picard iterates are partial sums of e^{-t} = Σ (-t)^k / k!
      iterates: Array.from({ length: 9 }, (_, n) => {
        return (t: number) => {
          let sum = 0;
          for (let k = 0; k <= n; k++) {
            sum += Math.pow(-t, k) / factorial(k);
          }
          return sum;
        };
      }),
      maxN: 8,
    },
    {
      name: 'linear-forcing',
      label: "y' = t + y,  y(0) = 0",
      f: (t, y) => t + y,
      t0: 0,
      y0: 0,
      exactSolution: (t) => -1 - t + Math.exp(t),
      // Picard iterates grow in complexity; first few are closed-form
      iterates: [
        () => 0, // y_0 = 0
        (t: number) => t * t / 2, // y_1 = t²/2
        (t: number) => t * t / 2 + t * t * t / 6, // y_2
        (t: number) => t * t / 2 + t * t * t / 6 + t * t * t * t / 24, // y_3
        (t: number) =>
          t * t / 2 + t * t * t / 6 + t * t * t * t / 24 + Math.pow(t, 5) / 120,
        (t: number) =>
          t * t / 2 +
          t * t * t / 6 +
          t * t * t * t / 24 +
          Math.pow(t, 5) / 120 +
          Math.pow(t, 6) / 720,
        (t: number) => {
          let sum = 0;
          for (let k = 2; k <= 7; k++) sum += Math.pow(t, k) / factorial(k);
          return sum;
        },
        (t: number) => {
          let sum = 0;
          for (let k = 2; k <= 8; k++) sum += Math.pow(t, k) / factorial(k);
          return sum;
        },
        (t: number) => {
          let sum = 0;
          for (let k = 2; k <= 9; k++) sum += Math.pow(t, k) / factorial(k);
          return sum;
        },
      ],
      maxN: 8,
    },
    {
      name: 'blowup',
      label: "y' = y²,  y(0) = 1",
      f: (_t, y) => y * y,
      t0: 0,
      y0: 1,
      exactSolution: (t) => 1 / (1 - t),
      // Picard iterates: y_0=1, y_1=1+t, y_2=1+t+t²+t³/3, ...
      // These are partial sums of the geometric-like series 1/(1-t)
      iterates: [
        () => 1,
        (t: number) => 1 + t,
        (t: number) => 1 + t + t * t + t * t * t / 3,
        (t: number) =>
          1 + t + t * t + t * t * t + (2 / 3) * Math.pow(t, 4) +
          (1 / 3) * Math.pow(t, 5) + (2 / 45) * Math.pow(t, 6) +
          (1 / 63) * Math.pow(t, 7),
        // Beyond n=3 the expressions are too long; use numerical iterates
      ],
      maxN: 8,
    },
  ];
}

// ── Exact equation presets ─────────────────────────────────

export function getExactEquationPresets(): ExactEquationPreset[] {
  return [
    {
      name: 'quadratic-potential',
      label: '(2ty + 3) dt + (t² + 4y) dy = 0',
      M: (t, y) => 2 * t * y + 3,
      N: (t, _y) => t * t + 4 * _y,
      psi: (t, y) => t * t * y + 3 * t + 2 * y * y,
      isExact: true,
    },
    {
      name: 'exponential-potential',
      label: '(ye^{ty} + 2t) dt + (te^{ty} + 1) dy = 0',
      M: (t, y) => y * Math.exp(t * y) + 2 * t,
      N: (t, y) => t * Math.exp(t * y) + 1,
      psi: (t, y) => Math.exp(t * y) + t * t + y,
      isExact: true,
    },
    {
      name: 'non-exact',
      label: '(2y) dt + t dy = 0',
      M: (_t, y) => 2 * y,
      N: (t) => t,
      // Not exact: M_y = 2 ≠ 1 = N_t
      // Integrating factor μ = t converts to (2ty) dt + t² dy = 0, which is exact
      psi: () => 0, // No potential without integrating factor
      isExact: false,
    },
  ];
}
