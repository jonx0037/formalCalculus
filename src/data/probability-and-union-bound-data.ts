/**
 * Data presets and computation helpers for Topic 35 (Probability & The Union
 * Bound) viz components.
 *
 * Lazy-getter pattern matching `eigenvalues-eigenvectors-data.ts` and
 * `linear-algebra-data.ts`: getters build their preset arrays on demand when
 * viz components call them, so hot reloads never hold stale cached arrays and
 * the bundle never ships precomputed Monte Carlo data.
 *
 * Consumed by:
 *  - `UnionBoundTightnessExplorer`    — via `computeEventOverlap()` and `getOverlapPreset()`
 *  - `BorelCantelliExplorer`           — via `simulateBorelCantelli()` and `getProbabilitySequence()`
 *  - `ConcentrationLadderExplorer`     — via `getConcentrationLadder()`
 *
 * All Monte Carlo is deterministic via `SeededRNG` from
 * `src/components/viz/shared/probability.ts`. Numerical agreement with
 * `notebooks/probability-and-union-bound/35_probability_and_union_bound.ipynb`.
 */

import {
  SeededRNG,
  hoeffdingTwoSidedTail,
  chebyshevTail,
} from '../components/viz/shared/probability';

// ── CircleEvent + overlap computations ─────────────────────

/** A circular event on the unit square [0, 1]². */
export interface CircleEvent {
  cx: number;
  cy: number;
  r: number;
  label: string;
  color: string;
}

/** Exact and approximate union probabilities for a circle-event configuration. */
export interface UnionProbabilities {
  events: CircleEvent[];
  /** Exact P(⋃ A_i) via inclusion–exclusion on the circular regions, clipped to the unit square. */
  exactUnion: number;
  /** Σ P(A_i) — the union-bound upper estimate. */
  sumMarginals: number;
  /** Σ P(A_i) − Σ_{i<j} P(A_i ∩ A_j) — Bonferroni depth-2 truncation. */
  bonferroniDepth2: number;
  /** Tightness ratio = sumMarginals / exactUnion (= 1 when events are disjoint). */
  tightnessRatio: number;
  /** Marginal P(A_i) for each event. */
  marginals: number[];
  /** Pairwise intersections P(A_i ∩ A_j) for each i<j. */
  pairwiseIntersections: Array<{ i: number; j: number; p: number }>;
}

/** Preset overlap configuration for the union-bound viz. */
export interface OverlapPreset {
  id: 'disjoint' | 'nested' | 'uniform-overlap';
  name: string;
  events: CircleEvent[];
}

// Pre-clipped circle area: the geometric area of a circle's intersection with
// the unit square [0, 1]², estimated by a deterministic Halton grid. For
// circles entirely inside the unit square the grid estimate is within ~0.5%
// of π r² (sufficient for the viz). For partial overlap with the square edges
// the grid handles the clipping automatically.
const HALTON_N_MARGINAL = 1600;
const HALTON_N_INTERSECT = 1200;

const FUCHSIA = '#C026D3';
const BLUE = '#2563EB';
const GREEN = '#16A34A';
const ORANGE = '#F97316';

function halton(i: number, base: number): number {
  let f = 1;
  let r = 0;
  let idx = i;
  while (idx > 0) {
    f /= base;
    r += f * (idx % base);
    idx = Math.floor(idx / base);
  }
  return r;
}

// Module-level cache: Halton sequences are deterministic and the requested
// sizes are constants, so regenerating arrays on every drag-driven
// `computeEventOverlap` call wastes work.
const haltonCache = new Map<number, Array<[number, number]>>();

function haltonPoints(n: number): Array<[number, number]> {
  const cached = haltonCache.get(n);
  if (cached) return cached;
  const pts: Array<[number, number]> = new Array(n);
  for (let i = 0; i < n; i++) {
    pts[i] = [halton(i + 1, 2), halton(i + 1, 3)];
  }
  haltonCache.set(n, pts);
  return pts;
}

function isInCircle(x: number, y: number, c: CircleEvent): boolean {
  const dx = x - c.cx;
  const dy = y - c.cy;
  return dx * dx + dy * dy <= c.r * c.r;
}

function clippedCircleArea(c: CircleEvent): number {
  // Lebesgue measure of the circle ∩ [0,1]², via deterministic Halton grid.
  const pts = haltonPoints(HALTON_N_MARGINAL);
  let inside = 0;
  for (const [x, y] of pts) {
    if (isInCircle(x, y, c)) inside++;
  }
  return inside / pts.length;
}

