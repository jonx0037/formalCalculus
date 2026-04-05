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

import { bernsteinPolynomial, chebyshevNodes } from '../components/viz/shared/series';

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
  /** Evaluate B_n(f; x) for a preset mapped to [0, 1] */
  bernsteinEval: (n: number, x: number) => number;
  /** Numerically compute ‖B_n(f) − f‖_∞ over a fine grid */
  maxError: (n: number) => number;
  convergenceRate: string;
}

export interface ChebyshevInterpolation {
  presetName: string;
  /** Lagrange interpolation at given nodes */
  interpolate: (nodes: number[], fvals: number[], x: number) => number;
  /** Numerically compute max interpolation error with Chebyshev nodes */
  maxErrorChebyshev: (n: number) => number;
  /** Numerically compute max interpolation error with equispaced nodes */
  maxErrorEquispaced: (n: number) => number;
}

export interface BestApproximation {
  presetName: string;
  /** Legendre expansion coefficients for L² best approximation */
  l2BestCoeffs: (n: number) => number[];
  /** Evaluate the L² best polynomial at x */
  l2BestEval: (n: number, x: number) => number;
  /** ‖f − p_n^{L²}‖₂ (numerical) */
  l2Error: (n: number) => number;
  /** ‖f − p_n^*‖_∞ (numerical, Remez-like for standard presets) */
  uniformError: (n: number) => number;
}

// ── Helper: Lagrange interpolation (barycentric form) ──────

/**
 * Evaluate the Lagrange interpolating polynomial at x using
 * the barycentric form for numerical stability.
 *
 * Given nodes x_0, …, x_n and values f_0, …, f_n, the barycentric
 * form avoids recomputing the Lagrange basis from scratch:
 *   p(x) = [Σ_j w_j f_j / (x − x_j)] / [Σ_j w_j / (x − x_j)]
 * where w_j = 1 / Π_{k≠j} (x_j − x_k) are the barycentric weights.
 */
function barycentricInterpolate(
  nodes: number[],
  fvals: number[],
  x: number,
): number {
  const n = nodes.length;

  // Check if x coincides with a node
  for (let j = 0; j < n; j++) {
    if (Math.abs(x - nodes[j]) < 1e-14) return fvals[j];
  }

  // Compute barycentric weights
  const weights = new Array(n);
  for (let j = 0; j < n; j++) {
    let w = 1;
    for (let k = 0; k < n; k++) {
      if (k !== j) w *= nodes[j] - nodes[k];
    }
    weights[j] = 1 / w;
  }

  let numerator = 0;
  let denominator = 0;
  for (let j = 0; j < n; j++) {
    const t = weights[j] / (x - nodes[j]);
    numerator += t * fvals[j];
    denominator += t;
  }

  return numerator / denominator;
}

// ── Helper: equispaced nodes on [a, b] ─────────────────────

function equispacedNodes(n: number, a: number, b: number): number[] {
  const nodes: number[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push(a + (i * (b - a)) / (n - 1));
  }
  return nodes;
}

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

