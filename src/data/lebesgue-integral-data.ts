/**
 * Data presets and constructive utilities for the Lebesgue Integral topic (Topic 26).
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides typed helpers for the four interactive visualizations:
 *  - LebesgueIntegralBuilder      — dyadic simple-function approximation of ∫ f dμ
 *  - MonotoneConvergenceExplorer  — three monotone-convergence sequence types
 *  - DominatedConvergenceExplorer — three DCT scenarios (two success, one failure)
 *  - FubiniProductIntegralExplorer — three Fubini scenarios (two integrable, one not)
 *
 * Shared types and the simple-function approximation helper come from
 * src/components/viz/shared/measure.ts. Numerical integration uses the Simpson
 * and adaptive-quadrature helpers from src/components/viz/shared/integration.ts.
 */

import {
  type SimpleFunctionApproximation,
  getSimpleFunctionApproximation,
} from '../components/viz/shared/measure';
import { adaptiveQuadrature } from '../components/viz/shared/integration';

// ── Interfaces ─────────────────────────────────────────────

/** A step in building the Lebesgue integral via simple-function supremum. */
export interface IntegralBuildStep {
  /** Number of dyadic levels (so 2^nLevels actual steps). */
  nLevels: number;
  /** The simple-function approximation s_n at this level. */
  approximation: SimpleFunctionApproximation;
  /** The integral ∫ s_n dμ. */
  integralApprox: number;
  /** The exact integral ∫ f dμ (when known) or NaN. */
  integralExact: number;
  /** |∫ s_n - ∫ f|, or NaN if exact integral is unknown. */
  error: number;
}

/** A sequence of functions for convergence-theorem visualization. */
export interface ConvergenceSequence {
  /** Short identifier (e.g. "truncation", "riemann-lebesgue"). */
  name: string;
  /** Reader-facing description. */
  description: string;
  /** Evaluate f_n(x). */
  fn: (x: number, n: number) => number;
  /** The pointwise limit f(x). */
  limit: (x: number) => number;
  /** The dominating function g(x), or null if no integrable dominator exists. */
  dominator: ((x: number) => number) | null;
  /** ∫ f_n dμ as a function of n (numerically computed or closed form). */
  integralOfFn: (n: number) => number;
  /** ∫ f dμ — the integral of the pointwise limit. */
  integralOfLimit: number;
  /** Domain [a, b] for plotting and integration. */
  domain: [number, number];
  /** Whether the DCT applies to this sequence (true if dominator exists and is integrable). */
  dctApplies: boolean;
}

/** Data for a Fubini-Tonelli scenario on [0, 1]^2. */
export interface FubiniScenario {
  name: string;
  description: string;
  /** The function f: [0,1]^2 → ℝ. */
  f: (x: number, y: number) => number;
  /** ∫∫ f dx dy — integrate x first, then y. null if it does not exist. */
  iteratedXY: number | null;
  /** ∫∫ f dy dx — integrate y first, then x. null if it does not exist. */
  iteratedYX: number | null;
  /** ∫ f d(λ × λ) — the product integral. null if f is not integrable in |·|. */
  productIntegral: number | null;
  /** Whether ∫ |f| d(λ × λ) < ∞ (the integrability hypothesis of Fubini). */
  integrable: boolean;
}

// ── Preset functions for the integral builder ──────────────

/** Named preset functions for LebesgueIntegralBuilder. */
export interface IntegralPreset {
  name: string;
  label: string;
  /** The target function f, assumed non-negative on its domain. */
  f: (x: number) => number;
  /** Domain [a, b]. The current viz uses [0, 1]. */
  domain: [number, number];
  /** Closed-form value of ∫_domain f dλ. */
  exactIntegral: number;
  /** Maximum value of f on the domain (for dyadic range slicing). */
  maxValue: number;
  description: string;
}

/**
 * Four preset functions for the integral-builder visualization.
 *
 * The unbounded x^(-1/2) preset uses a finite maxValue cap (the dyadic
 * approximation will undershoot near the singularity at x = 0, which is
 * itself pedagogically useful — it shows how the simple-function supremum
 * "chases" an unbounded integrand from below).
 */