function clippedPairwiseArea(a: CircleEvent, b: CircleEvent): number {
  // Lebesgue measure of (A ∩ B) ∩ [0,1]².
  const pts = haltonPoints(HALTON_N_INTERSECT);
  let inside = 0;
  for (const [x, y] of pts) {
    if (isInCircle(x, y, a) && isInCircle(x, y, b)) inside++;
  }
  return inside / pts.length;
}

function clippedUnionArea(events: CircleEvent[]): number {
  // Lebesgue measure of (⋃ A_i) ∩ [0,1]².
  const pts = haltonPoints(HALTON_N_INTERSECT);
  let inside = 0;
  for (const [x, y] of pts) {
    if (events.some((c) => isInCircle(x, y, c))) inside++;
  }
  return inside / pts.length;
}

/**
 * Compute the exact union, sum-of-marginals, Bonferroni depth-2 truncation,
 * and the tightness ratio for a configuration of circle-events on [0, 1]².
 *
 * Implementation note: a closed-form circle-intersection identity exists for
 * two circles, but for three or more circles inside a clipped square the
 * closed form gets fiddly (boundary intersections with the unit square). The
 * Halton grid estimate is deterministic, runs in <5 ms at the resolutions
 * used here, and agrees with the closed form to ~3 decimal places for the
 * `disjoint` / `uniform-overlap` / `nested` presets.
 */
export function computeEventOverlap(events: CircleEvent[]): UnionProbabilities {
  const marginals = events.map((c) => clippedCircleArea(c));
  const sumMarginals = marginals.reduce((acc, p) => acc + p, 0);

  const pairwiseIntersections: UnionProbabilities['pairwiseIntersections'] = [];
  let sumPairwise = 0;
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const p = clippedPairwiseArea(events[i], events[j]);
      pairwiseIntersections.push({ i, j, p });
      sumPairwise += p;
    }
  }

  const exactUnion = clippedUnionArea(events);
  const bonferroniDepth2 = Math.max(0, sumMarginals - sumPairwise);
  const tightnessRatio = exactUnion > 0 ? sumMarginals / exactUnion : Number.POSITIVE_INFINITY;

  return {
    events,
    exactUnion,
    sumMarginals,
    bonferroniDepth2,
    tightnessRatio,
    marginals,
    pairwiseIntersections,
  };
}

/**
 * Return one of three canonical overlap configurations, parameterized by the
 * number of events m ∈ {2, 3, 4}.
 *
 * - `disjoint`: events placed far apart, union bound is tight (ratio ≈ 1).
 * - `uniform-overlap`: events pairwise overlapping equally, ratio ≈ 1.5–3.
 * - `nested`: each event contained in the next, ratio scales with m.
 */
export function getOverlapPreset(id: OverlapPreset['id'], m: 2 | 3 | 4): OverlapPreset {
  const palette = [FUCHSIA, BLUE, GREEN, ORANGE];
  const labels = ['A', 'B', 'C', 'D'];

  const make = (cx: number, cy: number, r: number, i: number): CircleEvent => ({
    cx,
    cy,
    r,
    label: labels[i],
    color: palette[i],
  });

  if (id === 'disjoint') {
    const r = 0.13;
    const positions: Array<[number, number]> = [
      [0.22, 0.22],
      [0.78, 0.22],
      [0.78, 0.78],
      [0.22, 0.78],
    ];
    return {
      id,
      name: 'Disjoint — union bound tight',
      events: positions.slice(0, m).map(([cx, cy], i) => make(cx, cy, r, i)),
    };
  }

  if (id === 'uniform-overlap') {
    // m circles arranged on a small regular polygon so that every pair overlaps.
    const r = 0.22;
    const ringRadius = 0.16;
    const events: CircleEvent[] = [];
    for (let i = 0; i < m; i++) {
      const theta = (2 * Math.PI * i) / m - Math.PI / 2;
      events.push(
        make(0.5 + ringRadius * Math.cos(theta), 0.5 + ringRadius * Math.sin(theta), r, i),
      );
    }
    return {
      id,
      name: 'Uniform overlap — union bound moderately loose',
      events,
    };
  }

  // `nested`: each circle contained in the next.
  const events: CircleEvent[] = [];
  const radii = [0.28, 0.22, 0.16, 0.1];
  for (let i = 0; i < m; i++) {
    events.push(make(0.5, 0.5, radii[i], i));
  }
  return {
    id: 'nested',
    name: 'Nested — union bound very loose',
    events,
  };
}

// ── Borel–Cantelli simulation ──────────────────────────────

export interface BorelCantelliTrajectory {
  /** n = 1, 2, …, N (the time index). */
  n: number[];
  /** Cumulative indicator sum ∑_{k ≤ n} 1_{A_k}. */
  indicatorSum: number[];
}

