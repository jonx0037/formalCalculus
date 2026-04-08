/**
 * Shared utility module for measure theory and Lebesgue integration.
 * Created by Topic 26 (lebesgue-integral); extended by Topic 27 (lp-spaces).
 * Will be extended further by Topic 28 (radon-nikodym).
 *
 * Provides:
 *  - MeasureInterval, SimpleFunctionStep, SimpleFunctionApproximation types
 *    (migrated from sigma-algebras-data.ts; re-exported there for backward compat)
 *  - getSimpleFunctionApproximation: dyadic simple-function approximation
 *  - checkDomination: numerical verification of |f_n| ≤ g for the DCT hypothesis
 *  - LpNormResult, HolderCheckResult types (Topic 27)
 *  - computeLpNorm, checkHolder, checkMinkowski (Topic 27)
 *
 * All functions are pure and deterministic — no Math.random().
 */

import { adaptiveQuadrature } from './integration';

// ── Interfaces ─────────────────────────────────────────────

/** A closed interval [a, b] on the real line. */
export interface MeasureInterval {
  a: number;
  b: number;
}

/** A single step of a simple function: s = c_k on the measurable set A_k. */
export interface SimpleFunctionStep {
  /** The constant value c_k that the simple function takes on A_k. */
  level: number;
  /** A_k — the measurable set where s = c_k, as a finite union of intervals. */
  preimageSet: MeasureInterval[];
  /** λ(A_k) — the Lebesgue measure of the preimage set. */
  measure: number;
}

/** A dyadic simple-function approximation s = Σ c_k · 1_{A_k} of a target f. */
export interface SimpleFunctionApproximation {
  steps: SimpleFunctionStep[];
  /** Σ c_k · λ(A_k) — the integral of the simple function. */
  integralApprox: number;
  /** The exact integral of the target function (when known) or NaN. */
  integralExact: number;
  /** Number of dyadic levels used (so 2^nLevels actual steps). */
  nLevels: number;
}

// ── Dyadic simple-function approximation ───────────────────

/**
 * Build the dyadic simple-function approximation s_n of a non-negative target f
 * on [0, 1]. The construction (Theorem 5 in Topic 25) partitions the *range*
 * [0, maxVal] into 2^nLevels levels of width step = maxVal / 2^nLevels and sets
 *
 *   s_n(x) = floor(f(x) / step) · step,   clipped to [0, maxVal − step].
 *
 * The preimage sets A_k = { x : s_n(x) = c_k } are finite unions of intervals,
 * recovered by sampling [0, 1] at high resolution and grouping consecutive
 * x-values whose s_n value is the same.
 *
 * @param f — the target function (assumed non-negative on [0, 1]).
 * @param nLevels — number of dyadic levels to use (so 2^nLevels actual levels).
 * @param maxVal — upper bound of the value range to slice.
 * @param exactIntegral — closed-form integral on [0, 1], or NaN if unknown.
 * @param resolution — x-axis sampling resolution for preimage detection.
 */
