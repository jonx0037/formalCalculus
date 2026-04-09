/**
 * Data presets and constructive utilities for the Radon-Nikodym topic (Topic 28).
 * All functions are pure and deterministic; sampling helpers use a seeded LCG so
 * repeated calls with the same seed give identical sequences.
 *
 * Provides typed helpers for the three interactive visualizations:
 *  - DensityAsDerivativeExplorer    — Beta densities with R-N derivative integral verification
 *  - ConditionalExpectationExplorer — joint density heatmaps with E[Y | X] and three-view toggle (flagship)
 *  - ImportanceSamplingExplorer     — target/proposal densities, weights, MC convergence
 *
 * Reuses shared helpers from src/components/viz/shared/:
 *  - betaFunction, gaussianCDF (integration.ts)
 *  - bivariateDensity (multivariate.ts)
 *  - sampleCurve, Point2D (plotting.ts)
 */

import { betaFunction, gaussianCDF } from '../components/viz/shared/integration';
import { bivariateDensity } from '../components/viz/shared/multivariate';
import { sampleCurve } from '../components/viz/shared/plotting';
import type { Point2D } from '../components/viz/shared/plotting';

// ── DensityAsDerivativeExplorer ────────────────────────────

/** Beta density data: density curve, CDF curve, and an interval-integral closure. */
export interface BetaDensityData {
  alpha: number;
  beta: number;
  /** Density values [x, f(x)] on a grid covering (0, 1). */
  densityCurve: Point2D[];
  /** CDF values [x, F(x)] from cumulative trapezoidal integration of the density. */
  cdfCurve: Point2D[];
  /** ∫_a^b f(x) dx for any [a, b] ⊆ [0, 1]. Trapezoidal on a 2000-point sub-grid. */
  integralOnInterval: (a: number, b: number) => number;
}

// ── ConditionalExpectationExplorer ─────────────────────────

/** A joint distribution scenario with closed-form conditional expectation. */
export interface ConditionalExpectationScenario {
  id: string;
  name: string;
  description: string;
  /** Joint density p(x, y). */
  jointDensity: (x: number, y: number) => number;
  /** Closed-form conditional expectation E[Y | X = x]. */
  conditionalMean: (x: number) => number;
  /** Marginal density p_X(x), used for slice visualization. */
  marginalX: (x: number) => number;
  xDomain: [number, number];
  yDomain: [number, number];
}

// ── ImportanceSamplingExplorer ─────────────────────────────

/** A (target, proposal) pair plus a deterministic sampler from the proposal. */
export interface ImportanceSamplingScenario {
  id: string;
  name: string;
  /** Target density p(x). */
  targetDensity: (x: number) => number;
  /** Proposal density q(x). */
  proposalDensity: (x: number) => number;
  /** Importance weight w(x) = p(x) / q(x). */
  weight: (x: number) => number;
  /**
   * Deterministic sampler: returns n samples from Q. Uses a seeded LCG; the
   * default seed is fixed per scenario so the convergence trace is reproducible.
   */
  sampleProposal: (n: number, seed?: number) => number[];
  /** Map from integrand key to true E_P[f] for verification. */
  trueExpectations: Record<string, number>;
  domain: [number, number];
}

// ── Beta density (Section 3) ───────────────────────────────

/**
 * Compute the Beta(α, β) density and CDF on a uniform grid, plus an interval
 * integral closure.
 *
 * Uses the project's shared `betaFunction` from integration.ts (which itself
 * is built on logGamma, so it stays numerically stable for moderate
 * α, β ∈ [0.3, 5]). Sampling is performed via the shared `sampleCurve`
 * helper to comply with the Topic 27 plotting convention.
 *
 * @param alpha — shape parameter α > 0
 * @param beta — shape parameter β > 0
 * @param nPoints — grid resolution (default 500)
 */