export function getIntegralPresets(): IntegralPreset[] {
  return [
    {
      name: 'sin-pi-x',
      label: 'sin(πx)',
      f: (x) => Math.sin(Math.PI * x),
      domain: [0, 1],
      exactIntegral: 2 / Math.PI,
      maxValue: 1,
      description:
        'The half-cycle of a sine wave on [0, 1]. Exact integral 2/π ≈ 0.6366.',
    },
    {
      name: 'x-squared',
      label: 'x²',
      f: (x) => x * x,
      domain: [0, 1],
      exactIntegral: 1 / 3,
      maxValue: 1,
      description: 'A simple polynomial on [0, 1]. Exact integral 1/3.',
    },
    {
      name: 'exp-x-minus-1',
      label: 'eˣ − 1',
      f: (x) => Math.exp(x) - 1,
      domain: [0, 1],
      exactIntegral: Math.E - 2,
      maxValue: Math.E - 1,
      description: 'A convex exponential on [0, 1]. Exact integral e − 2 ≈ 0.7183.',
    },
    {
      name: 'inverse-sqrt',
      label: 'x^(−1/2)',
      f: (x) => (x < 1e-6 ? 1e3 : 1 / Math.sqrt(x)),
      domain: [0, 1],
      exactIntegral: 2,
      maxValue: 20,
      description:
        'Unbounded near 0 but Lebesgue-integrable. Exact integral 2. The dyadic ' +
        'approximation under-shoots near the singularity — that lag is the whole ' +
        'point of the supremum-from-below construction.',
    },
  ];
}

// ── Lebesgue integral build sequence ───────────────────────

/**
 * Generate a sequence of dyadic simple-function approximations of f at
 * refinement levels n = 1, 2, ..., maxLevels. Each step contains the
 * approximation, its integral value, and the error vs. the exact integral.
 *
 * Used by LebesgueIntegralBuilder to visualize the supremum construction
 * ∫ f dμ = sup { ∫ s dμ : s simple, 0 ≤ s ≤ f }.
 *
 * @param f — target function (assumed non-negative on the domain)
 * @param maxLevels — maximum dyadic refinement level (so 2^maxLevels steps)
 * @param domain — [a, b]; the current viz uses [0, 1]
 * @param exactIntegral — closed-form value of ∫ f for error computation
 * @param maxVal — upper bound of the value range to slice
 */
export function getLebesgueIntegralSequence(
  f: (x: number) => number,
  maxLevels: number,
  domain: [number, number],
  exactIntegral: number,
  maxVal: number,
): IntegralBuildStep[] {
  // The shared getSimpleFunctionApproximation is defined on [0, 1]; for now
  // we mirror that. Topic 27 may generalize the helper to arbitrary domains.
  const [a, b] = domain;
  if (a !== 0 || b !== 1) {
    throw new Error(
      `getLebesgueIntegralSequence currently requires domain [0, 1], got [${a}, ${b}]`,
    );
  }

  const steps: IntegralBuildStep[] = [];
  for (let n = 1; n <= maxLevels; n++) {
    const approximation = getSimpleFunctionApproximation(f, n, maxVal, exactIntegral);
    const integralApprox = approximation.integralApprox;
    const error = Number.isFinite(exactIntegral)
      ? Math.abs(integralApprox - exactIntegral)
      : NaN;
    steps.push({
      nLevels: n,
      approximation,
      integralApprox,
      integralExact: exactIntegral,
      error,
    });
  }
  return steps;
}

// ── Monotone convergence sequences ─────────────────────────

/** Standard target function for the truncation sequence: f(x) = 1/√x on (0, 1]. */
const TRUNCATION_TARGET: (x: number) => number = (x) =>
  x < 1e-6 ? 1e3 : 1 / Math.sqrt(x);

/** Standard target function for the expanding-support sequence: f(x) = e^(-|x|/2) on ℝ. */
const EXPANDING_TARGET: (x: number) => number = (x) => Math.exp(-Math.abs(x) / 2);

/** Standard target function for the dyadic-simple sequence: f(x) = x(1−x) · 4 on [0, 1]. */
const DYADIC_TARGET: (x: number) => number = (x) => 4 * x * (1 - x);

