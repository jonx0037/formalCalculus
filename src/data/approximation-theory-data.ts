/**
 * Data presets for the Approximation Theory topic.
 * All functions are pure and deterministic — no Math.random().
 *
 * Builds on fourier-series-data.ts patterns, but works with
 * polynomial approximation on finite intervals [a, b] rather than
 * trigonometric series on the circle.
 *
 * Key difference: Approximation theory presets carry the modulus of
 * continuity ω(f; δ) because Jackson's theorem ties the best
 * polynomial approximation rate directly to smoothness — the finer
 * the continuity, the faster E_n(f) → 0.
 */

import {
  bernsteinPolynomial,
  chebyshevNodes,
  chebyshevPolynomial,
  barycentricWeights,
  barycentricInterpolate,
  equispacedNodes,
} from '../components/viz/shared/series';

// ── Interfaces ─────────────────────────────────────────────

export interface ApproximationPreset {
  name: string;
  label: string;
  f: (x: number) => number;
  domain: [number, number];
  smoothnessClass: 'discontinuous' | 'C0' | 'C1' | 'C2' | 'Cinfty' | 'analytic';
  modulusOfContinuity: (delta: number) => number;
  expectedBernsteinRate: string;
  expectedJacksonRate: string;
  tags: string[];
  mlNote?: string;
}

export interface BernsteinAnalysis {
  presetName: string;
  bernsteinEval: (n: number, x: number) => number;
  maxError: (n: number) => number;
  convergenceRate: string;
}

export interface ChebyshevInterpolation {
  presetName: string;
  maxErrorChebyshev: (n: number) => number;
  maxErrorEquispaced: (n: number) => number;
}

export interface BestApproximation {
  presetName: string;
  l2BestCoeffs: (n: number) => number[];
  l2BestEval: (n: number, x: number) => number;
  /** Chebyshev-based near-minimax approximation */
  uniformBestEval: (n: number, x: number) => number;
  l2Error: (n: number) => number;
  uniformError: (n: number) => number;
}

// ── Gauss-Legendre quadrature (32-point) ───────────────────

/**
 * 32-point Gauss-Legendre nodes and weights on [−1, 1].
 * Exact for polynomials of degree ≤ 63, which gives ~15 digits
 * of accuracy for smooth integrands — far better than the
 * trapezoidal rule with 2000 points.
 */
const GL_NODES_32 = [
  -0.9972638618494816, -0.9856115115452684, -0.9647622555875064, -0.9349060759377397,
  -0.8963211557660521, -0.8493676137325700, -0.7944837959679424, -0.7321821187402897,
  -0.6630442669302152, -0.5877157572407623, -0.5068999089322294, -0.4213512761306353,
  -0.3318686022821276, -0.2392873622521371, -0.1444719615827965, -0.0483076656877383,
  0.0483076656877383, 0.1444719615827965, 0.2392873622521371, 0.3318686022821276,
  0.4213512761306353, 0.5068999089322294, 0.5877157572407623, 0.6630442669302152,
  0.7321821187402897, 0.7944837959679424, 0.8493676137325700, 0.8963211557660521,
  0.9349060759377397, 0.9647622555875064, 0.9856115115452684, 0.9972638618494816,
];

const GL_WEIGHTS_32 = [
  0.0070186100094701, 0.0162743947309057, 0.0253920653092621, 0.0342738629130214,
  0.0428358980222267, 0.0509980592623762, 0.0586840934785355, 0.0658222227763618,
  0.0723457941088485, 0.0781938957870703, 0.0833119242269467, 0.0876520930044038,
  0.0911738786957639, 0.0938443990808046, 0.0956387200792749, 0.0965400885147278,
  0.0965400885147278, 0.0956387200792749, 0.0938443990808046, 0.0911738786957639,
  0.0876520930044038, 0.0833119242269467, 0.0781938957870703, 0.0723457941088485,
  0.0658222227763618, 0.0586840934785355, 0.0509980592623762, 0.0428358980222267,
  0.0342738629130214, 0.0253920653092621, 0.0162743947309057, 0.0070186100094701,
];

// ── Helper: Legendre polynomials on [−1, 1] ────────────────