export function getBetaDensityData(
  alpha: number,
  beta: number,
  nPoints: number = 500,
): BetaDensityData {
  const B = betaFunction(alpha, beta);

  const density = (x: number): number => {
    if (x <= 0 || x >= 1) return 0;
    return (Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1)) / B;
  };

  // Sample on (0.001, 0.999) — clipping the endpoints avoids density blow-ups
  // when α < 1 or β < 1 (where the density tends to ∞ at the corresponding
  // boundary). The density is finite at α = 1 or β = 1 — only strict
  // values below 1 cause the singularity.
  const densityCurve = sampleCurve(density, [0.001, 0.999], nPoints);

  // Pre-evaluate the density on a fine sub-grid (2000 cells) so that both
  // the CDF and `integralOnInterval` can do O(1)/O(N) lookups instead of
  // re-evaluating the Beta PDF on every drag event. Without this cache,
  // drag interactions in DensityAsDerivativeExplorer trigger ~60 calls/sec
  // each doing 2000 PDF evaluations.
  const FINE_STEPS = 2000;
  const FINE_LO = 1e-6;
  const FINE_HI = 1 - 1e-6;
  const fineH = (FINE_HI - FINE_LO) / FINE_STEPS;
  const fineDensity = new Float64Array(FINE_STEPS + 1);
  for (let i = 0; i <= FINE_STEPS; i++) {
    fineDensity[i] = density(FINE_LO + i * fineH);
  }
  // Prefix sum of trapezoidal contributions: prefixIntegral[k] = ∫_{FINE_LO}^{x_k} f.
  const prefixIntegral = new Float64Array(FINE_STEPS + 1);
  for (let i = 1; i <= FINE_STEPS; i++) {
    prefixIntegral[i] =
      prefixIntegral[i - 1] + 0.5 * (fineDensity[i - 1] + fineDensity[i]) * fineH;
  }

  // CDF curve: same data as `prefixIntegral` but resampled at the display
  // resolution `nPoints` for plotting. We linearly interpolate the prefix
  // sum onto each display x.
  const lookupPrefix = (x: number): number => {
    if (x <= FINE_LO) return 0;
    if (x >= FINE_HI) return prefixIntegral[FINE_STEPS];
    const t = (x - FINE_LO) / fineH;
    const lo = Math.floor(t);
    const frac = t - lo;
    return prefixIntegral[lo] + frac * (prefixIntegral[lo + 1] - prefixIntegral[lo]);
  };

  const cdfCurve: Point2D[] = densityCurve.map(([x]) => [x, lookupPrefix(x)] as Point2D);

  // Drag-time helper: O(1) on the cached prefix array, no PDF evaluations.
  // Accurate to ~5 digits for moderate Beta shapes — sufficient for the
  // on-screen integral readout.
  const integralOnInterval = (a: number, b: number): number => {
    if (b <= a) return 0;
    return lookupPrefix(Math.min(b, 1)) - lookupPrefix(Math.max(a, 0));
  };

  return { alpha, beta, densityCurve, cdfCurve, integralOnInterval };
}

// ── Conditional expectation scenarios (Section 9) ──────────

/**
 * Three joint-distribution scenarios for the flagship ConditionalExpectationExplorer.
 *
 * The "bivariate-normal" preset matches the notebook exactly:
 *   μ = (0.5, 0.5),  σ_X = 0.2,  σ_Y = 0.25,  ρ = 0.7
 * truncated to [0, 1]² (the on-screen window). Closed-form conditional mean:
 *   E[Y | X = x] = 0.5 + 0.875 (x − 0.5)
 * which is what the notebook's verification cells use.
 *
 * @param scenarioId — "bivariate-normal" | "beta-conditional" | "independent-uniform"
 */
