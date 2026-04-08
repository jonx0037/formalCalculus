/**
 * Data presets and constructive utilities for the Lp Spaces topic (Topic 27).
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides typed helpers for the four interactive visualizations:
 *  - LpBallExplorer (flagship)    — morphing Lp unit ball in R^2 with closed-form area
 *  - HolderMinkowskiExplorer      — Hölder/Minkowski inequality verification
 *  - LpNormExplorer               — ||f||_p as a function of p with mass redistribution
 *  - RieszFischerExplorer         — Cauchy sequences in L^p converging to a limit
 *
 * Lp norm computation comes from src/components/viz/shared/measure.ts; the
 * gamma function (for the closed-form Lp ball area) comes from
 * src/components/viz/shared/integration.ts.
 */

import { computeLpNorm } from '../components/viz/shared/measure';
import { gammaFunction } from '../components/viz/shared/integration';

// ── Interfaces ─────────────────────────────────────────────

/** Boundary points and metadata for the Lp unit ball in R^2. */
export interface LpBallData {
  /** The exponent p used (Infinity for the square ball). */
  p: number;
  /** Boundary points (x, y) on ||(x, y)||_p = 1, in counter-clockwise order. */
  boundary: Array<{ x: number; y: number }>;
  /** Area of the unit ball: A_p = 4 · Γ(1 + 1/p)^2 / Γ(1 + 2/p). For p = ∞, area = 4. */
  area: number;
  /** Human-readable shape name: "diamond", "circle", "square", "superellipse", or "concave star". */
  shapeName: string;
}

/** A pair of functions on a common domain for Hölder/Minkowski visualization. */
export interface HolderScenario {
  /** Short identifier (e.g. "sin-x2"). */
  name: string;
  /** First function. */
  f: (x: number) => number;
  /** Second function. */
  g: (x: number) => number;
  /** Reader-facing label for f (LaTeX-friendly, no $ delimiters). */
  fLabel: string;
  /** Reader-facing label for g. */
  gLabel: string;
  /** Domain [a, b] for plotting and integration. */
  domain: [number, number];
  /** One-line description of why this scenario is interesting. */
  description: string;
}

/** A single point on the curve p ↦ ||f||_p. */
export interface LpNormCurvePoint {
  p: number;
  norm: number;
}

/** A Cauchy sequence in L^p with a known limit, for Riesz–Fischer visualization. */
export interface CauchySequenceData {
  /** Short identifier. */
  name: string;
  /** Reader-facing description. */
  description: string;
  /** Evaluate f_n(x). */
  fn: (x: number, n: number) => number;
  /** The limit function f(x). */
  limit: (x: number) => number;
  /**
   * Compute ||f_n - f||_p numerically. For preset scenarios this is just a
   * convenience wrapper around computeLpNorm on (t ↦ fn(t, n) - limit(t)).
   */
  normDifference: (n: number, p: number) => number;
  /** Domain [a, b] for plotting and integration. */
  domain: [number, number];
}

// ── Lp ball points ─────────────────────────────────────────

/**
 * Generate boundary points and area for the Lp unit ball
 * { (x, y) ∈ R^2 : ||(x, y)||_p ≤ 1 } in 2D.
 *
 * Uses the polar parametrization
 *
 *     r(θ) = (|cos θ|^p + |sin θ|^p)^(-1/p)
 *     (x, y) = (r cos θ, r sin θ)
 *
 * which is valid for all finite p > 0. For p ≥ 1 the shape is convex; for
 * p < 1 the shape becomes a non-convex "star" (concave between the axis
 * vertices), which is why ||·||_p is not a norm in that regime.
 *
 * For p = ∞ the formula degenerates and the unit ball is the square
 * [-1, 1]^2, generated as four line segments here.
 *
 * The area uses the closed-form Pi-function identity
 *
 *     A_p = 4 · Γ(1 + 1/p)^2 / Γ(1 + 2/p),
 *
 * which holds for all finite p > 0 and gives Γ-pole-free values for the
 * presets (p = 1 → 2, p = 2 → π, p = ∞ → 4 by continuity).
 *
 * @param p — exponent (0 < p ≤ ∞)
 * @param nPoints — number of boundary samples (default 360, ignored for p = ∞)
 */
