/**
 * Data presets for the Power Series & Taylor Series topic.
 * All functions are pure and deterministic — no Math.random().
 *
 * Builds on series-convergence-data.ts patterns, but works with
 * function series Σ aₙ(x-c)ⁿ rather than numerical series Σ aₙ.
 */

// ── Helpers ─────────────────────────────────────────────────

const MAX_FINITE_FACTORIAL_N = 170;
const factorialCache: number[] = [1, 1];
function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n > MAX_FINITE_FACTORIAL_N) return Infinity;
  if (n < factorialCache.length) return factorialCache[n];
  for (let i = factorialCache.length; i <= n; i++) {
    factorialCache[i] = factorialCache[i - 1] * i;
  }
  return factorialCache[n];
}

/** Generalized binomial coefficient C(α, n) = α(α-1)...(α-n+1)/n! */
function binomialCoeff(alpha: number, n: number): number {
  if (n === 0) return 1;
  let result = 1;
  for (let k = 0; k < n; k++) {
    result *= (alpha - k) / (k + 1);
  }
  return result;
}

// ── Interfaces ──────────────────────────────────────────────

export interface PowerSeriesPreset {
  name: string;
  label: string;
  coefficients: (n: number) => number;
  targetFunction: (x: number) => number;
  center: number;
  radius: number;
  endpointBehavior: {
    left: 'converges' | 'diverges' | 'not-applicable';
    right: 'converges' | 'diverges' | 'not-applicable';
  };
  analyticity: 'entire' | 'analytic-on-interval' | 'smooth-not-analytic';
  tags: string[];
  mlNote?: string;
}

export interface TaylorCatalogEntry {
  name: string;
  label: string;
  latexSeries: string;
  coefficients: (n: number) => number;
  targetFunction: (x: number) => number;
  center: number;
  radius: number;
  derivativeAtCenter: (n: number) => number;
}

export interface EndpointAnalysis {
  seriesName: string;
  radius: number;
  leftEndpoint: {
    x: number;
    series: string;
    verdict: 'converges' | 'diverges';
    test: string;
  };
  rightEndpoint: {
    x: number;
    series: string;
    verdict: 'converges' | 'diverges';
    test: string;
  };
  intervalOfConvergence: string;
}

// ── Power series presets ────────────────────────────────────

const geometric: PowerSeriesPreset = {
  name: 'geometric',
  label: '1/(1−x) = Σ xⁿ',
  coefficients: (_n: number) => 1,
  targetFunction: (x: number) => 1 / (1 - x),
  center: 0,
  radius: 1,
  endpointBehavior: { left: 'diverges', right: 'diverges' },
  analyticity: 'analytic-on-interval',
  tags: ['geometric', 'rational', 'R=1'],
  mlNote: 'Neumann series (I−A)⁻¹ = Σ Aᵏ for ��A‖ < 1 in iterative solvers',
};

const exponential: PowerSeriesPreset = {
  name: 'exponential',
  label: 'eˣ = Σ xⁿ/n!',
  coefficients: (n: number) => 1 / factorial(n),
  targetFunction: (x: number) => Math.exp(x),
  center: 0,
  radius: Infinity,
  endpointBehavior: { left: 'not-applicable', right: 'not-applicable' },
  analyticity: 'entire',
  tags: ['exponential', 'entire', 'R=∞'],
  mlNote: 'Matrix exponential e^{At} = Σ (At)ⁿ/n! solves linear ODEs in neural ODEs and state-space models (S4, Mamba)',
};

const logOnePlusX: PowerSeriesPreset = {
  name: 'ln1px',
  label: 'ln(1+x) = Σ (−1)ⁿ⁺¹ xⁿ/n',
  coefficients: (n: number) => {
    if (n === 0) return 0;
    return Math.pow(-1, n + 1) / n;
  },
  targetFunction: (x: number) => Math.log(1 + x),
  center: 0,
  radius: 1,
  endpointBehavior: { left: 'diverges', right: 'converges' },
  analyticity: 'analytic-on-interval',
  tags: ['logarithmic', 'alternating', 'R=1'],
  mlNote: 'Log-likelihood expansions in variational inference',
};

const sinX: PowerSeriesPreset = {
  name: 'sin',
  label: 'sin x = Σ (−1)ⁿ x²ⁿ⁺¹/(2n+1)!',
  coefficients: (n: number) => {
    if (n % 2 === 0) return 0;                          // even coefficients are zero
    const k = (n - 1) / 2;                              // n = 2k+1
    return Math.pow(-1, k) / factorial(n);
  },
  targetFunction: (x: number) => Math.sin(x),
  center: 0,
  radius: Infinity,
  endpointBehavior: { left: 'not-applicable', right: 'not-applicable' },
  analyticity: 'entire',
  tags: ['trigonometric', 'entire', 'R=∞', 'odd'],
};