/**
 * Build a monotone-convergence sequence (f_n) ↑ f for visualization.
 *
 * Three types per the brief:
 *  - 'truncation'         : f_n(x) = min(f(x), n)             with f = 1/√x on (0, 1]
 *  - 'expanding-support'  : f_n(x) = f(x) · 1_{[-n, n]}(x)    with f = e^(-|x|/2) on ℝ
 *  - 'dyadic-simple'      : f_n is the dyadic simple-function staircase of f
 *                           with f = 4x(1-x) on [0, 1]
 *
 * Each sequence satisfies f_n ≤ f_{n+1} (a.e.) and f_n → f pointwise (a.e.),
 * so MCT applies and ∫ f_n → ∫ f.
 */
export function getMonotoneSequence(
  type: 'truncation' | 'expanding-support' | 'dyadic-simple',
): ConvergenceSequence {
  if (type === 'truncation') {
    const f = TRUNCATION_TARGET;
    const fn = (x: number, n: number) => Math.min(f(x), n);
    const integralOfLimit = 2; // ∫₀¹ x^(-1/2) dx = 2
    return {
      name: 'truncation',
      description:
        'Truncate f(x) = 1/√x at height n. As n → ∞ the cap rises and f_n ↑ f. ' +
        'The integrals climb from a small value toward 2 = ∫ f.',
      fn,
      limit: f,
      dominator: null, // f itself is the supremum but is "dominator-free" in the usual sense
      integralOfFn: (n) => {
        // ∫₀¹ min(1/√x, n) dx = (analytical) integrate min(1/√x, n) over [0, 1]:
        //   for x ∈ [0, 1/n²] the integrand is n; for x ∈ [1/n², 1] it is 1/√x.
        //   ∫₀^(1/n²) n dx = n · 1/n² = 1/n
        //   ∫_(1/n²)^1 x^(-1/2) dx = [2√x] from 1/n² to 1 = 2 − 2/n
        //   total = 1/n + 2 − 2/n = 2 − 1/n
        return 2 - 1 / n;
      },
      integralOfLimit,
      domain: [0, 1],
      dctApplies: false,
    };
  }

  if (type === 'expanding-support') {
    const f = EXPANDING_TARGET;
    const fn = (x: number, n: number) =>
      Math.abs(x) <= n ? f(x) : 0;
    const integralOfLimit = 4; // ∫_ℝ e^(-|x|/2) dx = 2 · ∫₀^∞ e^(-x/2) dx = 2 · 2 = 4
    return {
      name: 'expanding-support',
      description:
        'Restrict f(x) = e^(−|x|/2) to the window [−n, n] and extend by zero outside. ' +
        'As n → ∞ the window covers all of ℝ and f_n ↑ f. The integrals climb toward 4 = ∫ f.',
      fn,
      limit: f,
      dominator: f, // f itself dominates each f_n
      integralOfFn: (n) => {
        // ∫_{-n}^n e^(-|x|/2) dx = 2 ∫₀^n e^(-x/2) dx = 2 · 2 (1 − e^(-n/2)) = 4 (1 − e^(-n/2))
        return 4 * (1 - Math.exp(-n / 2));
      },
      integralOfLimit,
      domain: [-15, 15],
      dctApplies: true,
    };
  }

  // type === 'dyadic-simple'
  const f = DYADIC_TARGET;
  const integralOfLimit = 2 / 3; // ∫₀¹ 4x(1-x) dx = 4·(1/2 - 1/3) = 4·(1/6) = 2/3
  return {
    name: 'dyadic-simple',
    description:
      'The dyadic simple-function approximation s_n of f(x) = 4x(1−x). At each level the ' +
      'staircase gets twice as fine and the integral climbs toward 2/3 = ∫ f.',
    fn: (x: number, n: number) => {
      // n here is the dyadic level; f_n(x) = floor(f(x) · 2^n / maxVal) · maxVal / 2^n
      const maxVal = 1;
      const numSteps = Math.pow(2, n);
      const step = maxVal / numSteps;
      const fx = f(x);
      const level = Math.max(0, Math.min(Math.floor(fx / step), numSteps - 1));
      return level * step;
    },
    limit: f,
    dominator: f,
    integralOfFn: (n) => {
      // Numerically integrate the staircase via Simpson on a fine grid.
      const maxVal = 1;
      const fnAtN = (x: number) => {
        const numSteps = Math.pow(2, n);
        const step = maxVal / numSteps;
        const fx = f(x);
        const level = Math.max(0, Math.min(Math.floor(fx / step), numSteps - 1));
        return level * step;
      };
      return adaptiveQuadrature(fnAtN, 0, 1, 1e-6, 14).value;
    },
    integralOfLimit,
    domain: [0, 1],
    dctApplies: true,
  };
}