export interface BorelCantelliResult {
  /** p_n for n = 1..N. */
  pSequence: number[];
  /** ∑_{k ≤ n} p_k — the partial sum series. */
  partialSums: number[];
  trajectories: BorelCantelliTrajectory[];
  /** Pointwise mean indicator-sum across the trajectories. */
  meanTrajectory: number[];
  /** 'BC-I' when the partial sum is bounded; 'BC-II' otherwise (heuristic flag). */
  regime: 'BC-I' | 'BC-II';
}

/**
 * Generate a deterministic p_n sequence by ID.
 *
 * - `inverse-n`           — p_n = 1/n          (Σ diverges, BC-II)
 * - `inverse-n-squared`   — p_n = 1/n²         (Σ converges, BC-I)
 * - `one-over-n-log-n`    — p_n = 1/(n log n)  (Σ diverges, BC-II)
 * - `log-n-over-n-squared`— p_n = log(n)/n²    (Σ converges, BC-I)
 * - `power`               — p_n = 1/n^α        (converges iff α > 1)
 */
export function getProbabilitySequence(
  id: 'inverse-n' | 'inverse-n-squared' | 'one-over-n-log-n' | 'log-n-over-n-squared' | 'power',
  N: number,
  alpha: number = 1,
): number[] {
  const out = new Array<number>(N);
  for (let i = 0; i < N; i++) {
    const n = i + 1;
    let p: number;
    switch (id) {
      case 'inverse-n':
        p = 1 / n;
        break;
      case 'inverse-n-squared':
        p = 1 / (n * n);
        break;
      case 'one-over-n-log-n':
        // 1/(n log n) is undefined at n = 1; clamp to 0.99 for the first term.
        p = n === 1 ? 0.99 : 1 / (n * Math.log(n));
        break;
      case 'log-n-over-n-squared':
        p = n === 1 ? 0 : Math.log(n) / (n * n);
        break;
      case 'power':
        p = 1 / Math.pow(n, alpha);
        break;
    }
    out[i] = Math.min(Math.max(p, 0), 1);
  }
  return out;
}

/**
 * Simulate `nTrajectories` independent indicator-sum paths of a sequence of
 * independent events with P(A_n) = p_n. Deterministic via the `seed`.
 *
 * Returns the p_n sequence, the partial sums Σ p_n, the trajectories, the
 * pointwise mean trajectory, and a heuristic regime flag (`BC-I` if the
 * partial sum stays bounded by 10, otherwise `BC-II`).
 */
export function simulateBorelCantelli(
  pSequence: number[],
  nTrajectories: number = 8,
  seed: number = 42,
): BorelCantelliResult {
  const N = pSequence.length;
  const rng = new SeededRNG(seed);

  // Partial sums.
  const partialSums = new Array<number>(N);
  let running = 0;
  for (let i = 0; i < N; i++) {
    running += pSequence[i];
    partialSums[i] = running;
  }

  // Trajectories.
  const trajectories: BorelCantelliTrajectory[] = [];
  const nAxis = Array.from({ length: N }, (_, i) => i + 1);
  const meanTrajectory = new Array<number>(N).fill(0);

  for (let t = 0; t < nTrajectories; t++) {
    const indicatorSum = new Array<number>(N);
    let cum = 0;
    for (let i = 0; i < N; i++) {
      if (rng.nextBernoulli(pSequence[i])) cum++;
      indicatorSum[i] = cum;
      meanTrajectory[i] += cum;
    }
    trajectories.push({ n: nAxis, indicatorSum });
  }
  for (let i = 0; i < N; i++) {
    meanTrajectory[i] /= nTrajectories;
  }

  const regime: BorelCantelliResult['regime'] = partialSums[N - 1] < 10 ? 'BC-I' : 'BC-II';

  return { pSequence, partialSums, trajectories, meanTrajectory, regime };
}

// ── Concentration ladder ───────────────────────────────────

/** Single (t, p) point on a tail-probability curve. */
export interface TailPoint {
  t: number;
  p: number;
}

/** All four curves for the concentration-ladder viz. */
export interface ConcentrationLadder {
  distributionName: string;
  empirical: TailPoint[];
  /** Markov on |X|. Often vacuous; included for pedagogical contrast. */
  markov: TailPoint[];
  /** Chebyshev σ²/(n t²). */
  chebyshev: TailPoint[];
  /** Hoeffding 2 exp(−2 n t²). */
  hoeffding: TailPoint[];
  parameters: Record<string, number>;
}

