/**
 * Data presets for the Series Convergence & Tests topic.
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface SeriesPreset {
  name: string;
  label: string;
  term: (n: number) => number;
  partialSum?: (n: number) => number;
  exactSum: number | null;
  converges: boolean;
  convergesAbsolutely: boolean;
  convergenceType: 'absolute' | 'conditional' | 'divergent';
  tags: string[];
  mlNote?: string;
}

export interface ConvergenceTestResult {
  test: 'divergence' | 'comparison' | 'limit-comparison' | 'ratio' | 'root' | 'integral' | 'alternating';
  verdict: 'converges' | 'diverges' | 'inconclusive';
  diagnosticValue: number | null;
  explanation: string;
}

export interface LearningRateSchedule {
  name: string;
  label: string;
  alpha: (t: number) => number;
  sumDiverges: boolean;
  sumSquaresConverges: boolean;
  robbinsMonroValid: boolean;
  description: string;
}

// ── Helpers ─────────────────────────────────────────────────

/** Factorial with memoization and overflow guard.
 * 171! exceeds Number.MAX_VALUE, so we clamp to avoid Infinity/NaN cascades
 * in partial-sum accumulation and D3 scales when users slide maxN above ~170.
 */
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

// ── Series presets ──────────────────────────────────────────

const geometricHalf: SeriesPreset = {
  name: 'geometric-half',
  label: 'Geometric (r = 1/2)',
  term: (n: number) => Math.pow(0.5, n),
  partialSum: (n: number) => 1 - Math.pow(0.5, n),  // Σ_{k=1}^{n} (1/2)^k = 1 - (1/2)^n
  exactSum: 1,  // Σ_{n=1}^∞ (1/2)^n = (1/2)/(1-1/2) = 1 (starts from n=1)
  converges: true,
  convergesAbsolutely: true,
  convergenceType: 'absolute',
  tags: ['geometric'],
  mlNote: 'Discount factors in RL: G_t = Σ γ^k R_{t+k+1} with γ = 0.5',
};

const geometricTwo: SeriesPreset = {
  name: 'geometric-two',
  label: 'Geometric (r = 2, divergent)',
  term: (n: number) => Math.pow(2, n),
  exactSum: null,
  converges: false,
  convergesAbsolutely: false,
  convergenceType: 'divergent',
  tags: ['geometric'],
};

const harmonic: SeriesPreset = {
  name: 'harmonic',
  label: 'Harmonic (1/n)',
  term: (n: number) => 1 / n,
  exactSum: null,
  converges: false,
  convergesAbsolutely: false,
  convergenceType: 'divergent',
  tags: ['p-series', 'harmonic'],
  mlNote: 'Learning rate α_t = 1/t satisfies both Robbins-Monro conditions (boundary case p = 1)',
};

const pSeriesTwo: SeriesPreset = {
  name: 'p-series-2',
  label: 'p-series (p = 2)',
  term: (n: number) => 1 / (n * n),
  exactSum: Math.PI * Math.PI / 6,
  converges: true,
  convergesAbsolutely: true,
  convergenceType: 'absolute',
  tags: ['p-series'],
  mlNote: 'Σ α_t² < ∞ for α_t = 1/t ensures SGD noise averages out',
};

const alternatingHarmonic: SeriesPreset = {
  name: 'alternating-harmonic',
  label: 'Alternating harmonic',
  term: (n: number) => Math.pow(-1, n + 1) / n,
  exactSum: Math.LN2,
  converges: true,
  convergesAbsolutely: false,
  convergenceType: 'conditional',
  tags: ['alternating', 'harmonic'],
  mlNote: 'Prototypical conditional convergence — rearrangement changes the sum',
};

const reciprocalFactorial: SeriesPreset = {
  name: 'reciprocal-factorial',
  label: '1/n!',
  term: (n: number) => 1 / factorial(n),
  exactSum: Math.E - 1,
  converges: true,
  convergesAbsolutely: true,
  convergenceType: 'absolute',
  tags: ['factorial'],
  mlNote: 'Exponential activation: e^x = Σ x^n/n! converges for all x',
};

const factorialOverPower: SeriesPreset = {
  name: 'factorial-over-power',
  label: 'n!/nⁿ',
  term: (n: number) => factorial(n) / Math.pow(n, n),
  exactSum: null,
  converges: true,
  convergesAbsolutely: true,
  convergenceType: 'absolute',
  tags: ['factorial'],
};

