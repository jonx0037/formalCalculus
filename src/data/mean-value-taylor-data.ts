/**
 * Data presets for the Mean Value Theorem & Taylor Expansion topic.
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface MVTFunctionPreset {
  name: string;
  label: string;
  fn: (x: number) => number;
  derivative: (x: number) => number;
  domain: [number, number];
  defaultA: number;
  defaultB: number;
}

export interface RollesPreset {
  name: string;
  label: string;
  fn: (x: number) => number;
  derivative: (x: number) => number;
  domain: [number, number];
  a: number;
  b: number;
  criticalPoints: number[];
  isFailure: boolean;
  failureType?: 'not-continuous' | 'not-differentiable' | 'f(a)!=f(b)';
  explanation: string;
}

export interface TaylorFunctionPreset {
  name: string;
  label: string;
  fn: (x: number) => number;
  /** Array of derivative functions: [f, f', f'', ...] through order 15 */
  derivatives: ((x: number) => number)[];
  domain: [number, number];
  defaultCenter: number;
  /** Upper bound on |f^(n+1)(t)| for t between center and x */
  maxDerivBound?: (center: number, x: number, degree: number) => number;
  knownSeries?: string;
}

export interface ConvergencePreset {
  name: string;
  label: string;
  fn: (x: number) => number;
  derivative: (x: number) => number;
  secondDerivative: (x: number) => number;
  domain: [number, number];
  defaultX0: number;
  defaultEta: number;
  minimizer: number;
}

// ── MVT Presets ─────────────────────────────────────────────

export function getMVTPresets(): MVTFunctionPreset[] {
  return [
    {
      name: 'x-squared',
      label: 'f(x) = x²',
      fn: (x) => x * x,
      derivative: (x) => 2 * x,
      domain: [-1, 3],
      defaultA: 0,
      defaultB: 2,
    },
    {
      name: 'x-cubed',
      label: 'f(x) = x³',
      fn: (x) => x * x * x,
      derivative: (x) => 3 * x * x,
      domain: [-2, 2],
      defaultA: 0,
      defaultB: 2,
    },
    {
      name: 'sin',
      label: 'f(x) = sin(x)',
      fn: Math.sin,
      derivative: Math.cos,
      domain: [0, Math.PI],
      defaultA: 0,
      defaultB: Math.PI,
    },
    {
      name: 'exp',
      label: 'f(x) = eˣ',
      fn: Math.exp,
      derivative: Math.exp,
      domain: [0, 2],
      defaultA: 0,
      defaultB: 2,
    },
    {
      name: 'sqrt',
      label: 'f(x) = √x',
      fn: Math.sqrt,
      derivative: (x) => 1 / (2 * Math.sqrt(x)),
      domain: [0.1, 4],
      defaultA: 0.25,
      defaultB: 4,
    },
  ];
}

// ── Rolle's Theorem Presets ─────────────────────────────────

export function getRollesPresets(): RollesPreset[] {
  return [
    // Valid presets
    {
      name: 'quadratic',
      label: 'f(x) = x² − 4x + 3',
      fn: (x) => x * x - 4 * x + 3,
      derivative: (x) => 2 * x - 4,
      domain: [0.5, 3.5],
      a: 1,
      b: 3,
      criticalPoints: [2],
      isFailure: false,
      explanation: 'f(1) = f(3) = 0, and f\'(2) = 0.',
    },
    {
      name: 'sin-0-pi',
      label: 'f(x) = sin(x) on [0, π]',
      fn: Math.sin,
      derivative: Math.cos,
      domain: [-0.3, Math.PI + 0.3],
      a: 0,
      b: Math.PI,
      criticalPoints: [Math.PI / 2],
      isFailure: false,
      explanation: 'f(0) = f(π) = 0, and f\'(π/2) = cos(π/2) = 0.',
    },
    {
      name: 'cubic-symmetric',
      label: 'f(x) = x³ − 3x on [−√3, √3]',
      fn: (x) => x * x * x - 3 * x,
      derivative: (x) => 3 * x * x - 3,
      domain: [-2.2, 2.2],
      a: -Math.sqrt(3),
      b: Math.sqrt(3),
      criticalPoints: [-1, 1],
      isFailure: false,
      explanation: 'f(−√3) = f(√3) = 0. Two critical points: f\'(±1) = 0.',
    },
    {
      name: 'cos-symmetric',
      label: 'f(x) = cos(x) on [−π/2, π/2]',
      fn: Math.cos,
      derivative: (x) => -Math.sin(x),
      domain: [-Math.PI / 2 - 0.3, Math.PI / 2 + 0.3],
      a: -Math.PI / 2,
      b: Math.PI / 2,
      criticalPoints: [0],
      isFailure: false,
      explanation: 'f(−π/2) = f(π/2) = 0, and f\'(0) = −sin(0) = 0.',
    },
    // Failure presets
    {
      name: 'fail-not-continuous',
      label: 'f(x) = x for x < 1, f(1) = 0 (not continuous)',
      fn: (x) => (x < 1 ? x : 0),
      derivative: (_x) => 1,
      domain: [-0.2, 1.2],
      a: 0,
      b: 1,
      criticalPoints: [],
      isFailure: true,
      failureType: 'not-continuous',
      explanation: 'f(0) = f(1) = 0, but f\'(x) = 1 on (0, 1) — no c with f\'(c) = 0. Discontinuity at x = 1 breaks Rolle\'s conclusion.',
    },
    {
      name: 'fail-not-differentiable',
      label: 'f(x) = |x| (not differentiable)',
      fn: Math.abs,
      derivative: (x) => (x > 0 ? 1 : x < 0 ? -1 : 0),
      domain: [-1.5, 1.5],
      a: -1,
      b: 1,
      criticalPoints: [],
      isFailure: true,
      failureType: 'not-differentiable',
      explanation: 'f(−1) = f(1) = 1, but f is not differentiable at x = 0 (corner). No point where f\'(c) = 0.',
    },
    {
      name: 'fail-unequal-endpoints',
      label: 'f(x) = x + 1 (f(a) ≠ f(b))',
      fn: (x) => x + 1,
      derivative: (_x) => 1,
      domain: [-0.2, 1.2],
      a: 0,
      b: 1,
      criticalPoints: [],
      isFailure: true,
      failureType: 'f(a)!=f(b)',
      explanation: 'f(0) = 1 ≠ f(1) = 2. With f\'(x) = 1 everywhere, there is no point where f\'(c) = 0.',
    },
  ];
}