export function getConditionalExpectationScenario(
  scenarioId: string,
): ConditionalExpectationScenario {
  switch (scenarioId) {
    case 'beta-conditional': {
      // X ~ Uniform(0, 1);  Y | X ~ Beta(α(X), β(X)) with α(x) = x + 1, β(x) = 3 − x.
      // E[Y | X = x] = α / (α + β) = (x + 1) / 4. The conditional shape (and hence
      // the mean's nonlinearity) depends on x.
      return {
        id: 'beta-conditional',
        name: 'X ~ Uniform(0,1), Y | X ~ Beta(X+1, 3−X)',
        description:
          'The conditional shape depends on X, so the conditional mean is a nontrivial function of x.',
        jointDensity: (x, y) => {
          if (x < 0 || x > 1 || y <= 0 || y >= 1) return 0;
          const a = x + 1;
          const b = 3 - x;
          return (Math.pow(y, a - 1) * Math.pow(1 - y, b - 1)) / betaFunction(a, b);
        },
        conditionalMean: (x) => (x + 1) / 4,
        marginalX: () => 1, // Uniform(0, 1)
        xDomain: [0, 1],
        yDomain: [0, 1],
      };
    }
    case 'independent-uniform': {
      // X, Y i.i.d. Uniform(0, 1). E[Y | X] = E[Y] = 1/2 (constant — conditioning
      // gives no information). Useful as a sanity check: the curve is flat.
      return {
        id: 'independent-uniform',
        name: 'X, Y i.i.d. Uniform(0,1)',
        description: 'Independent variables — conditioning gives no information; E[Y | X] is constant.',
        jointDensity: (x, y) => (x >= 0 && x <= 1 && y >= 0 && y <= 1 ? 1 : 0),
        conditionalMean: () => 0.5,
        marginalX: (x) => (x >= 0 && x <= 1 ? 1 : 0),
        xDomain: [0, 1],
        yDomain: [0, 1],
      };
    }
    case 'bivariate-normal':
    default: {
      // Notebook preset. The full (untruncated) bivariate normal density,
      // shown on the [0,1]² viewing window. Because most of the mass sits
      // inside the window (μ centered at (0.5, 0.5) with σ_X=0.2, σ_Y=0.25),
      // the closed-form linear conditional mean for the untruncated BVN is
      // accurate to plotting precision over the visible region. Truly
      // truncating + renormalizing on [0,1]² would introduce a small
      // nonlinearity in the conditional mean near the window edges; we
      // intentionally do NOT truncate so the closed-form formula stays exact.
      const muX = 0.5;
      const muY = 0.5;
      const sigmaX = 0.2;
      const sigmaY = 0.25;
      const rho = 0.7;
      const slope = rho * (sigmaY / sigmaX); // = 0.875
      return {
        id: 'bivariate-normal',
        name: 'Bivariate Normal (windowed on [0,1]²)',
        description:
          'μ = (0.5, 0.5), σ_X = 0.2, σ_Y = 0.25, ρ = 0.7. Untruncated density shown on the [0,1]² window; conditional mean is linear in x.',
        jointDensity: (x, y) =>
          bivariateDensity(x, y, muX, muY, sigmaX, sigmaY, rho),
        conditionalMean: (x) => muY + slope * (x - muX),
        marginalX: (x) => {
          const z = (x - muX) / sigmaX;
          return Math.exp(-0.5 * z * z) / (sigmaX * Math.sqrt(2 * Math.PI));
        },
        xDomain: [0, 1],
        yDomain: [0, 1],
      };
    }
  }
}

// ── Importance sampling scenarios (Section 10) ─────────────

/**
 * Linear Congruential Generator — a simple seeded PRNG that gives
 * deterministic, reproducible "random" sequences. Quality is sufficient
 * for visualization (not for serious Monte Carlo!), and the determinism
 * guarantees the same sample-size slider position always shows the same
 * convergence trace.
 *
 * Multiplier and increment from Numerical Recipes (Press et al.) — the
 * "quick and dirty" 32-bit LCG, distinct from the Park–Miller minimal
 * standard generator (which uses different constants).
 */
function lcg(seed: number): () => number {
  let state = (seed >>> 0) || 1; // forbid 0 (would lock the sequence)
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Box-Muller normal sampler built on top of the seeded LCG. Generates one
 * standard-normal draw per call by caching the second draw of each pair.
 */
function makeNormalSampler(rng: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const mag = Math.sqrt(-2 * Math.log(u));
    const z0 = mag * Math.cos(2 * Math.PI * v);
    const z1 = mag * Math.sin(2 * Math.PI * v);
    spare = z1;
    return z0;
  };
}