export function getSimpleFunctionApproximation(
  f: (x: number) => number,
  nLevels: number,
  maxVal: number,
  exactIntegral: number = NaN,
  resolution: number = 2000,
): SimpleFunctionApproximation {
  const numSteps = Math.pow(2, nLevels);
  const step = maxVal / numSteps;

  // Guard against degenerate configurations that would produce NaN/Infinity
  // downstream: maxVal ≤ 0, non-finite step, or step ≤ 0. Return a zero simple
  // function in those cases so consumers can render an empty state gracefully.
  if (maxVal <= 0 || !Number.isFinite(step) || step <= 0) {
    return {
      steps: [],
      integralApprox: 0,
      integralExact: exactIntegral,
      nLevels,
    };
  }

  // Group consecutive x-samples that fall on the same dyadic level.
  // Each group becomes one MeasureInterval inside the preimage set for that level.
  const stepsByLevel: Map<number, MeasureInterval[]> = new Map();

  let prevLevel = -1;
  let groupStart = 0;
  for (let i = 0; i <= resolution; i++) {
    const x = i / resolution;
    const fx = f(x);
    const rawLevel = Math.floor(fx / step);
    const clampedLevel = Math.max(0, Math.min(rawLevel, numSteps - 1));

    if (clampedLevel !== prevLevel) {
      // Close out the previous group (if any)
      if (prevLevel >= 0) {
        const groupEnd = (i - 1) / resolution;
        const list = stepsByLevel.get(prevLevel) ?? [];
        list.push({ a: groupStart, b: groupEnd });
        stepsByLevel.set(prevLevel, list);
      }
      groupStart = x;
      prevLevel = clampedLevel;
    }
  }
  // Final group
  if (prevLevel >= 0) {
    const list = stepsByLevel.get(prevLevel) ?? [];
    list.push({ a: groupStart, b: 1 });
    stepsByLevel.set(prevLevel, list);
  }

  // Assemble SimpleFunctionStep array, sorted by level value
  const sortedLevels = Array.from(stepsByLevel.keys()).sort((a, b) => a - b);
  const steps: SimpleFunctionStep[] = sortedLevels.map((levelIdx) => {
    const preimageSet = stepsByLevel.get(levelIdx) ?? [];
    const measure = preimageSet.reduce((sum, iv) => sum + (iv.b - iv.a), 0);
    return {
      level: levelIdx * step,
      preimageSet,
      measure,
    };
  });

  const integralApprox = steps.reduce(
    (sum, s) => sum + s.level * s.measure,
    0,
  );

  return {
    steps,
    integralApprox,
    integralExact: exactIntegral,
    nLevels,
  };
}

// ── DCT domination check ───────────────────────────────────

/**
 * Numerically verify whether |f_n(x)| ≤ g(x) holds at every sampled x in the
 * given domain. Used by DominatedConvergenceExplorer (Topic 26) to validate the
 * DCT hypothesis on a concrete scenario before showing it to the reader.
 *
 * The check is sampling-based, not analytic — it can miss violations that
 * happen between sample points. Use a high enough resolution that any
 * violation wide enough to matter visually is caught.
 *
 * @param fn — the function f_n
 * @param g — the proposed dominator
 * @param domain — [a, b] sampling domain
 * @param resolution — number of sample points (default 200)
 * @returns true if |f_n(x)| ≤ g(x) holds at every sampled x, false otherwise
 */
export function checkDomination(
  fn: (x: number) => number,
  g: (x: number) => number,
  domain: [number, number],
  resolution: number = 200,
): boolean {
  const [a, b] = domain;
  if (resolution < 2 || !(b > a)) return false;
  const dx = (b - a) / (resolution - 1);
  for (let i = 0; i < resolution; i++) {
    const x = a + i * dx;
    if (Math.abs(fn(x)) > g(x) + 1e-12) return false;
  }
  return true;
}

// ── Lp norms and inequalities (Topic 27) ──────────────────

/** Result of computing an Lp norm. */
export interface LpNormResult {
  /** The exponent p that was used. */
  p: number;
  /** The computed norm ||f||_p. */
  norm: number;
  /** Whether the norm is finite (false on overflow or NaN). */
  isFinite: boolean;
}

/** Result of checking Hölder's inequality numerically. */
export interface HolderCheckResult {
  /** The exponent p used for f. */
  p: number;
  /** The conjugate exponent q = p / (p - 1). */
  q: number;
  /** ||fg||_1 — the left-hand side of Hölder's inequality. */
  lhs: number;
  /** ||f||_p · ||g||_q — the right-hand side (Hölder bound). */
  rhs: number;
  /** lhs / rhs. Hölder guarantees ratio ≤ 1; ratio ≈ 1 means the inequality is tight. */
  ratio: number;
  /** True if ratio ≥ 0.999 (Young's-inequality saturation, |f|^p ∝ |g|^q). */
  isSharp: boolean;
}