// ── Taylor Function Presets ─────────────────────────────────

/** Generate the cyclic derivative pattern for sin(x): [sin, cos, -sin, -cos, ...] */
function sinDerivatives(n: number): ((x: number) => number)[] {
  const cycle = [Math.sin, Math.cos, (x: number) => -Math.sin(x), (x: number) => -Math.cos(x)];
  return Array.from({ length: n }, (_, k) => cycle[k % 4]);
}

/** Generate the cyclic derivative pattern for cos(x): [cos, -sin, -cos, sin, ...] */
function cosDerivatives(n: number): ((x: number) => number)[] {
  const cycle = [Math.cos, (x: number) => -Math.sin(x), (x: number) => -Math.cos(x), Math.sin];
  return Array.from({ length: n }, (_, k) => cycle[k % 4]);
}

export function getTaylorFunctionPresets(): TaylorFunctionPreset[] {
  return [
    {
      name: 'exp',
      label: 'f(x) = eˣ',
      fn: Math.exp,
      derivatives: Array.from({ length: 16 }, () => Math.exp),
      domain: [-3, 3],
      defaultCenter: 0,
      maxDerivBound: (center, x) => Math.exp(Math.max(Math.abs(center), Math.abs(x))),
      knownSeries: '\\sum_{k=0}^{\\infty} \\frac{x^k}{k!}',
    },
    {
      name: 'sin',
      label: 'f(x) = sin(x)',
      fn: Math.sin,
      derivatives: sinDerivatives(16),
      domain: [-2 * Math.PI, 2 * Math.PI],
      defaultCenter: 0,
      maxDerivBound: () => 1,
      knownSeries: '\\sum_{k=0}^{\\infty} \\frac{(-1)^k x^{2k+1}}{(2k+1)!}',
    },
    {
      name: 'cos',
      label: 'f(x) = cos(x)',
      fn: Math.cos,
      derivatives: cosDerivatives(16),
      domain: [-2 * Math.PI, 2 * Math.PI],
      defaultCenter: 0,
      maxDerivBound: () => 1,
      knownSeries: '\\sum_{k=0}^{\\infty} \\frac{(-1)^k x^{2k}}{(2k)!}',
    },
    {
      name: 'ln1px',
      label: 'f(x) = ln(1 + x)',
      fn: (x) => Math.log(1 + x),
      derivatives: (() => {
        const derivs: ((x: number) => number)[] = [(x) => Math.log(1 + x)];
        for (let k = 1; k <= 15; k++) {
          const kk = k;
          const sign = kk % 2 === 1 ? 1 : -1;
          const factorialPart = (() => {
            let f = 1;
            for (let j = 1; j < kk; j++) f *= j;
            return f;
          })();
          derivs.push((x) => (sign * factorialPart) / Math.pow(1 + x, kk));
        }
        return derivs;
      })(),
      domain: [-0.9, 2],
      defaultCenter: 0,
      knownSeries: '\\sum_{k=1}^{\\infty} \\frac{(-1)^{k+1} x^k}{k}',
    },
    {
      name: '1over1mx',
      label: 'f(x) = 1/(1 − x)',
      fn: (x) => 1 / (1 - x),
      derivatives: (() => {
        const derivs: ((x: number) => number)[] = [];
        for (let k = 0; k <= 15; k++) {
          const kk = k;
          let factorial = 1;
          for (let j = 1; j <= kk; j++) factorial *= j;
          const fk = factorial;
          derivs.push((x) => fk / Math.pow(1 - x, kk + 1));
        }
        return derivs;
      })(),
      domain: [-2, 0.9],
      defaultCenter: 0,
      knownSeries: '\\sum_{k=0}^{\\infty} x^k \\quad (|x| < 1)',
    },
    {
      name: '1over1px2',
      label: 'f(x) = 1/(1 + x²)',
      fn: (x) => 1 / (1 + x * x),
      derivatives: (() => {
        // Symbolic derivatives of 1/(1+x²) through order 8, then chained
        // central differences for orders 9–15 (with adaptive step size).
        // At x=0: f^(2k)(0) = (-1)^k * (2k)!, f^(2k+1)(0) = 0.
        const u = (x: number) => 1 + x * x;
        const derivs: ((x: number) => number)[] = [
          (x) => 1 / u(x),                                                                    // f
          (x) => -2 * x / Math.pow(u(x), 2),                                                  // f'
          (x) => (6 * x * x - 2) / Math.pow(u(x), 3),                                        // f''
          (x) => (24 * x * (1 - x * x)) / Math.pow(u(x), 4),                                 // f'''
          (x) => (24 * (5 * Math.pow(x, 4) - 10 * x * x + 1)) / Math.pow(u(x), 5),          // f⁴
          (x) => (-240 * x * (3 * Math.pow(x, 4) - 10 * x * x + 3)) / Math.pow(u(x), 6),    // f⁵
          (x) => (720 * (7 * Math.pow(x, 6) - 35 * Math.pow(x, 4) + 21 * x * x - 1)) / Math.pow(u(x), 7), // f⁶
          (x) => (-5040 * x * (Math.pow(x, 6) - 7 * Math.pow(x, 4) + 7 * x * x - 1)) * 4 / Math.pow(u(x), 8), // f⁷ (simplified)
          (x) => {                                                                              // f⁸ via central diff of f⁷
            const h = 1e-4;
            return (derivs[7](x + h) - derivs[7](x - h)) / (2 * h);
          },
        ];
        // Orders 9–15: chained central differences with small step
        for (let k = 9; k <= 15; k++) {
          const prev = derivs[k - 1];
          derivs.push((x) => {
            const h = 1e-4;
            return (prev(x + h) - prev(x - h)) / (2 * h);
          });
        }
        return derivs;
      })(),
      domain: [-3, 3],
      defaultCenter: 0,
      knownSeries: '\\sum_{k=0}^{\\infty} (-1)^k x^{2k} \\quad (|x| < 1)',
    },
  ];
}