const cosX: PowerSeriesPreset = {
  name: 'cos',
  label: 'cos x = Σ (−1)ⁿ x²ⁿ/(2n)!',
  coefficients: (n: number) => {
    if (n % 2 !== 0) return 0;                           // odd coefficients are zero
    const k = n / 2;
    return Math.pow(-1, k) / factorial(n);
  },
  targetFunction: (x: number) => Math.cos(x),
  center: 0,
  radius: Infinity,
  endpointBehavior: { left: 'not-applicable', right: 'not-applicable' },
  analyticity: 'entire',
  tags: ['trigonometric', 'entire', 'R=∞', 'even'],
};

const binomialSeries: PowerSeriesPreset = {
  name: 'binomial',
  label: '(1+x)^α = Σ C(α,n) xⁿ',
  // Default α = 0.5 for (1+x)^{1/2}; viz components can override
  coefficients: (n: number) => binomialCoeff(0.5, n),
  targetFunction: (x: number) => Math.pow(1 + x, 0.5),
  center: 0,
  radius: 1,
  endpointBehavior: { left: 'diverges', right: 'converges' },
  analyticity: 'analytic-on-interval',
  tags: ['binomial', 'algebraic', 'R=1'],
  mlNote: 'Square-root matrix operations in natural gradient and whitening transforms',
};

const reciprocalNSquared: PowerSeriesPreset = {
  name: 'x-over-n-squared',
  label: 'Σ xⁿ/n²',
  coefficients: (n: number) => {
    if (n === 0) return 0;
    return 1 / (n * n);
  },
  targetFunction: (x: number) => {
    // Li₂(x) = Σ xⁿ/n² (dilogarithm), no simple closed form.
    // Compute numerically via partial sum (50 terms suffices for |x| ≤ 1).
    let sum = 0;
    for (let k = 1; k <= 50; k++) {
      sum += Math.pow(x, k) / (k * k);
    }
    return sum;
  },
  center: 0,
  radius: 1,
  endpointBehavior: { left: 'converges', right: 'converges' },
  analyticity: 'analytic-on-interval',
  tags: ['p-series-coefficients', 'R=1', 'both-endpoints-converge'],
};

const factorialCoeffs: PowerSeriesPreset = {
  name: 'n-factorial',
  label: 'Σ n! xⁿ (R = 0)',
  coefficients: (n: number) => factorial(n),
  targetFunction: (_x: number) => NaN,  // Only converges at x = 0
  center: 0,
  radius: 0,
  endpointBehavior: { left: 'not-applicable', right: 'not-applicable' },
  analyticity: 'analytic-on-interval',
  tags: ['factorial', 'R=0', 'divergent-everywhere'],
};

// ── Preset accessor ─────────────────────────────────────────

export function getPowerSeriesPresets(): PowerSeriesPreset[] {
  return [
    geometric,
    exponential,
    logOnePlusX,
    sinX,
    cosX,
    binomialSeries,
    reciprocalNSquared,
    factorialCoeffs,
  ];
}

// ── Binomial preset factory ─────────────────────────────────

/** Create a binomial series preset for a specific α value. */
export function makeBinomialPreset(alpha: number): PowerSeriesPreset {
  return {
    ...binomialSeries,
    label: `(1+x)^{${alpha}} = Σ C(${alpha},n) xⁿ`,
    coefficients: (n: number) => binomialCoeff(alpha, n),
    targetFunction: (x: number) => Math.pow(1 + x, alpha),
    endpointBehavior: {
      left: alpha > 0 ? 'converges' : 'diverges',
      right: alpha > 0 ? 'converges' : 'diverges',
    },
  };
}

// ── Taylor series catalog ───────────────────────────────────