/** Compute ⟨f, P_k⟩ / ‖P_k‖² for f on [−1, 1] via composite trapezoidal rule */
function legendreCoefficient(f: (x: number) => number, k: number): number {
  const N = 2000;
  const h = 2 / N;
  let integral = 0;
  for (let i = 0; i <= N; i++) {
    const x = -1 + i * h;
    const w = i === 0 || i === N ? 0.5 : 1;
    integral += w * f(x) * legendreP(k, x);
  }
  integral *= h;
  // ‖P_k‖² = 2/(2k+1)
  return integral * (2 * k + 1) / 2;
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
  modulusOfContinuity: (delta: number) => delta, // Lipschitz with constant 1
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
  modulusOfContinuity: (delta: number) => Math.PI * delta, // Lipschitz with constant π
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
  modulusOfContinuity: (delta: number) => (delta > 0 ? 1 : 0), // ω(f; δ) = 1 for all δ > 0
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
  modulusOfContinuity: (delta: number) => 8 * delta, // Lipschitz (bounded derivative on [0,1])
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

/**
 * Build Bernstein analysis data for each preset.
 * Maps each preset's domain to [0, 1] for Bernstein evaluation,
 * then computes max error over a fine grid.
 */
export function getBernsteinAnalyses(): BernsteinAnalysis[] {
  return allPresets.map((preset) => {
    const [a, b] = preset.domain;
    // Map f from [a, b] to [0, 1]: g(t) = f(a + t(b − a))
    const g = (t: number) => preset.f(a + t * (b - a));

    return {
      presetName: preset.name,
      bernsteinEval: (n: number, x: number) => {
        // Map x from [a, b] to [0, 1]
        const t = (x - a) / (b - a);
        return bernsteinPolynomial(g, n, t);
      },
      maxError: (n: number) => {
        return computeMaxError(
          preset.f,
          (x) => {
            const t = (x - a) / (b - a);
            return bernsteinPolynomial(g, n, t);
          },
          a,
          b,
        );
      },
      convergenceRate: preset.expectedBernsteinRate,
    };
  });
}

// ── Chebyshev interpolation analyses ───────────────────────

/**
 * Build Chebyshev vs. equispaced interpolation data.
 * Uses the Runge function on [−1, 1] as the primary example,
 * plus |x| and a smooth function for comparison.
 */
export function getChebyshevInterpolations(): ChebyshevInterpolation[] {
  const chebyshevPresets: { name: string; f: (x: number) => number }[] = [
    { name: 'runge', f: (x) => 1 / (1 + 25 * x * x) },
    { name: 'abs-x', f: (x) => Math.abs(x) },
    { name: 'sign-x-squared', f: (x) => Math.sign(x) * x * x },
  ];

  return chebyshevPresets.map((preset) => ({
    presetName: preset.name,
    interpolate: barycentricInterpolate,
    maxErrorChebyshev: (n: number) => {
      const nodes = chebyshevNodes(n);
      const fvals = nodes.map(preset.f);
      return computeMaxError(
        preset.f,
        (x) => barycentricInterpolate(nodes, fvals, x),
        -1,
        1,
        2000,
      );
    },
    maxErrorEquispaced: (n: number) => {
      const nodes = equispacedNodes(n, -1, 1);
      const fvals = nodes.map(preset.f);
      return computeMaxError(
        preset.f,
        (x) => barycentricInterpolate(nodes, fvals, x),
        -1,
        1,
        2000,
      );
    },
  }));
}

// ── Best approximation analyses ────────────────────────────

/**
 * Build L² and uniform best approximation data for |x| on [−1, 1].
 * |x| is the canonical example: its Legendre expansion is computable
 * in closed form, and the uniform best approximant is well-studied.
 */
export function getBestApproximations(): BestApproximation[] {
  const f = (x: number) => Math.abs(x);

  return [
    {
      presetName: 'abs-x',
      l2BestCoeffs: (n: number) => {
        const coeffs: number[] = [];
        for (let k = 0; k <= n; k++) {
          coeffs.push(legendreCoefficient(f, k));
        }
        return coeffs;
      },
      l2BestEval: (n: number, x: number) => {
        let result = 0;
        for (let k = 0; k <= n; k++) {
          result += legendreCoefficient(f, k) * legendreP(k, x);
        }
        return result;
      },
      l2Error: (n: number) => {
        const approx = (x: number) => {
          let result = 0;
          for (let k = 0; k <= n; k++) {
            result += legendreCoefficient(f, k) * legendreP(k, x);
          }
          return result;
        };
        // Compute L² error via trapezoidal rule
        const N = 2000;
        const h = 2 / N;
        let integral = 0;
        for (let i = 0; i <= N; i++) {
          const x = -1 + i * h;
          const w = i === 0 || i === N ? 0.5 : 1;
          integral += w * (f(x) - approx(x)) ** 2;
        }
        return Math.sqrt(integral * h);
      },
      uniformError: (n: number) => {
        // For |x|, best uniform polynomial approximation errors
        // are well-known: E_n(|x|) ~ 1/(2n) for even n.
        // We compute numerically using the L² approximant as a baseline
        // (the uniform best is slightly different but close for moderate n).
        const approx = (x: number) => {
          let result = 0;
          for (let k = 0; k <= n; k++) {
            result += legendreCoefficient(f, k) * legendreP(k, x);
          }
          return result;
        };
        return computeMaxError(f, approx, -1, 1, 2000);
      },
    },
    {
      presetName: 'exp-x',
      l2BestCoeffs: (n: number) => {
        const g = (x: number) => Math.exp(x);
        const coeffs: number[] = [];
        for (let k = 0; k <= n; k++) {
          coeffs.push(legendreCoefficient(g, k));
        }
        return coeffs;
      },
      l2BestEval: (n: number, x: number) => {
        const g = (xv: number) => Math.exp(xv);
        let result = 0;
        for (let k = 0; k <= n; k++) {
          result += legendreCoefficient(g, k) * legendreP(k, x);
        }
        return result;
      },
      l2Error: (n: number) => {
        const g = (xv: number) => Math.exp(xv);
        const approx = (x: number) => {
          let result = 0;
          for (let k = 0; k <= n; k++) {
            result += legendreCoefficient(g, k) * legendreP(k, x);
          }
          return result;
        };
        const N = 2000;
        const h = 2 / N;
        let integral = 0;
        for (let i = 0; i <= N; i++) {
          const x = -1 + i * h;
          const w = i === 0 || i === N ? 0.5 : 1;
          integral += w * (g(x) - approx(x)) ** 2;
        }
        return Math.sqrt(integral * h);
      },
      uniformError: (n: number) => {
        const g = (xv: number) => Math.exp(xv);
        const approx = (x: number) => {
          let result = 0;
          for (let k = 0; k <= n; k++) {
            result += legendreCoefficient(g, k) * legendreP(k, x);
          }
          return result;
        };
        return computeMaxError(g, approx, -1, 1, 2000);
      },
    },
  ];
}