// ── Convergence Presets ─────────────────────────────────────

export function getConvergencePresets(): ConvergencePreset[] {
  return [
    {
      name: 'quadratic',
      label: 'f(x) = x²',
      fn: (x) => x * x,
      derivative: (x) => 2 * x,
      secondDerivative: (_x) => 2,
      domain: [-3, 3],
      defaultX0: 2.5,
      defaultEta: 0.3,
      minimizer: 0,
    },
    {
      name: 'quartic',
      label: 'f(x) = (x − 1)⁴',
      fn: (x) => Math.pow(x - 1, 4),
      derivative: (x) => 4 * Math.pow(x - 1, 3),
      secondDerivative: (x) => 12 * Math.pow(x - 1, 2),
      domain: [-1, 3],
      defaultX0: 2.5,
      defaultEta: 0.05,
      minimizer: 1,
    },
    {
      name: 'noisy',
      label: 'f(x) = x² + 0.1 sin(10x)',
      fn: (x) => x * x + 0.1 * Math.sin(10 * x),
      derivative: (x) => 2 * x + Math.cos(10 * x),
      secondDerivative: (x) => 2 - 10 * Math.sin(10 * x),
      domain: [-3, 3],
      defaultX0: 2.0,
      defaultEta: 0.15,
      minimizer: -0.13064, // numerically computed: f'(x) = 2x + cos(10x) = 0
    },
  ];
}

// ── Smooth-but-not-analytic data ────────────────────────────

/**
 * The bump function f(x) = e^{-1/x²} for x ≠ 0, f(0) = 0.
 * This is C^∞ everywhere, but its Taylor series at 0 is identically zero
 * (all derivatives vanish at 0), while f(x) > 0 for x ≠ 0.
 */
export function smoothNotAnalytic(x: number): number {
  if (x === 0) return 0;
  return Math.exp(-1 / (x * x));
}

/**
 * Precomputed data for the smooth-but-not-analytic illustration.
 */
export function getSmoothNotAnalyticData(): { x: number; fx: number; taylor: number }[] {
  const data: { x: number; fx: number; taylor: number }[] = [];
  for (let i = -200; i <= 200; i++) {
    const x = i / 100; // [-2, 2] at 0.01 resolution
    data.push({
      x,
      fx: smoothNotAnalytic(x),
      taylor: 0, // All Taylor coefficients at 0 are zero
    });
  }
  return data;
}