export function getLpBallPoints(p: number, nPoints: number = 360): LpBallData {
  if (!Number.isFinite(p)) {
    // p = ∞: the unit ball is the square [-1, 1]^2.
    // Generate the boundary as 4 segments × perSide samples each. Using
    // `t = i / (perSide - 1)` with `i < perSide` means each edge starts AT
    // its first corner and ends AT its second corner — so adjacent edges
    // share corners (e.g. top ends at (-1, 1), left starts at (-1, 1)).
    // curveLinearClosed is happy with the zero-length repeat; the important
    // thing is that the square's four corners are never "cut" by a chord.
    const perSide = Math.max(2, Math.floor(nPoints / 4));
    const boundary: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < perSide; i++) {
      const t = i / (perSide - 1);
      boundary.push({ x: 1 - 2 * t, y: 1 }); // top edge: (1,1) → (-1,1)
    }
    for (let i = 0; i < perSide; i++) {
      const t = i / (perSide - 1);
      boundary.push({ x: -1, y: 1 - 2 * t }); // left edge: (-1,1) → (-1,-1)
    }
    for (let i = 0; i < perSide; i++) {
      const t = i / (perSide - 1);
      boundary.push({ x: -1 + 2 * t, y: -1 }); // bottom edge: (-1,-1) → (1,-1)
    }
    for (let i = 0; i < perSide; i++) {
      const t = i / (perSide - 1);
      boundary.push({ x: 1, y: -1 + 2 * t }); // right edge: (1,-1) → (1,1)
    }
    return { p, boundary, area: 4, shapeName: 'square' };
  }

  // Finite p > 0: polar parametrization on [0, 2π).
  const boundary: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nPoints; i++) {
    const theta = (2 * Math.PI * i) / nPoints;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const denom = Math.pow(Math.abs(cosT), p) + Math.pow(Math.abs(sinT), p);
    const r = Math.pow(denom, -1 / p);
    boundary.push({ x: r * cosT, y: r * sinT });
  }

  // Closed-form area via gamma function.
  const numerator = Math.pow(gammaFunction(1 + 1 / p).value, 2);
  const denominator = gammaFunction(1 + 2 / p).value;
  const area = (4 * numerator) / denominator;

  let shapeName: string;
  if (Math.abs(p - 1) < 1e-9) shapeName = 'diamond';
  else if (Math.abs(p - 2) < 1e-9) shapeName = 'circle';
  else if (p < 1) shapeName = 'concave star';
  else shapeName = 'superellipse';

  return { p, boundary, area, shapeName };
}

// ── Hölder/Minkowski scenarios ─────────────────────────────

/**
 * Get a preset Hölder/Minkowski scenario by id. The five presets cover:
 *
 *  - 'sin-x2'           → strict inequality (most natural Hölder example)
 *  - 'power-pair'       → near-equality but NOT sharp (matches brief Example 5)
 *  - 'power-pair-sharp' → genuine conjugate pair, ratio = 1 exactly at p = 3
 *  - 'indicators'       → both functions are simple step functions
 *  - 'exp-cos'          → smooth non-trivial pair
 *
 * Unknown ids fall back to 'sin-x2'.
 *
 * The distinction between 'power-pair' and 'power-pair-sharp' is pedagogically
 * important: a "nicely matched" pair of powers (x^(1/3) and x^(1/6)) is NOT
 * automatically a Hölder conjugate pair, because the equality condition
 * requires |f|^p ∝ |g|^q pointwise, not just "both powers of x." The sharp
 * case requires β = 2α when p = 3, q = 3/2 — so g = x^(2/3), not x^(1/6).
 */
export function getHolderScenario(scenarioId: string): HolderScenario {
  switch (scenarioId) {
    case 'power-pair':
      return {
        name: 'power-pair',
        f: (x) => Math.pow(Math.max(x, 0), 1 / 3),
        g: (x) => Math.pow(Math.max(x, 0), 1 / 6),
        fLabel: 'x^{1/3}',
        gLabel: 'x^{1/6}',
        domain: [0, 1],
        description:
          'Two power functions — close but NOT a Hölder conjugate pair. At p = 3, ratio ≈ 0.9747 (strict inequality).',
      };
    case 'power-pair-sharp':
      return {
        name: 'power-pair-sharp',
        f: (x) => Math.pow(Math.max(x, 0), 1 / 3),
        g: (x) => Math.pow(Math.max(x, 0), 2 / 3),
        fLabel: 'x^{1/3}',
        gLabel: 'x^{2/3}',
        domain: [0, 1],
        description:
          'A genuine Hölder conjugate pair at p = 3, q = 3/2: |f|^p = x = |g|^q pointwise, so ratio = 1 exactly.',
      };
    case 'indicators':
      return {
        name: 'indicators',
        f: (x) => (x >= 0 && x < 0.5 ? 1 : 0),
        g: (x) => (x >= 0.25 && x < 0.75 ? 1 : 0),
        fLabel: '\\mathbf{1}_{[0,1/2)}',
        gLabel: '\\mathbf{1}_{[1/4,3/4)}',
        domain: [0, 1],
        description:
          'Two overlapping indicator functions. The integral of |fg| only sees the overlap [1/4, 1/2).',
      };
    case 'exp-cos':
      return {
        name: 'exp-cos',
        f: (x) => Math.exp(x) - 1,
        g: (x) => Math.cos((Math.PI * x) / 2),
        fLabel: 'e^x - 1',
        gLabel: '\\cos(\\pi x / 2)',
        domain: [0, 1],
        description:
          'A convex exponential and a concave cosine — both smooth, both non-negative on [0, 1].',
      };
    case 'sin-x2':
    default:
      return {
        name: 'sin-x2',
        f: (x) => Math.sin(Math.PI * x),
        g: (x) => x * x,
        fLabel: '\\sin(\\pi x)',
        gLabel: 'x^2',
        domain: [0, 1],
        description:
          'A sine half-cycle and a quadratic — Hölder is strict and the ratio sits well below 1.',
      };
  }
}