/**
 * Compute the Lp norm ||f||_p = (∫_a^b |f(x)|^p dx)^{1/p} via adaptive quadrature.
 *
 * For p = Infinity, returns the supremum of |f| sampled at `resolution` points
 * (an approximation to the essential supremum on a discretized grid).
 *
 * For p < 1, the result is technically a "p-norm" in the loose sense — it is
 * not a norm because the triangle inequality fails. Caller is responsible for
 * interpreting the result in that regime; see Topic 27 §5 Remark 5.
 *
 * @param f — the integrand
 * @param p — exponent (1 ≤ p ≤ ∞ for an actual norm; values < 1 are accepted)
 * @param domain — [a, b]
 * @param resolution — sample count for the p = ∞ branch (default 1000); ignored for finite p
 */
export function computeLpNorm(
  f: (x: number) => number,
  p: number,
  domain: [number, number],
  resolution: number = 1000,
): LpNormResult {
  const [a, b] = domain;

  if (!Number.isFinite(p)) {
    // p = ∞: ess sup approximated by sup over a uniform grid.
    let supVal = 0;
    for (let i = 0; i <= resolution; i++) {
      const x = a + (i / resolution) * (b - a);
      const v = Math.abs(f(x));
      if (v > supVal) supVal = v;
    }
    return { p, norm: supVal, isFinite: Number.isFinite(supVal) };
  }

  const integrand = (x: number) => Math.pow(Math.abs(f(x)), p);
  const result = adaptiveQuadrature(integrand, a, b);
  // Guard against tiny negative values from quadrature roundoff.
  const integralValue = Math.max(result.value, 0);
  const norm = Math.pow(integralValue, 1 / p);

  return { p, norm, isFinite: Number.isFinite(norm) };
}

/**
 * Check Hölder's inequality numerically: ||fg||_1 ≤ ||f||_p · ||g||_q with q = p/(p-1).
 *
 * Returns both sides and the ratio. For p = 1, q is set to ∞; for p = ∞, q is 1.
 * The `isSharp` flag fires when ratio ≥ 0.999, indicating Young's inequality
 * saturation (|f|^p ∝ |g|^q a.e.).
 *
 * @param f — first function
 * @param g — second function
 * @param p — exponent for f (q = p/(p-1) computed automatically)
 * @param domain — [a, b]
 * @param resolution — quadrature resolution passed through to computeLpNorm
 */
export function checkHolder(
  f: (x: number) => number,
  g: (x: number) => number,
  p: number,
  domain: [number, number],
  resolution: number = 1000,
): HolderCheckResult {
  const q = p === 1 ? Infinity : p === Infinity ? 1 : p / (p - 1);
  const fg = (x: number) => f(x) * g(x);

  const lhs = computeLpNorm(fg, 1, domain, resolution).norm;
  const fNorm = computeLpNorm(f, p, domain, resolution).norm;
  const gNorm = computeLpNorm(g, q, domain, resolution).norm;
  const rhs = fNorm * gNorm;
  const ratio = rhs > 0 ? lhs / rhs : 0;

  return { p, q, lhs, rhs, ratio, isSharp: ratio >= 0.999 };
}

/**
 * Check Minkowski's inequality numerically: ||f + g||_p ≤ ||f||_p + ||g||_p.
 *
 * Returns both sides and the ratio. For p ≥ 1 the inequality holds; for p < 1
 * the direction reverses, so the caller is responsible for interpreting the
 * result in that regime (the function does not flag p < 1 specially).
 *
 * @param f — first function
 * @param g — second function
 * @param p — exponent
 * @param domain — [a, b]
 * @param resolution — quadrature resolution passed through to computeLpNorm
 */
export function checkMinkowski(
  f: (x: number) => number,
  g: (x: number) => number,
  p: number,
  domain: [number, number],
  resolution: number = 1000,
): { lhs: number; rhs: number; ratio: number } {
  const fPlusG = (x: number) => f(x) + g(x);

  const lhs = computeLpNorm(fPlusG, p, domain, resolution).norm;
  const fNorm = computeLpNorm(f, p, domain, resolution).norm;
  const gNorm = computeLpNorm(g, p, domain, resolution).norm;
  const rhs = fNorm + gNorm;
  const ratio = rhs > 0 ? lhs / rhs : 0;

  return { lhs, rhs, ratio };
}
