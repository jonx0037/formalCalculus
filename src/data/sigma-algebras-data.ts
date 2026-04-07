/**
 * Data presets and constructive utilities for the Sigma-Algebras & Measures topic (Topic 25).
 * All functions are pure and deterministic — no Math.random().
 *
 * Provides typed helpers for the four interactive visualizations:
 *  - Cantor middle-thirds set construction (standard and "fat" variants)
 *  - Outer measure covers of a target subset of [0, 1]
 *  - Dyadic simple-function approximation of a non-negative target function
 *  - Riemann vs. Lebesgue partitioning of the same function
 *
 * Topic 25 is the first topic in Track 7 (Measure & Integration) and
 * intentionally creates no shared utility module — the decision to introduce
 * a `measure.ts` shared module is deferred to Topic 26 (Lebesgue Integral),
 * when cross-topic reuse will justify the abstraction.
 */

// ── Interfaces ─────────────────────────────────────────────

/** A closed interval [a, b] on the real line. */
export interface MeasureInterval {
  a: number;
  b: number;
}

/** One iteration of the Cantor set construction. */
export interface CantorIteration {
  iteration: number;
  intervals: MeasureInterval[];
  totalLength: number;
  intervalCount: number;
}

/** A covering of a target set by open intervals (used to bound outer measure). */
export interface OuterMeasureCover {
  targetSet: MeasureInterval[];
  cover: MeasureInterval[];
  coverLength: number;
  exactMeasure: number;
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

/** Riemann partition data: domain-slicing of [0, 1]. */
export interface RiemannPartition {
  subintervals: MeasureInterval[];
  /** Function value at the chosen sample point of each subinterval. */
  heights: number[];
  /** The Riemann sum Σ heights[i] · width[i]. */
  sum: number;
}

/** Lebesgue partition data: range-slicing of [yMin, yMax]. */
export interface LebesguePartition {
  /** y_0, y_1, ..., y_n — the (n + 1) range-partition points. */
  levels: number[];
  /**
   * For each level k ∈ [0, n - 1], the preimage set
   * { x : f(x) ∈ [y_k, y_{k+1}) } as a finite union of intervals.
   */
  preimageSets: MeasureInterval[][];
  /** The Lebesgue sum Σ y_k · λ(preimage_k). */
  sum: number;
}

/** A named target function for the viz components. */
export interface PresetFunction {
  name: string;
  label: string;
  f: (x: number) => number;
  /** Closed-form integral over [0, 1], or null if unknown / not Riemann-integrable. */
  integralExact: number | null;
  /** Maximum value attained on [0, 1] (used by the dyadic approximation). */
  maxValue: number;
  description: string;
}

// ── Cantor set construction ────────────────────────────────

/** Construction variant for the Cantor-style iterative set. */
export type CantorVariant = 'middle-thirds' | 'smith-volterra';

/**
 * Generate the first n iterations of a Cantor-style construction.
 *
 * Two variants are supported:
 *
 * 1. **`middle-thirds`** — the classical Cantor set. At every step, remove
 *    the open middle 1/3 of each remaining interval. After n steps, every
 *    interval has length 1/3ⁿ and the total length is (2/3)ⁿ → 0.
 *
 * 2. **`smith-volterra`** — a "fat" Cantor set with positive limiting measure.
 *    At step k (1-indexed), remove a centered open interval of length 1/4ᵏ
 *    from EACH of the 2^(k-1) remaining intervals. The total length removed
 *    is Σ_{k=1}^∞ 2^(k-1) · 1/4ᵏ = Σ 1/2^(k+1) = 1/2, so the limiting set
 *    has Lebesgue measure 1/2. Like the standard Cantor set, it is closed,
 *    nowhere dense, and uncountable — but its positive measure shows that
 *    "uncountable + measure zero" is a contingent fact about middle-thirds,
 *    not a logical necessity.
 *
 * @param n — number of iterations (returns iterations 0..n inclusive).
 * @param variant — which construction to use (default: 'middle-thirds').
 */
export function getCantorIterations(
  n: number,
  variant: CantorVariant = 'middle-thirds',
): CantorIteration[] {
  const iterations: CantorIteration[] = [];
  let intervals: MeasureInterval[] = [{ a: 0, b: 1 }];

  iterations.push({
    iteration: 0,
    intervals: intervals.map((iv) => ({ ...iv })),
    totalLength: 1,
    intervalCount: 1,
  });

  for (let step = 1; step <= n; step++) {
    // Determine the *length to remove* from each current interval at this step.
    // For middle-thirds, we remove the middle 1/3 of each interval (so the
    // removed length is L/3, where L is the current interval length).
    // For smith-volterra, we remove a fixed-length 1/4^step from each interval,
    // independent of L — this is what makes the limit set "fat".
    const next: MeasureInterval[] = [];
    for (const { a, b } of intervals) {
      const L = b - a;
      let removeLen: number;
      if (variant === 'middle-thirds') {
        removeLen = L / 3;
      } else {
        removeLen = Math.pow(1 / 4, step);
        // Safety: never remove more than the interval can lose
        if (removeLen >= L) removeLen = L * 0.99;
      }
      const halfRemaining = (L - removeLen) / 2;
      next.push({ a, b: a + halfRemaining });
      next.push({ a: b - halfRemaining, b });
    }
    intervals = next;
    const totalLength = intervals.reduce((sum, iv) => sum + (iv.b - iv.a), 0);
    iterations.push({
      iteration: step,
      intervals: intervals.map((iv) => ({ ...iv })),
      totalLength,
      intervalCount: intervals.length,
    });
  }

  return iterations;
}

// ── Outer measure covers ───────────────────────────────────

/**
 * Generate an open-interval cover of a target set, with `nIntervals` covering
 * intervals distributed evenly over the target. The cover always overshoots
 * the target with a gap that shrinks as `nIntervals` grows — illustrating the
 * infimum convergence λ*(A) = inf { Σ |I_k| : A ⊂ ∪ I_k }.
 *
 * The notebook demonstrates the canonical case targetSet = [{ a: 0.3, b: 0.7 }]
 * with covers giving total lengths 0.80 (1 interval), 0.57 (2 intervals),
 * and 0.44 (3 intervals).
 *
 * @param targetSet — array of disjoint closed intervals to cover.
 * @param nIntervals — number of covering open intervals to use (≥ 1).
 */
export function getOuterMeasureCover(
  targetSet: MeasureInterval[],
  nIntervals: number,
): OuterMeasureCover {
  if (targetSet.length === 0 || nIntervals < 1) {
    return { targetSet: [], cover: [], coverLength: 0, exactMeasure: 0 };
  }

  const exactMeasure = targetSet.reduce((sum, iv) => sum + (iv.b - iv.a), 0);

  // Strategy: split the target's enveloping span into nIntervals equal sub-spans
  // and pad each one outward by an epsilon that shrinks faster than 1/n. With
  // epsilon ~ 1/n² the total cover length = span + 2n·epsilon ≈ span + O(1/n),
  // which monotonically approaches the exact measure as n grows — the
  // pedagogical point of the infimum visualization.
  const targetMin = Math.min(...targetSet.map((iv) => iv.a));
  const targetMax = Math.max(...targetSet.map((iv) => iv.b));
  const span = targetMax - targetMin;

  // Padding shrinks as 1/n², so total cover length = span + 2n·(0.4·span/n²)
  // = span · (1 + 0.8/n) → span as n → ∞.
  const epsilon = (0.4 * span) / (nIntervals * nIntervals);

  const cover: MeasureInterval[] = [];
  for (let i = 0; i < nIntervals; i++) {
    const rawA = targetMin + (i / nIntervals) * span - epsilon;
    const rawB = targetMin + ((i + 1) / nIntervals) * span + epsilon;
    // Clamp to [0, 1] so downstream viz never renders off-canvas. Skip
    // degenerate intervals that collapse to a point after clamping.
    const a = Math.max(0, rawA);
    const b = Math.min(1, rawB);
    if (a < b) {
      cover.push({ a, b });
    }
  }

  // Cover length = sum of widths (overlaps are intentional — this is an
  // infimum demonstration, not a measure-of-union computation)
  const coverLength = cover.reduce((sum, iv) => sum + (iv.b - iv.a), 0);

  return { targetSet, cover, coverLength, exactMeasure };
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

// ── Riemann partition ──────────────────────────────────────

/**
 * Compute a uniform Riemann partition of [0, 1] using `n` subintervals and the
 * specified sample-point rule.
 *
 * @param f — the target function.
 * @param n — number of subintervals (≥ 1).
 * @param rule — sample-point rule: 'left' (default), 'right', or 'midpoint'.
 */
export function getRiemannPartition(
  f: (x: number) => number,
  n: number,
  rule: 'left' | 'right' | 'midpoint' = 'left',
): RiemannPartition {
  const width = 1 / n;
  const subintervals: MeasureInterval[] = [];
  const heights: number[] = [];
  let sum = 0;

  for (let i = 0; i < n; i++) {
    const a = i * width;
    const b = (i + 1) * width;
    let sample: number;
    if (rule === 'left') sample = a;
    else if (rule === 'right') sample = b;
    else sample = (a + b) / 2;

    const h = f(sample);
    subintervals.push({ a, b });
    heights.push(h);
    sum += h * width;
  }

  return { subintervals, heights, sum };
}

// ── Lebesgue partition ─────────────────────────────────────

/**
 * Compute a Lebesgue partition of the *range* [yMin, yMax] using `n` levels.
 * For each level k, the preimage set { x ∈ [0, 1] : f(x) ∈ [y_k, y_{k+1}) }
 * is recovered by scanning a high-resolution sample of [0, 1] and grouping
 * consecutive x-values whose f-value falls in the same level bucket.
 *
 * @param f — the target function on [0, 1].
 * @param n — number of range levels (≥ 1).
 * @param yMin — lower bound of the value range to slice.
 * @param yMax — upper bound of the value range to slice.
 * @param resolution — x-axis sampling resolution for preimage computation.
 */
export function getLebesguePartition(
  f: (x: number) => number,
  n: number,
  yMin: number,
  yMax: number,
  resolution: number = 2000,
): LebesguePartition {
  const levels: number[] = [];
  for (let k = 0; k <= n; k++) {
    levels.push(yMin + (k / n) * (yMax - yMin));
  }

  // For each level k, find the preimage set as consecutive runs of x in [0, 1]
  const preimageSets: MeasureInterval[][] = Array.from({ length: n }, () => []);

  // Track the previous bucket and group start so consecutive runs collapse
  // into single intervals.
  const buckets: number[] = [];
  for (let i = 0; i <= resolution; i++) {
    const x = i / resolution;
    const fx = f(x);
    let bucket = Math.floor(((fx - yMin) / (yMax - yMin)) * n);
    if (bucket < 0 || bucket >= n) bucket = -1; // out of range
    buckets.push(bucket);
  }

  let prevBucket = -2;
  let groupStart = 0;
  for (let i = 0; i <= resolution; i++) {
    const x = i / resolution;
    const bucket = buckets[i];
    if (bucket !== prevBucket) {
      if (prevBucket >= 0) {
        const groupEnd = (i - 1) / resolution;
        preimageSets[prevBucket].push({ a: groupStart, b: groupEnd });
      }
      groupStart = x;
      prevBucket = bucket;
    }
  }
  if (prevBucket >= 0) {
    preimageSets[prevBucket].push({ a: groupStart, b: 1 });
  }

  // Lebesgue sum: Σ y_k · λ(preimage_k), with y_k taken at the *lower* end of
  // each level (consistent with the simple-function approximation from below).
  let sum = 0;
  for (let k = 0; k < n; k++) {
    const measure = preimageSets[k].reduce((s, iv) => s + (iv.b - iv.a), 0);
    sum += levels[k] * measure;
  }

  return { levels, preimageSets, sum };
}

// ── Preset functions ───────────────────────────────────────

/**
 * The four preset target functions used by the Riemann-vs-Lebesgue and
 * SimpleFunctionApproximator visualizations. These match the source notebook
 * (`notebooks/sigma-algebras/25_sigma_algebras.ipynb`) so the on-page demos
 * tell the same story as the static figures.
 *
 * The Dirichlet indicator 1_ℚ is described in prose only — it has no
 * meaningful float-arithmetic implementation (every JS number is rational).
 */
export function getPresetFunctions(): PresetFunction[] {
  return [
    {
      name: 'sin-pi-x',
      label: 'sin(πx)',
      f: (x) => Math.sin(Math.PI * x),
      integralExact: 2 / Math.PI, // ≈ 0.6366197723675814
      maxValue: 1,
      description:
        'A smooth, well-behaved bump on [0, 1]. Both Riemann and Lebesgue integrals agree exactly with the closed form 2/π. Use this preset to see the two strategies converge in lockstep.',
    },
    {
      name: 'x-squared',
      label: 'x²',
      f: (x) => x * x,
      integralExact: 1 / 3,
      maxValue: 1,
      description:
        'The classic monotone test function. Riemann uses uniform x-slices; Lebesgue uses uniform y-slices and pulls back to non-uniform x-intervals. Both converge to 1/3, but the Lebesgue partition concentrates resolution where the function is steep.',
    },
    {
      name: 'exp-minus-one',
      label: 'eˣ − 1',
      f: (x) => Math.exp(x) - 1,
      integralExact: Math.E - 2, // ≈ 0.7182818284590452
      maxValue: Math.E - 1, // ≈ 1.7182818284590452
      description:
        'Strictly increasing exponential. The Lebesgue partition\'s preimage sets get progressively shorter as the function steepens — visually demonstrating that range-slicing adapts to the function\'s shape automatically.',
    },
    {
      name: 'x-sin-1-over-x',
      label: 'x · sin(1/x) on [0.001, 1]',
      // x · sin(1/x) is highly oscillatory near 0 — the singularity at x = 0
      // is removed by clipping to [0.001, 1] for numerical stability.
      f: (x) => {
        if (x < 0.001) return 0;
        return x * Math.sin(1 / x);
      },
      // Numerical reference (no closed form): ≈ 0.3786 by adaptive quadrature
      integralExact: 0.3786,
      // Function takes negative values too, but for the simple-function
      // approximation (which assumes f ≥ 0) we use |f| in viz consumers.
      maxValue: 1,
      description:
        'A genuinely oscillatory function — Riemann-integrable but pathologically wiggly near 0. Riemann needs a fine partition to track the oscillations; Lebesgue range-slicing handles them naturally. This is the preset that most clearly favors the Lebesgue picture.',
    },
  ];
}