// ── DCT scenarios ──────────────────────────────────────────

/**
 * Get a Dominated Convergence Theorem scenario.
 *
 * Three scenarios:
 *
 *  - 'riemann-lebesgue' (DCT succeeds):
 *      f_n(x) = sin(nx) / (1 + x²) on [0, 20]
 *      g(x)   = 1 / (1 + x²)        — integrable, |f_n| ≤ g
 *      limit  f(x) = 0
 *      ∫ f_n → 0 by the Riemann-Lebesgue lemma.
 *
 *  - 'cosine-decay' (DCT succeeds):
 *      f_n(x) = cos(x/n) · e^(-x) on [0, 20]
 *      g(x)   = e^(-x)             — integrable, |f_n| ≤ g
 *      limit  f(x) = e^(-x)
 *      ∫ f_n = n²/(n² + 1) → 1 = ∫ f.
 *
 *      NOTE on the brief's original 'exponential-decay' scenario:
 *      The brief specified f_n(x) = x^n/n! · e^(-x) dominated by g(x) = e^(-x/2)
 *      on [0, ∞). This is a DCT-failure scenario in disguise: Σ x^n/n! · e^(-x)
 *      = 1 (so each ∫ f_n = 1 — the integrals never converge to anything but 1),
 *      and no constant multiple of e^(-x/2) can dominate f_n at its peak x = n
 *      where f_n(n) ≈ 1/√(2πn) decays only as 1/√n while e^(-n/2) decays
 *      exponentially. We swapped to cos(x/n) · e^(-x), which has a clean
 *      uniform dominator, a non-trivial pointwise limit, and a closed-form
 *      integral that is visibly approaching the limit value.
 *
 *  - 'no-dominator' (DCT fails):
 *      f_n(x) = n · 1_{[0, 1/n]}(x) on [0, 1]
 *      No integrable dominator exists.
 *      limit  f(x) = 0
 *      ∫ f_n = 1 for every n, so ∫ f_n ↛ ∫ f = 0.
 */
export function getDCTScenario(
  scenario: 'riemann-lebesgue' | 'cosine-decay' | 'no-dominator',
): ConvergenceSequence {
  if (scenario === 'riemann-lebesgue') {
    const fn = (x: number, n: number) => Math.sin(n * x) / (1 + x * x);
    const g = (x: number) => 1 / (1 + x * x);
    return {
      name: 'riemann-lebesgue',
      description:
        'f_n(x) = sin(nx) / (1 + x²). The oscillation frequency rises with n. ' +
        'Pointwise limit is 0 (the oscillations cancel as n → ∞). ' +
        'Dominator g(x) = 1 / (1 + x²) is integrable. DCT applies, and ' +
        '∫ f_n → 0 = ∫ f by the Riemann-Lebesgue lemma.',
      fn,
      limit: () => 0,
      dominator: g,
      integralOfFn: (n) =>
        adaptiveQuadrature((x) => fn(x, n), 0, 20, 1e-6, 16).value,
      integralOfLimit: 0,
      domain: [0, 20],
      dctApplies: true,
    };
  }

  if (scenario === 'cosine-decay') {
    const fn = (x: number, n: number) => Math.cos(x / n) * Math.exp(-x);
    const g = (x: number) => Math.exp(-x);
    return {
      name: 'cosine-decay',
      description:
        'f_n(x) = cos(x/n) · e^(−x) on [0, ∞). As n → ∞ the cosine flattens to 1, ' +
        'so f_n converges pointwise to e^(−x). Dominator g(x) = e^(−x) is integrable ' +
        'and bounds every |f_n|. DCT applies, and ∫ f_n = n²/(n² + 1) → 1 = ∫ e^(−x) dx.',
      fn,
      limit: (x) => Math.exp(-x),
      dominator: g,
      // Closed form: ∫₀^∞ e^(-x) cos(x/n) dx = 1 / (1 + 1/n²) = n² / (n² + 1)
      integralOfFn: (n) => (n * n) / (n * n + 1),
      integralOfLimit: 1,
      domain: [0, 20],
      dctApplies: true,
    };
  }

  // scenario === 'no-dominator'
  const fn = (x: number, n: number) => (x >= 0 && x <= 1 / n ? n : 0);
  return {
    name: 'no-dominator',
    description:
      'f_n(x) = n · 1_{[0, 1/n]}(x). A spike of height n and width 1/n. ' +
      'Pointwise limit is 0 (for any fixed x > 0, eventually 1/n < x and f_n(x) = 0). ' +
      'But ∫ f_n = 1 for every n. There is no integrable dominator (any g must satisfy ' +
      'g ≥ n on [0, 1/n] for every n, forcing g(0+) = ∞ in a non-integrable way). ' +
      'DCT does not apply, and ∫ f_n ↛ ∫ f.',
    fn,
    limit: () => 0,
    dominator: null,
    // Hard-coded: ∫ n · 1_{[0,1/n]} dx = n · (1/n) = 1, exactly, for every n ≥ 1.
    integralOfFn: () => 1,
    integralOfLimit: 0,
    domain: [0, 1],
    dctApplies: false,
  };
}