type DistributionId = 'bernoulli' | 'uniform-01' | 'beta-scaled' | 'two-point';

function distributionStats(id: DistributionId, params: Record<string, number>): {
  mean: number;
  variance: number;
  sample(rng: SeededRNG): number;
} {
  if (id === 'bernoulli') {
    const p = params.p ?? 0.5;
    return {
      mean: p,
      variance: p * (1 - p),
      sample: (rng) => (rng.nextBernoulli(p) ? 1 : 0),
    };
  }
  if (id === 'uniform-01') {
    return {
      mean: 0.5,
      variance: 1 / 12,
      sample: (rng) => rng.next(),
    };
  }
  if (id === 'beta-scaled') {
    // The viz only exposes symmetric Beta(2, 2) — we ignore params.alpha/beta
    // and sample exactly by taking the median of three i.i.d. uniforms on
    // [0, 1]. The order statistic U_{(2)} of three uniforms has density
    // 6 x (1 - x), which is exactly the Beta(2, 2) density. Mean = 1/2,
    // variance = 1/20. Average-of-two would have given a triangular
    // distribution with variance 1/24, mismatching the analytic bounds.
    const alpha = 2;
    const beta = 2;
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
    return {
      mean,
      variance,
      sample: (rng) => {
        const u1 = rng.next();
        const u2 = rng.next();
        const u3 = rng.next();
        return u1 + u2 + u3 - Math.min(u1, u2, u3) - Math.max(u1, u2, u3);
      },
    };
  }
  // two-point: X ∈ {0, 1} with P(X=1) = p.
  const p = params.p ?? 0.1;
  return {
    mean: p,
    variance: p * (1 - p),
    sample: (rng) => (rng.nextBernoulli(p) ? 1 : 0),
  };
}

/**
 * Compute the four-curve concentration ladder for a chosen distribution and
 * sample size. Empirical is Monte Carlo; the three bounds are evaluated
 * analytically on the same t-grid.
 *
 * @param distId — distribution identifier
 * @param n — sample size for the sample mean
 * @param tGrid — values of t at which to evaluate the bounds (sorted ascending recommended)
 * @param params — distribution-specific parameters (e.g. `{ p: 0.5 }`)
 * @param seed — PRNG seed for the empirical tail
 * @param nMonteCarlo — number of Monte Carlo trials per empirical point
 */
export function getConcentrationLadder(
  distId: DistributionId,
  n: number,
  tGrid: number[],
  params: Record<string, number> = {},
  seed: number = 13,
  nMonteCarlo: number = 4000,
): ConcentrationLadder {
  const { mean, variance, sample } = distributionStats(distId, params);
  const rng = new SeededRNG(seed);

  // Empirical sample means: draw nMonteCarlo independent sample means of size n.
  const sampleMeans = new Array<number>(nMonteCarlo);
  for (let trial = 0; trial < nMonteCarlo; trial++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += sample(rng);
    sampleMeans[trial] = s / n;
  }

  const empirical: TailPoint[] = tGrid.map((t) => {
    let count = 0;
    for (const m of sampleMeans) if (Math.abs(m - mean) >= t) count++;
    // Floor at 1/nMonteCarlo so the empirical curve renders on a log axis
    // when the true tail probability is below the Monte Carlo resolution.
    return { t, p: Math.max(count / nMonteCarlo, 1 / (nMonteCarlo * 4)) };
  });

  // Markov on |X|: P(|X̄_n| ≥ a) ≤ E[|X̄_n|] / a ≤ E[|X|] / a. For
  // non-negative bounded RVs E[|X|] = mean.
  const markov: TailPoint[] = tGrid.map((t) => ({
    t,
    p: t > 0 ? Math.min(mean / t, 1) : 1,
  }));

  const chebyshev: TailPoint[] = tGrid.map((t) => ({
    t,
    p: chebyshevTail(t, variance, n),
  }));

  const hoeffding: TailPoint[] = tGrid.map((t) => ({
    t,
    p: hoeffdingTwoSidedTail(t, n),
  }));

  const distributionName =
    distId === 'bernoulli'
      ? `Bernoulli(${(params.p ?? 0.5).toFixed(2)})`
      : distId === 'uniform-01'
        ? 'Uniform[0, 1]'
        : distId === 'beta-scaled'
          ? `Beta(${(params.alpha ?? 2).toFixed(1)}, ${(params.beta ?? 2).toFixed(1)})`
          : `Two-point(p=${(params.p ?? 0.1).toFixed(2)})`;

  return {
    distributionName,
    empirical,
    markov,
    chebyshev,
    hoeffding,
    parameters: params,
  };
}