/** Evaluate P_n(x) via the three-term recurrence */
function legendreP(n: number, x: number): number {
  if (n === 0) return 1;
  if (n === 1) return x;
  let prev2 = 1;
  let prev1 = x;
  for (let k = 2; k <= n; k++) {
    const curr = ((2 * k - 1) * x * prev1 - (k - 1) * prev2) / k;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}

/**
 * Compute the Legendre coefficient ⟨f, P_k⟩ / ‖P_k‖² on [−1, 1]
 * using 32-point Gauss-Legendre quadrature.
 */
function legendreCoefficient(f: (x: number) => number, k: number): number {
  let integral = 0;
  for (let i = 0; i < 32; i++) {
    integral += GL_WEIGHTS_32[i] * f(GL_NODES_32[i]) * legendreP(k, GL_NODES_32[i]);
  }
  // ‖P_k‖² = 2/(2k+1)
  return integral * (2 * k + 1) / 2;
}

// ── Coefficient cache ──────────────────────────────────────

/**
 * Cache Legendre coefficients per (function, maxDegree) to avoid
 * recomputing the expensive quadrature on every evaluation.
 */
const coefficientCache = new Map<(x: number) => number, Map<number, number>>();

function getCachedCoefficients(f: (x: number) => number, n: number): number[] {
  let cache = coefficientCache.get(f);
  if (!cache) {
    cache = new Map();
    coefficientCache.set(f, cache);
  }
  const coeffs: number[] = [];
  for (let k = 0; k <= n; k++) {
    let c = cache.get(k);
    if (c === undefined) {
      c = legendreCoefficient(f, k);
      cache.set(k, c);
    }
    coeffs.push(c);
  }
  return coeffs;
}

/** Evaluate the L² best polynomial at x using cached coefficients */
function evaluateL2Best(f: (x: number) => number, n: number, x: number): number {
  const coeffs = getCachedCoefficients(f, n);
  let result = 0;
  for (let k = 0; k <= n; k++) {
    result += coeffs[k] * legendreP(k, x);
  }
  return result;
}

// ── Chebyshev near-minimax approximation ───────────────────

/**
 * Compute Chebyshev interpolation coefficients for f on [−1, 1].
 * Uses Chebyshev nodes of the first kind and the discrete
 * orthogonality relation to compute coefficients in O(n²).
 *
 * The Chebyshev interpolant is within O(log n) of the true
 * minimax polynomial — much closer than the L² best, and it
 * exhibits near-equioscillation behavior.
 */
function chebyshevCoefficients(f: (x: number) => number, n: number): number[] {
  const nodes = chebyshevNodes(n + 1); // n+1 nodes for degree n
  const fvals = nodes.map(f);
  const coeffs: number[] = [];

  for (let j = 0; j <= n; j++) {
    let sum = 0;
    for (let k = 0; k < n + 1; k++) {
      const theta = ((2 * (k + 1) - 1) * Math.PI) / (2 * (n + 1));
      sum += fvals[k] * Math.cos(j * theta);
    }
    coeffs.push((j === 0 ? 1 : 2) * sum / (n + 1));
  }

  return coeffs;
}

/** Evaluate a Chebyshev expansion Σ c_k T_k(x) using Clenshaw's algorithm */
function evaluateChebyshevExpansion(coeffs: number[], x: number): number {
  const n = coeffs.length - 1;
  if (n < 0) return 0;
  if (n === 0) return coeffs[0];

  // Clenshaw recurrence: b_{k} = 2x b_{k+1} − b_{k+2} + c_k
  let bk1 = 0; // b_{n+1}
  let bk2 = 0; // b_{n+2}
  for (let k = n; k >= 1; k--) {
    const bk = 2 * x * bk1 - bk2 + coeffs[k];
    bk2 = bk1;
    bk1 = bk;
  }
  // Final step: f(x) = x · b_1 − b_2 + c_0
  return x * bk1 - bk2 + coeffs[0];
}

// ── Helper: max error over a fine grid ─────────────────────

function computeMaxError(
  f: (x: number) => number,
  approx: (x: number) => number,
  a: number,
  b: number,
  gridSize = 1000,
): number {
  let maxErr = 0;
  for (let i = 0; i <= gridSize; i++) {
    const x = a + (i * (b - a)) / gridSize;
    maxErr = Math.max(maxErr, Math.abs(f(x) - approx(x)));
  }
  return maxErr;
}

// ── Approximation presets ──────────────────────────────────

/**
 * V-shape: f(x) = |2x − 1| on [0, 1].
 * Continuous but not differentiable at x = 1/2.
 * Lipschitz with constant 2, so ω(f; δ) = 2δ.
 * Bernstein rate: O(1/√n) — the worst case for Lipschitz.
 */
const vShape: ApproximationPreset = {
  name: 'v-shape',
  label: '|2x − 1| — V-shape',
  f: (x: number) => Math.abs(2 * x - 1),
  domain: [0, 1],
  smoothnessClass: 'C0',
  modulusOfContinuity: (delta: number) => 2 * delta,
  expectedBernsteinRate: 'O(1/√n)',
  expectedJacksonRate: 'O(1/n)',
  tags: ['continuous', 'lipschitz', 'non-differentiable', 'v-shape'],
  mlNote: 'ReLU activation is a shifted V-shape — Bernstein approximation of ReLU underlies privacy-preserving inference',
};

/**
 * Smooth parabola: f(x) = x(1 − x) on [0, 1].
 * C^∞, so Bernstein converges faster than the worst-case O(1/√n).
 * For this specific function, B_n(f; x) = x(1−x)(n−1)/n, giving exact
 * error f − B_n = x(1−x)/n, so ‖f − B_n‖_∞ = 1/(4n).
 */
const smoothParabola: ApproximationPreset = {
  name: 'smooth-parabola',
  label: 'x(1 − x) — Smooth parabola',
  f: (x: number) => x * (1 - x),
  domain: [0, 1],
  smoothnessClass: 'Cinfty',
  modulusOfContinuity: (delta: number) => delta,
  expectedBernsteinRate: 'O(1/n)',
  expectedJacksonRate: 'O(1/n²)',
  tags: ['smooth', 'polynomial', 'quadratic'],
  mlNote: 'The parabola x(1−x) is the variance of a Bernoulli(x) trial — Bernstein polynomials arise from the law of large numbers',
};

/**
 * Smooth periodic: f(x) = sin(πx) on [0, 1].
 * Analytic (entire function), so all approximation methods converge
 * exponentially. Bernstein convergence is still only algebraic,
 * but Jackson/Chebyshev give exponential rates.
 */
const smoothPeriodic: ApproximationPreset = {
  name: 'smooth-periodic',
  label: 'sin(πx) — Analytic',
  f: (x: number) => Math.sin(Math.PI * x),
  domain: [0, 1],
  smoothnessClass: 'analytic',
  modulusOfContinuity: (delta: number) => Math.PI * delta,
  expectedBernsteinRate: 'O(1/√n)',
  expectedJacksonRate: 'O(e^{−cn})',
  tags: ['analytic', 'smooth', 'periodic', 'trigonometric'],
};

/**
 * Step function: 𝟙_{[1/2, 1]}(x) on [0, 1].
 * Discontinuous at x = 1/2. Bernstein still converges (pointwise
 * everywhere, uniformly on compact subsets away from x = 1/2),
 * but convergence at the jump is only O(1/√n).
 */
const stepFunction: ApproximationPreset = {
  name: 'step-function',
  label: '𝟙_{[1/2,1]} — Step function',
  f: (x: number) => (x >= 0.5 ? 1 : 0),
  domain: [0, 1],
  smoothnessClass: 'discontinuous',
  modulusOfContinuity: (delta: number) => (delta > 0 ? 1 : 0),
  expectedBernsteinRate: 'O(1/√n)',
  expectedJacksonRate: 'O(1) — no decay',
  tags: ['discontinuous', 'step', 'indicator'],
  mlNote: 'Binary classifiers produce step-function decision boundaries — polynomial smoothing is the price of differentiable approximation',
};

/**
 * Runge-like: f(x) = 1/(1 + 16(x − 1/2)²) on [0, 1].
 * Analytic on [0,1] but has poles in the complex plane at
 * x = 1/2 ± i/4, which limits the convergence of equispaced
 * polynomial interpolation (the Runge phenomenon).
 */
const rungeLike: ApproximationPreset = {
  name: 'runge-like',
  label: '1/(1 + 16(x−½)²) — Runge-like',
  f: (x: number) => 1 / (1 + 16 * (x - 0.5) ** 2),
  domain: [0, 1],
  smoothnessClass: 'analytic',
  modulusOfContinuity: (delta: number) => 8 * delta,
  expectedBernsteinRate: 'O(1/√n)',
  expectedJacksonRate: 'O(e^{−cn})',
  tags: ['analytic', 'runge', 'rational', 'bell-curve'],
  mlNote: 'RBF kernels produce Runge-like bumps — interpolation node placement matters for kernel regression stability',
};

const allPresets = [vShape, smoothParabola, smoothPeriodic, stepFunction, rungeLike];

// ── Accessor functions ─────────────────────────────────────

export function getApproximationPresets(): ApproximationPreset[] {
  return [...allPresets];
}

// ── Bernstein analyses ─────────────────────────────────────

export function getBernsteinAnalyses(): BernsteinAnalysis[] {
  return allPresets.map((preset) => {
    const [a, b] = preset.domain;
    const g = (t: number) => preset.f(a + t * (b - a));

    return {
      presetName: preset.name,
      bernsteinEval: (n: number, x: number) => {
        const t = (x - a) / (b - a);
        return bernsteinPolynomial(g, n, t);
      },
      maxError: (n: number) => {
        return computeMaxError(
          preset.f,
          (x) => bernsteinPolynomial(g, (x - a) / (b - a), n),
          a,
          b,
        );
      },
      convergenceRate: preset.expectedBernsteinRate,
    };
  });
}

// ── Chebyshev interpolation analyses ───────────────────────

export function getChebyshevInterpolations(): ChebyshevInterpolation[] {
  const chebyshevPresets: { name: string; f: (x: number) => number }[] = [
    { name: 'runge', f: (x) => 1 / (1 + 25 * x * x) },
    { name: 'abs-x', f: (x) => Math.abs(x) },
    { name: 'sign-x-squared', f: (x) => Math.sign(x) * x * x },
  ];

  return chebyshevPresets.map((preset) => ({
    presetName: preset.name,
    maxErrorChebyshev: (n: number) => {
      const nodes = chebyshevNodes(n);
      const weights = barycentricWeights(nodes);
      const fvals = nodes.map(preset.f);
      return computeMaxError(
        preset.f,
        (x) => barycentricInterpolate(nodes, weights, fvals, x),
        -1,
        1,
        2000,
      );
    },
    maxErrorEquispaced: (n: number) => {
      const nodes = equispacedNodes(n, -1, 1);
      const weights = barycentricWeights(nodes);
      const fvals = nodes.map(preset.f);
      return computeMaxError(
        preset.f,
        (x) => barycentricInterpolate(nodes, weights, fvals, x),
        -1,
        1,
        2000,
      );
    },
  }));
}

// ── Best approximation analyses ────────────────────────────

/**
 * Build L² and Chebyshev (near-minimax) best approximation data.
 *
 * L² best: orthogonal projection onto Legendre polynomials.
 * Uniform best: Chebyshev interpolation at Chebyshev nodes, which
 * is within O(log n) of the true minimax polynomial and produces
 * visibly different curves from the L² projection.
 */
export function getBestApproximations(): BestApproximation[] {
  const presets: { name: string; f: (x: number) => number }[] = [
    { name: 'abs-x', f: (x) => Math.abs(x) },
    { name: 'exp-x', f: (x) => Math.exp(x) },
  ];

  return presets.map(({ name, f }) => ({
    presetName: name,
    l2BestCoeffs: (n: number) => getCachedCoefficients(f, n),
    l2BestEval: (n: number, x: number) => evaluateL2Best(f, n, x),
    uniformBestEval: (n: number, x: number) => {
      const coeffs = chebyshevCoefficients(f, n);
      return evaluateChebyshevExpansion(coeffs, x);
    },
    l2Error: (n: number) => {
      // L² error via Gauss-Legendre quadrature
      let integral = 0;
      for (let i = 0; i < 32; i++) {
        const x = GL_NODES_32[i];
        const diff = f(x) - evaluateL2Best(f, n, x);
        integral += GL_WEIGHTS_32[i] * diff * diff;
      }
      return Math.sqrt(integral);
    },
    uniformError: (n: number) => {
      const coeffs = chebyshevCoefficients(f, n);
      return computeMaxError(
        f,
        (x) => evaluateChebyshevExpansion(coeffs, x),
        -1,
        1,
        2000,
      );
    },
  }));
}