// ── Fubini-Tonelli scenarios ───────────────────────────────

/**
 * Get a Fubini-Tonelli scenario on [0, 1]^2.
 *
 * Three scenarios:
 *
 *  - 'smooth-xy'   : f(x, y) = xy. Integrable; all three integrals = 1/4.
 *
 *  - 'separable-exp': f(x, y) = e^(−(x + y)). Separable, integrable;
 *                     all three integrals = (1 − 1/e)² ≈ 0.3996.
 *
 *  - 'pathological': f(x, y) = (x² − y²) / (x² + y²)². Not |·|-integrable on
 *                    [0, 1]^2; the iterated integrals exist as improper integrals
 *                    but disagree (π/4 vs −π/4), and the product integral is
 *                    not defined. This shows that Fubini's integrability
 *                    hypothesis is essential.
 */
export function getFubiniData(
  scenario: 'smooth-xy' | 'separable-exp' | 'pathological',
): FubiniScenario {
  if (scenario === 'smooth-xy') {
    return {
      name: 'smooth-xy',
      description:
        'f(x, y) = xy on [0, 1]². Smooth and integrable. All three integrals agree at 1/4.',
      f: (x, y) => x * y,
      iteratedXY: 1 / 4,
      iteratedYX: 1 / 4,
      productIntegral: 1 / 4,
      integrable: true,
    };
  }

  if (scenario === 'separable-exp') {
    const exact = (1 - 1 / Math.E) * (1 - 1 / Math.E);
    return {
      name: 'separable-exp',
      description:
        'f(x, y) = e^(−(x + y)) on [0, 1]². Separable: f(x, y) = e^(−x) · e^(−y), so ' +
        'the product integral factors as (∫₀¹ e^(−x) dx)² = (1 − 1/e)² ≈ 0.3996.',
      f: (x, y) => Math.exp(-(x + y)),
      iteratedXY: exact,
      iteratedYX: exact,
      productIntegral: exact,
      integrable: true,
    };
  }

  // scenario === 'pathological'
  return {
    name: 'pathological',
    description:
      'f(x, y) = (x² − y²) / (x² + y²)² on [0, 1]². Not absolutely integrable: ' +
      '∫∫ |f| d(λ × λ) = ∞. The two iterated integrals exist as improper integrals ' +
      'but disagree: ∫₀¹ (∫₀¹ f dy) dx = π/4 and ∫₀¹ (∫₀¹ f dx) dy = −π/4. The product ' +
      'integral is not defined. Fubini\'s integrability hypothesis fails.',
    f: (x, y) => {
      const denom = (x * x + y * y) * (x * x + y * y);
      return denom < 1e-12 ? 0 : (x * x - y * y) / denom;
    },
    iteratedXY: Math.PI / 4,
    iteratedYX: -Math.PI / 4,
    productIntegral: null,
    integrable: false,
  };
}