export function getTaylorCatalog(): TaylorCatalogEntry[] {
  return [
    {
      name: 'exp',
      label: 'eˣ',
      latexSeries: '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}',
      coefficients: (n: number) => 1 / factorial(n),
      targetFunction: (x: number) => Math.exp(x),
      center: 0,
      radius: Infinity,
      derivativeAtCenter: (_n: number) => 1,  // f^(n)(0) = 1 for all n
    },
    {
      name: 'sin',
      label: 'sin x',
      latexSeries: '\\sum_{n=0}^{\\infty} \\frac{(-1)^n}{(2n+1)!} x^{2n+1}',
      coefficients: (n: number) => {
        if (n % 2 === 0) return 0;
        const k = (n - 1) / 2;
        return Math.pow(-1, k) / factorial(n);
      },
      targetFunction: (x: number) => Math.sin(x),
      center: 0,
      radius: Infinity,
      derivativeAtCenter: (n: number) => {
        // f^(n)(0) cycles: 0, 1, 0, -1, 0, 1, ...
        const r = n % 4;
        if (r === 0) return 0;
        if (r === 1) return 1;
        if (r === 2) return 0;
        return -1;
      },
    },
    {
      name: 'cos',
      label: 'cos x',
      latexSeries: '\\sum_{n=0}^{\\infty} \\frac{(-1)^n}{(2n)!} x^{2n}',
      coefficients: (n: number) => {
        if (n % 2 !== 0) return 0;
        const k = n / 2;
        return Math.pow(-1, k) / factorial(n);
      },
      targetFunction: (x: number) => Math.cos(x),
      center: 0,
      radius: Infinity,
      derivativeAtCenter: (n: number) => {
        // f^(n)(0) cycles: 1, 0, -1, 0, 1, ...
        const r = n % 4;
        if (r === 0) return 1;
        if (r === 1) return 0;
        if (r === 2) return -1;
        return 0;
      },
    },
    {
      name: 'ln1px',
      label: 'ln(1+x)',
      latexSeries: '\\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n} x^n',
      coefficients: (n: number) => {
        if (n === 0) return 0;
        return Math.pow(-1, n + 1) / n;
      },
      targetFunction: (x: number) => Math.log(1 + x),
      center: 0,
      radius: 1,
      derivativeAtCenter: (n: number) => {
        // f^(n)(0) = (-1)^{n+1} (n-1)! for n ≥ 1, f(0) = 0
        if (n === 0) return 0;
        return Math.pow(-1, n + 1) * factorial(n - 1);
      },
    },
    {
      name: '1over1mx',
      label: '1/(1−x)',
      latexSeries: '\\sum_{n=0}^{\\infty} x^n',
      coefficients: (_n: number) => 1,
      targetFunction: (x: number) => 1 / (1 - x),
      center: 0,
      radius: 1,
      derivativeAtCenter: (n: number) => factorial(n),  // f^(n)(0) = n!
    },
    {
      name: 'binomial',
      label: '(1+x)^α',
      latexSeries: '\\sum_{n=0}^{\\infty} \\binom{\\alpha}{n} x^n',
      coefficients: (n: number) => binomialCoeff(0.5, n),
      targetFunction: (x: number) => Math.pow(1 + x, 0.5),
      center: 0,
      radius: 1,
      derivativeAtCenter: (n: number) => {
        // f^(n)(0)/n! = C(α,n), so f^(n)(0) = n! · C(α,n)
        return factorial(n) * binomialCoeff(0.5, n);
      },
    },
  ];
}

// ── Endpoint analysis examples ──────────────────────────────

export function getEndpointAnalyses(): EndpointAnalysis[] {
  return [
    {
      seriesName: 'Σ xⁿ',
      radius: 1,
      leftEndpoint: {
        x: -1,
        series: '\\sum (-1)^n',
        verdict: 'diverges',
        test: 'Divergence test: terms do not tend to 0',
      },
      rightEndpoint: {
        x: 1,
        series: '\\sum 1',
        verdict: 'diverges',
        test: 'Divergence test: terms do not tend to 0',
      },
      intervalOfConvergence: '(−1, 1)',
    },
    {
      seriesName: 'Σ xⁿ/n',
      radius: 1,
      leftEndpoint: {
        x: -1,
        series: '\\sum (-1)^n/n',
        verdict: 'converges',
        test: 'Alternating series test (Leibniz): terms decrease to 0',
      },
      rightEndpoint: {
        x: 1,
        series: '\\sum 1/n',
        verdict: 'diverges',
        test: 'p-series with p = 1: harmonic series diverges',
      },
      intervalOfConvergence: '[−1, 1)',
    },
    {
      seriesName: 'Σ xⁿ/n²',
      radius: 1,
      leftEndpoint: {
        x: -1,
        series: '\\sum (-1)^n/n^2',
        verdict: 'converges',
        test: 'Absolute convergence: Σ 1/n² converges (p-series, p = 2)',
      },
      rightEndpoint: {
        x: 1,
        series: '\\sum 1/n^2',
        verdict: 'converges',
        test: 'p-series with p = 2 > 1: converges',
      },
      intervalOfConvergence: '[−1, 1]',
    },
    {
      seriesName: 'Σ (−1)ⁿ xⁿ/√(n+1)',
      radius: 1,
      leftEndpoint: {
        x: -1,
        series: '\\sum 1/\\sqrt{n+1}',
        verdict: 'diverges',
        test: 'Comparison with Σ 1/√n (p-series, p = 1/2 < 1)',
      },
      rightEndpoint: {
        x: 1,
        series: '\\sum (-1)^n/\\sqrt{n+1}',
        verdict: 'converges',
        test: 'Alternating series test: 1/√(n+1) decreases to 0',
      },
      intervalOfConvergence: '(−1, 1]',
    },
  ];
}

// ── Smooth but not analytic ─────────────────────────────────

export function getSmoothNotAnalyticPreset(): {
  f: (x: number) => number;
  taylorCoeffs: (n: number) => number;
  name: string;
  description: string;
} {
  return {
    f: (x: number) => {
      if (Math.abs(x) < 1e-15) return 0;
      return Math.exp(-1 / (x * x));
    },
    taylorCoeffs: (_n: number) => 0,  // All derivatives at 0 are 0
    name: 'e^{−1/x²}',
    description:
      'Smooth (C^∞) at the origin with all derivatives zero, yet f(x) > 0 for x ≠ 0. ' +
      'Its Taylor series at 0 is identically 0, which converges — but to the wrong function.',
  };
}
