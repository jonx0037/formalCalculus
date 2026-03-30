/**
 * Data presets for Uniform Convergence (Topic 4) visualizations.
 * All functions are pure — no Math.random().
 */

import { seededRandom } from '../components/viz/shared/limits';

// ── Function Sequence Presets (PointwiseVsUniformExplorer) ───

export interface FunctionSequencePreset {
  name: string;
  label: string;
  fn: (x: number, n: number) => number;
  limit: (x: number) => number;
  domain: [number, number];
  isUniform: boolean;
  supNorm: (n: number) => number;
  supNormFormula: string;
  mlContext: string;
}

export function getFunctionSequencePresets(): FunctionSequencePreset[] {
  return [
    {
      name: 'x-to-n',
      label: 'f_n(x) = x^n on [0, 1]',
      fn: (x, n) => Math.pow(x, n),
      limit: (x) => (x >= 1 ? 1 : 0),
      domain: [0, 1],
      isUniform: false,
      supNorm: (_n) => 1, // sup |x^n - 0| over [0,1) approaches 1
      supNormFormula: '||f_n - f||_∞ → 1 (never → 0)',
      mlContext:
        'Analogous to an overfit model converging fast in-distribution but failing at the boundary.',
    },
    {
      name: 'x-to-n-over-n',
      label: 'g_n(x) = x^n / n on [0, 1]',
      fn: (x, n) => Math.pow(x, n) / n,
      limit: (_x) => 0,
      domain: [0, 1],
      isUniform: true,
      supNorm: (n) => 1 / n,
      supNormFormula: '||g_n||_∞ = 1/n → 0',
      mlContext:
        'The 1/n damping is like weight decay: it forces the sequence to converge uniformly.',
    },
    {
      name: 'sin-nx-over-np1',
      label: 'h_n(x) = sin(nx)/(n+1) on [0, π]',
      fn: (x, n) => Math.sin(n * x) / (n + 1),
      limit: (_x) => 0,
      domain: [0, Math.PI],
      isUniform: true,
      supNorm: (n) => 1 / (n + 1),
      supNormFormula: '||h_n||_∞ = 1/(n+1) → 0',
      mlContext:
        'Oscillating features that diminish — like high-frequency Fourier modes in spectral regularization.',
    },
    {
      name: 'moving-peak',
      label: 'p_n(x) = nx(1-x)^n on [0, 1]',
      fn: (x, n) => n * x * Math.pow(1 - x, n),
      limit: (_x) => 0,
      domain: [0, 1],
      isUniform: false,
      supNorm: (n) => {
        // Maximum of nx(1-x)^n occurs at x = 1/(n+1)
        const xMax = 1 / (n + 1);
        return n * xMax * Math.pow(1 - xMax, n);
      },
      supNormFormula: '||p_n||_∞ = n/(n+1)·(n/(n+1))^n → 1/e ≈ 0.37',
      mlContext:
        'A moving bump — like attention shifting across tokens. Converges pointwise but the peak never vanishes.',
    },
    {
      name: 'x-over-1pnx',
      label: 'q_n(x) = x/(1+nx) on [0, 1]',
      fn: (x, n) => x / (1 + n * x),
      limit: (_x) => 0,
      domain: [0, 1],
      isUniform: true,
      supNorm: (n) => 1 / (n + 1),
      supNormFormula: '||q_n||_∞ = 1/(n+1) → 0',
      mlContext:
        'Soft thresholding — like the sigmoid activation compressing large inputs as width grows.',
    },
  ];
}

// ── Function Series Presets (WeierstrassMTestExplorer) ────────

export interface FunctionSeriesPreset {
  name: string;
  label: string;
  term: (x: number, k: number) => number;
  Mk: (k: number) => number;
  MkFormula: string;
  MtestPasses: boolean;
  domain: [number, number];
}

// Precomputed inverse factorials to avoid O(k) recomputation per call
const INV_FACTORIALS: number[] = (() => {
  const table = [1, 1]; // 1/0!, 1/1!
  let fact = 1;
  for (let i = 2; i <= 170; i++) {
    fact *= i;
    table.push(1 / fact);
  }
  return table;
})();

export function getFunctionSeriesPresets(): FunctionSeriesPreset[] {
  return [
    {
      name: 'sin-k2',
      label: '∑ sin(kx)/k²',
      term: (x, k) => Math.sin(k * x) / (k * k),
      Mk: (k) => 1 / (k * k),
      MkFormula: 'M_k = 1/k² (∑ = π²/6)',
      MtestPasses: true,
      domain: [0, 2 * Math.PI],
    },
    {
      name: 'cos-factorial',
      label: '∑ cos(kx)/k!',
      term: (x, k) => Math.cos(k * x) * (INV_FACTORIALS[k] ?? 0),
      Mk: (k) => INV_FACTORIALS[k] ?? 0,
      MkFormula: 'M_k = 1/k! (∑ = e − 1)',
      MtestPasses: true,
      domain: [0, 2 * Math.PI],
    },
    {
      name: 'sin-k',
      label: '∑ sin(kx)/k',
      term: (x, k) => Math.sin(k * x) / k,
      Mk: (k) => 1 / k,
      MkFormula: 'M_k = 1/k (∑ diverges!)',
      MtestPasses: false,
      domain: [0, 2 * Math.PI],
    },
  ];
}

// ── Function Family Presets (ArzelaAscoliExplorer) ───────────

export interface FunctionFamilyPreset {
  name: string;
  label: string;
  isEquicontinuous: boolean;
  isPointwiseBounded: boolean;
  generateFamily: (seed: number, count: number) => ((x: number) => number)[];
  lipschitzBound: number | null;
}

export function getFunctionFamilyPresets(): FunctionFamilyPreset[] {
  return [
    {
      name: 'equicontinuous-lipschitz',
      label: 'Bounded Lipschitz (equicontinuous)',
      isEquicontinuous: true,
      isPointwiseBounded: true,
      lipschitzBound: 3,
      generateFamily: (seed: number, count: number) => {
        const rng = seededRandom(seed);
        return Array.from({ length: count }, () => {
          // Random linear combo of low-frequency sinusoids with bounded derivatives
          const a0 = (rng() - 0.5) * 2;
          const a1 = (rng() - 0.5) * 1.5;
          const a2 = (rng() - 0.5) * 0.8;
          const phase1 = rng() * Math.PI;
          const phase2 = rng() * Math.PI;
          return (x: number) =>
            a0 + a1 * Math.sin(x + phase1) + a2 * Math.sin(2 * x + phase2);
        });
      },
    },
    {
      name: 'not-equicontinuous',
      label: 'Increasing oscillation (NOT equicontinuous)',
      isEquicontinuous: false,
      isPointwiseBounded: true,
      lipschitzBound: null,
      generateFamily: (seed: number, count: number) => {
        const rng = seededRandom(seed);
        return Array.from({ length: count }, (_, i) => {
          const freq = (i + 1) * 3; // Increasing frequency
          const phase = rng() * Math.PI;
          const amp = 0.8 + rng() * 0.4;
          return (x: number) => amp * Math.sin(freq * x + phase);
        });
      },
    },
  ];
}