/** Standard normal density φ(x). Used by the importance-sampling presets. */
const phiStd = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/**
 * Three target/proposal pairs for the ImportanceSamplingExplorer.
 *
 * The "normal-shift" preset matches the notebook: P = N(0,1), Q = N(2,1).
 * The closed-form weight is w(x) = exp(-2x + 2), and the example integrand
 * f(x) = x² has true E_P[f] = 1.
 *
 * @param scenarioId — "normal-shift" | "normal-scale" | "exponential"
 */
export function getImportanceSamplingScenario(
  scenarioId: string,
): ImportanceSamplingScenario {
  switch (scenarioId) {
    case 'normal-scale': {
      // P = N(0, 1),  Q = N(0, sqrt(3))  — wide proposal, the recommended setup
      // for importance sampling when you want to oversample the tails.
      const sigma = Math.sqrt(3);
      const p = (x: number) => phiStd(x);
      const q = (x: number) => phiStd(x / sigma) / sigma;
      return {
        id: 'normal-scale',
        name: 'P = N(0,1) via Q = N(0, √3)',
        targetDensity: p,
        proposalDensity: q,
        weight: (x) => (q(x) === 0 ? 0 : p(x) / q(x)),
        sampleProposal: (n, seed = 43) => {
          const rng = lcg(seed);
          const normal = makeNormalSampler(rng);
          const out = new Array<number>(n);
          for (let i = 0; i < n; i++) out[i] = sigma * normal();
          return out;
        },
        trueExpectations: {
          x: 0,
          x2: 1,
          indicatorGt2: 1 - gaussianCDF(2),
        },
        domain: [-6, 6],
      };
    }
    case 'exponential': {
      // P = Exp(1),  Q = Exp(0.5)  — proposal has a heavier tail.
      const p = (x: number) => (x < 0 ? 0 : Math.exp(-x));
      const q = (x: number) => (x < 0 ? 0 : 0.5 * Math.exp(-0.5 * x));
      return {
        id: 'exponential',
        name: 'P = Exp(1) via Q = Exp(0.5)',
        targetDensity: p,
        proposalDensity: q,
        weight: (x) => (x < 0 ? 0 : 2 * Math.exp(-0.5 * x)),
        sampleProposal: (n, seed = 44) => {
          const rng = lcg(seed);
          const out = new Array<number>(n);
          for (let i = 0; i < n; i++) {
            // Inverse-CDF sampling for Exp(0.5): X = -2 ln(1 - U).
            out[i] = -2 * Math.log(1 - rng());
          }
          return out;
        },
        trueExpectations: {
          x: 1, // E_P[X] = 1 for Exp(1)
          x2: 2, // E_P[X²] = Var + Mean² = 1 + 1 = 2
          indicatorGt2: Math.exp(-2),
        },
        domain: [0, 10],
      };
    }
    case 'normal-shift':
    default: {
      // Notebook preset: P = N(0, 1), Q = N(2, 1). Closed-form weight:
      //   w(x) = phi(x) / phi(x - 2) = exp(-2x + 2)
      const p = (x: number) => phiStd(x);
      const q = (x: number) => phiStd(x - 2);
      return {
        id: 'normal-shift',
        name: 'P = N(0,1) via Q = N(2,1)',
        targetDensity: p,
        proposalDensity: q,
        weight: (x) => Math.exp(-2 * x + 2),
        sampleProposal: (n, seed = 42) => {
          const rng = lcg(seed);
          const normal = makeNormalSampler(rng);
          const out = new Array<number>(n);
          for (let i = 0; i < n; i++) out[i] = 2 + normal();
          return out;
        },
        trueExpectations: {
          x: 0,
          x2: 1,
          indicatorGt2: 1 - gaussianCDF(2),
        },
        domain: [-5, 7],
      };
    }
  }
}