// ── Lp norm curves ─────────────────────────────────────────

/**
 * Compute the curve p ↦ ||f||_p over a range of p values.
 *
 * Defaults to p ∈ [0.5, 20] in steps of 0.1 (196 points). The curve makes
 * the monotonicity of ||f||_p in p visually obvious for bounded f on a
 * probability space (where ||f||_p is non-decreasing) and shows the
 * "mass concentration" behavior as p → ∞ (||f||_p → ess sup |f|).
 *
 * @param f — target function
 * @param domain — [a, b]
 * @param pValues — explicit p values (default: 0.5 to 20.0 in 0.1 steps)
 */
export function getLpNormCurve(
  f: (x: number) => number,
  domain: [number, number],
  pValues?: number[],
): LpNormCurvePoint[] {
  const ps =
    pValues ??
    Array.from({ length: 196 }, (_, i) => 0.5 + i * 0.1);
  return ps.map((p) => ({
    p,
    norm: computeLpNorm(f, p, domain).norm,
  }));
}

// ── Cauchy sequences ───────────────────────────────────────

/**
 * Get a Cauchy sequence scenario for Riesz–Fischer visualization.
 *
 * Two presets:
 *
 *  - 'smooth-indicator' (notebook Cell 10):
 *      f_n(t) = (1/2)(1 + tanh(n t)) · (1/2)(1 + tanh(n (1 - t)))
 *      → 1_{[0, 1]} pointwise (and in L^p for every finite p).
 *      The smooth-step product is a tanh mollification of the indicator
 *      and converges to the indicator in every L^p (1 ≤ p < ∞).
 *
 *  - 'truncated-sin' (simpler analytic alternative):
 *      f_n(t) = sin(π t) · (1 - 1/n) on [0, 1]
 *      → sin(π t) uniformly. ||f_n - f||_p = (1/n) · ||sin(π·)||_p
 *      decays as 1/n, so the visualization shows linear (1/n) convergence
 *      regardless of p — useful for emphasizing that "Cauchy in L^p" is
 *      a metric statement.
 */
export function getCauchySequence(scenarioId: string): CauchySequenceData {
  if (scenarioId === 'truncated-sin') {
    const limit = (t: number) => Math.sin(Math.PI * t);
    const fn = (t: number, n: number) => limit(t) * (1 - 1 / Math.max(n, 1));
    const domain: [number, number] = [0, 1];
    return {
      name: 'truncated-sin',
      description:
        'Scaled sine waves f_n(t) = sin(π t) · (1 - 1/n) converging uniformly to sin(π t). ' +
        'The L^p error decays as 1/n for every finite p.',
      fn,
      limit,
      normDifference: (n, p) =>
        computeLpNorm((t) => fn(t, n) - limit(t), p, domain).norm,
      domain,
    };
  }

  // Default: 'smooth-indicator'
  const limit = (t: number) => (t >= 0 && t <= 1 ? 1 : 0);
  const fn = (t: number, n: number) => {
    const left = 0.5 * (1 + Math.tanh(n * t));
    const right = 0.5 * (1 + Math.tanh(n * (1 - t)));
    return left * right;
  };
  const domain: [number, number] = [-0.5, 1.5];
  return {
    name: 'smooth-indicator',
    description:
      'Smooth tanh-mollified approximations to 1_[0, 1]. As n grows the transitions ' +
      'sharpen and f_n converges to the indicator in every L^p (1 ≤ p < ∞).',
    fn,
    limit,
    normDifference: (n, p) =>
      computeLpNorm((t) => fn(t, n) - limit(t), p, domain).norm,
    domain,
  };
}