const powerOverFactorial: SeriesPreset = {
  name: 'power-over-factorial',
  label: '2ⁿ/n!',
  term: (n: number) => Math.pow(2, n) / factorial(n),
  exactSum: Math.E * Math.E - 1,
  converges: true,
  convergesAbsolutely: true,
  convergenceType: 'absolute',
  tags: ['factorial', 'exponential'],
};

const logSquaredSeries: SeriesPreset = {
  name: 'log-squared',
  label: '1/(n ln²n)',
  term: (n: number) => {
    if (n < 2) return 0;
    const ln = Math.log(n);
    return 1 / (n * ln * ln);
  },
  exactSum: null,
  converges: true,
  convergesAbsolutely: true,
  convergenceType: 'absolute',
  tags: ['integral-test'],
  mlNote: 'Series not amenable to ratio/root tests — requires the integral test',
};

const powerOverFactorialDiv: SeriesPreset = {
  name: 'power-power-divergent',
  label: 'nⁿ/n! (divergent)',
  term: (n: number) => Math.pow(n, n) / factorial(n),
  exactSum: null,
  converges: false,
  convergesAbsolutely: false,
  convergenceType: 'divergent',
  tags: ['factorial'],
};

/**
 * Returns all series presets. Lightweight constant data.
 */
export function getSeriesPresets(): SeriesPreset[] {
  return [
    geometricHalf,
    geometricTwo,
    harmonic,
    pSeriesTwo,
    alternatingHarmonic,
    reciprocalFactorial,
    factorialOverPower,
    powerOverFactorial,
    logSquaredSeries,
    powerOverFactorialDiv,
  ];
}

// ── Convergence test results ────────────────────────────────

/**
 * Apply all applicable convergence tests to a preset series.
 * Returns fresh results on each call (lazy pattern).
 */
export function getTestResults(preset: SeriesPreset): ConvergenceTestResult[] {
  const results: ConvergenceTestResult[] = [];

  // Divergence test — always applicable
  const tailAvg = (() => {
    let sum = 0;
    const start = 180;
    const end = 200;
    for (let n = start; n <= end; n++) sum += Math.abs(preset.term(n));
    return sum / (end - start + 1);
  })();

  if (tailAvg > 0.01) {
    results.push({
      test: 'divergence',
      verdict: 'diverges',
      diagnosticValue: tailAvg,
      explanation: `|aₙ| ↛ 0 (average of last terms ≈ ${tailAvg.toFixed(4)})`,
    });
  } else {
    results.push({
      test: 'divergence',
      verdict: 'inconclusive',
      diagnosticValue: tailAvg,
      explanation: `aₙ → 0 (necessary but not sufficient)`,
    });
  }

  // Ratio test
  const ratios: number[] = [];
  for (let n = 50; n < 100; n++) {
    const an = Math.abs(preset.term(n));
    const an1 = Math.abs(preset.term(n + 1));
    if (an > 1e-15) ratios.push(an1 / an);
  }
  if (ratios.length > 0) {
    const L = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    results.push({
      test: 'ratio',
      verdict: L < 0.99 ? 'converges' : L > 1.01 ? 'diverges' : 'inconclusive',
      diagnosticValue: L,
      explanation: L < 0.99
        ? `|aₙ₊₁/aₙ| → ${L.toFixed(4)} < 1`
        : L > 1.01
          ? `|aₙ₊₁/aₙ| → ${L.toFixed(4)} > 1`
          : `|aₙ₊₁/aₙ| → ${L.toFixed(4)} ≈ 1`,
    });
  }

  // Root test
  const roots: number[] = [];
  for (let n = 50; n <= 100; n++) {
    const absAn = Math.abs(preset.term(n));
    if (absAn > 0) roots.push(Math.pow(absAn, 1 / n));
  }
  if (roots.length > 0) {
    const L = roots.reduce((s, r) => s + r, 0) / roots.length;
    results.push({
      test: 'root',
      verdict: L < 0.99 ? 'converges' : L > 1.01 ? 'diverges' : 'inconclusive',
      diagnosticValue: L,
      explanation: L < 0.99
        ? `|aₙ|^(1/n) → ${L.toFixed(4)} < 1`
        : L > 1.01
          ? `|aₙ|^(1/n) → ${L.toFixed(4)} > 1`
          : `|aₙ|^(1/n) → ${L.toFixed(4)} ≈ 1`,
    });
  }

  // Alternating series test
  if (preset.tags.includes('alternating')) {
    const bTerms: number[] = [];
    let decreasing = true;
    for (let n = 1; n <= 50; n++) {
      bTerms.push(Math.abs(preset.term(n)));
    }
    for (let i = 1; i < bTerms.length; i++) {
      if (bTerms[i] > bTerms[i - 1] + 1e-12) {
        decreasing = false;
        break;
      }
    }
    const tendsToZero = bTerms[bTerms.length - 1] < 0.01;
    const passes = decreasing && tendsToZero;

    results.push({
      test: 'alternating',
      verdict: passes ? 'converges' : 'inconclusive',
      diagnosticValue: null,
      explanation: passes
        ? '|bₙ| decreasing and bₙ → 0 (Leibniz test)'
        : decreasing
          ? 'bₙ ↛ 0'
          : '|bₙ| not decreasing',
    });
  }

  return results;
}

// ── Learning rate schedules ─────────────────────────────────

/**
 * Returns preset learning rate schedules for the Robbins-Monro explorer.
 */
export function getLearningRateSchedules(): LearningRateSchedule[] {
  return [
    {
      name: 'polynomial-0.5',
      label: 'Polynomial (p = 0.5)',
      alpha: (t: number) => 1 / Math.pow(t, 0.5),
      sumDiverges: true,
      sumSquaresConverges: false,
      robbinsMonroValid: false,
      description: 'Σ 1/t^0.5 = ∞ ✓, Σ 1/t^1.0 = ∞ ✗ — too slow decay',
    },
    {
      name: 'polynomial-0.75',
      label: 'Polynomial (p = 0.75)',
      alpha: (t: number) => 1 / Math.pow(t, 0.75),
      sumDiverges: true,
      sumSquaresConverges: true,
      robbinsMonroValid: true,
      description: 'Σ 1/t^0.75 = ∞ ✓, Σ 1/t^1.5 < ∞ ✓ — valid',
    },
    {
      name: 'polynomial-1.0',
      label: 'Polynomial (p = 1.0)',
      alpha: (t: number) => 1 / t,
      sumDiverges: true,
      sumSquaresConverges: true,
      robbinsMonroValid: true,
      description: 'Σ 1/t = ∞ ✓, Σ 1/t² < ∞ ✓ — canonical choice',
    },
    {
      name: 'polynomial-1.5',
      label: 'Polynomial (p = 1.5)',
      alpha: (t: number) => 1 / Math.pow(t, 1.5),
      sumDiverges: false,
      sumSquaresConverges: true,
      robbinsMonroValid: false,
      description: 'Σ 1/t^1.5 < ∞ ✗ — decays too fast, algorithm stops exploring',
    },
    {
      name: 'exponential-0.99',
      label: 'Exponential (γ = 0.99)',
      alpha: (t: number) => Math.pow(0.99, t),
      sumDiverges: false,
      sumSquaresConverges: true,
      robbinsMonroValid: false,
      description: 'Σ 0.99^t = 100 < ∞ ✗ — geometric decay too fast',
    },
    {
      name: 'cosine-annealing',
      label: 'Cosine annealing',
      alpha: (t: number) => 0.5 * (1 + Math.cos(Math.PI * t / 1000)) / t,
      sumDiverges: true,
      sumSquaresConverges: true,
      robbinsMonroValid: true,
      description: 'Oscillating envelope on 1/t — valid with warm restarts',
    },
    {
      name: 'step-decay',
      label: 'Step decay (halve every 100)',
      alpha: (t: number) => Math.pow(0.5, Math.floor(t / 100)),
      sumDiverges: false,
      sumSquaresConverges: true,
      robbinsMonroValid: false,
      description: 'Piecewise constant decay — Σ α_t < ∞ (geometric blocks)',
    },
  ];
}

// ── Rearrangement builder ───────────────────────────────────

/**
 * Construct a rearrangement of the alternating harmonic series
 * converging to the given target value.
 * Positive terms: 1, 1/3, 1/5, ... (odd reciprocals)
 * Negative terms: -1/2, -1/4, -1/6, ... (even reciprocals, negated)
 */
export function buildRearrangement(
  target: number,
  maxTerms: number,
): { terms: number[]; partialSums: number[] } {
  const terms: number[] = [];
  const partialSums: number[] = [];
  let sum = 0;
  let posIdx = 1; // 1/(2k-1) positive terms
  let negIdx = 1; // 1/(2k) negative terms

  for (let i = 0; i < maxTerms; i++) {
    if (sum <= target) {
      const t = 1 / (2 * posIdx - 1);
      posIdx++;
      terms.push(t);
      sum += t;
    } else {
      const t = -1 / (2 * negIdx);
      negIdx++;
      terms.push(t);
      sum += t;
    }
    partialSums.push(sum);
  }

  return { terms, partialSums };
}
