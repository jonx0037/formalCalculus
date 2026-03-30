/**
 * Shared utility module for the Limits & Continuity track.
 * Created by Topic 1 (sequences-limits), extended by Topics 2–4.
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface ConvergenceResult {
  converges: boolean;
  limit: number | null;
  N: number | null;
  rate: 'sublinear' | 'linear' | 'superlinear' | 'quadratic' | 'unknown';
}

export interface CauchyCheck {
  isCauchy: boolean;
  maxGap: number;
  N: number;
}

// ── Sequence generation ─────────────────────────────────────

/**
 * Generate terms of a sequence as {n, value} pairs.
 */
export function generateSequence(
  fn: (n: number) => number,
  start: number,
  count: number,
): { n: number; value: number }[] {
  const result: { n: number; value: number }[] = [];
  for (let i = 0; i < count; i++) {
    const n = start + i;
    result.push({ n, value: fn(n) });
  }
  return result;
}

// ── Epsilon-N computation ───────────────────────────────────

/**
 * Compute the smallest N such that |a_n - L| < epsilon for ALL n >= N.
 *
 * Forward-scans from the candidate: if a_n leaves the band for any n >= N,
 * we advance N past that violation. This correctly handles oscillating
 * sequences like (-1)^n / n where a naive "find first n inside the band"
 * would give a wrong N.
 *
 * Returns null if no valid N is found within maxTerms.
 */
export function computeEpsilonN(
  sequence: (n: number) => number,
  limit: number,
  epsilon: number,
  maxTerms: number = 1000,
): number | null {
  let candidateN = 1;

  for (let n = 1; n <= maxTerms; n++) {
    if (Math.abs(sequence(n) - limit) >= epsilon) {
      // This term violates the bound — N must be at least n+1
      candidateN = n + 1;
    }
  }

  // Verify: candidateN must be within our search range
  if (candidateN > maxTerms) return null;

  return candidateN;
}

// ── Cauchy criterion ────────────────────────────────────────

/**
 * Check the Cauchy criterion: compute max |a_m - a_n| for m, n >= N
 * within a window of `windowSize` terms past N.
 */
export function checkCauchy(
  sequence: (n: number) => number,
  N: number,
  windowSize: number = 50,
): CauchyCheck {
  let maxGap = 0;

  // Precompute terms in the window
  const terms: number[] = [];
  for (let i = 0; i < windowSize; i++) {
    terms.push(sequence(N + i));
  }

  // Find max pairwise distance
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      const gap = Math.abs(terms[i] - terms[j]);
      if (gap > maxGap) maxGap = gap;
    }
  }

  // Heuristic: consider it Cauchy if maxGap < 0.01
  return {
    isCauchy: maxGap < 0.01,
    maxGap,
    N,
  };
}

// ── Convergence rate estimation ─────────────────────────────

/**
 * Estimate convergence rate from a sequence of errors |a_n - L|.
 *
 * - Sublinear: errors decrease but ratio |e_{n+1}|/|e_n| → 1
 * - Linear: ratio → r for some 0 < r < 1
 * - Superlinear: ratio → 0
 * - Quadratic: |e_{n+1}| / |e_n|^2 → C for some C > 0
 */
export function estimateConvergenceRate(
  errors: number[],
): 'sublinear' | 'linear' | 'superlinear' | 'quadratic' | 'unknown' {
  // Need at least 5 errors to estimate
  if (errors.length < 5) return 'unknown';

  // Filter out near-zero errors to avoid division issues
  const validErrors = errors.filter((e) => e > 1e-15);
  if (validErrors.length < 5) return 'unknown';

  // Compute ratios e_{n+1} / e_n
  const ratios: number[] = [];
  for (let i = 0; i < validErrors.length - 1; i++) {
    ratios.push(validErrors[i + 1] / validErrors[i]);
  }

  // Use the last few ratios for stability
  const tail = ratios.slice(-Math.min(5, ratios.length));
  const avgRatio = tail.reduce((s, r) => s + r, 0) / tail.length;

  // Check for quadratic: e_{n+1} / e_n^2
  const quadRatios: number[] = [];
  for (let i = 0; i < validErrors.length - 1; i++) {
    const eSquared = validErrors[i] * validErrors[i];
    if (eSquared > 1e-30) {
      quadRatios.push(validErrors[i + 1] / eSquared);
    }
  }

  if (quadRatios.length >= 3) {
    const quadTail = quadRatios.slice(-3);
    const quadVar =
      Math.max(...quadTail) - Math.min(...quadTail);
    const quadAvg = quadTail.reduce((s, r) => s + r, 0) / quadTail.length;
    // If quadratic ratios stabilize around a constant, it's quadratic
    if (quadVar / Math.abs(quadAvg + 1e-30) < 0.5 && quadAvg > 0.01 && quadAvg < 1e6) {
      return 'quadratic';
    }
  }

  // Classify by average linear ratio
  if (avgRatio < 0.01) return 'superlinear';
  if (avgRatio < 0.95) return 'linear';
  if (avgRatio < 1.0) return 'sublinear';

  return 'unknown';
}

// ── Epsilon-Delta computation (Topic 2) ─────────────────────

export interface EpsilonDeltaResult {
  delta: number;
  epsilon: number;
  a: number;
  L: number;
  verified: boolean;
}

export interface ContinuityCheck {
  isContinuous: boolean;
  type: 'continuous' | 'removable' | 'jump' | 'essential' | 'unknown';
  leftLimit: number | null;
  rightLimit: number | null;
  fOfA: number | null;
}

export interface LipschitzEstimate {
  isLipschitz: boolean;
  K: number;
  worstPair: [number, number];
}

/**
 * Compute a sufficient delta for the ε-δ definition of lim_{x→a} f(x) = L.
 *
 * Strategy: start with a candidate delta and verify it by sampling points
 * in (a - delta, a + delta). If any sample violates |f(x) - L| >= epsilon,
 * halve delta and retry. Returns null if no valid delta is found.
 */
export function computeEpsilonDelta(
  f: (x: number) => number,
  a: number,
  L: number,
  epsilon: number,
  samplePoints: number = 200,
): EpsilonDeltaResult | null {
  let delta = 1.0;

  for (let attempt = 0; attempt < 60; attempt++) {
    let valid = true;

    for (let i = 1; i <= samplePoints; i++) {
      // Sample points in (a - delta, a + delta), excluding a itself
      const t = i / (samplePoints + 1);
      const xLeft = a - delta * t;
      const xRight = a + delta * t;

      for (const x of [xLeft, xRight]) {
        const fx = f(x);
        if (!isFinite(fx) || Math.abs(fx - L) >= epsilon) {
          valid = false;
          break;
        }
      }
      if (!valid) break;
    }

    if (valid) {
      return { delta, epsilon, a, L, verified: true };
    }

    delta *= 0.5;
    if (delta < 1e-15) return null;
  }

  return null;
}

/**
 * Evaluate a one-sided limit numerically by approaching from one direction.
 * Returns null if the values don't stabilize.
 */
function oneSidedLimit(
  f: (x: number) => number,
  a: number,
  fromLeft: boolean,
  steps: number = 30,
): number | null {
  const values: number[] = [];
  for (let k = 1; k <= steps; k++) {
    const h = Math.pow(10, -k * 0.3);
    const x = fromLeft ? a - h : a + h;
    const fx = f(x);
    if (!isFinite(fx)) return null;
    values.push(fx);
  }

  // Check if the last several values stabilize
  const tail = values.slice(-8);
  const avg = tail.reduce((s, v) => s + v, 0) / tail.length;
  const maxDev = Math.max(...tail.map((v) => Math.abs(v - avg)));

  if (maxDev > 0.01) return null; // Not converging
  return avg;
}

/**
 * Check continuity at a point by evaluating one-sided limits numerically.
 */
export function checkContinuity(
  f: (x: number) => number,
  a: number,
): ContinuityCheck {
  const leftLimit = oneSidedLimit(f, a, true);
  const rightLimit = oneSidedLimit(f, a, false);

  let fOfA: number | null = null;
  try {
    const val = f(a);
    fOfA = isFinite(val) ? val : null;
  } catch {
    fOfA = null;
  }

  // Essential: at least one one-sided limit doesn't exist
  if (leftLimit === null || rightLimit === null) {
    return { isContinuous: false, type: 'essential', leftLimit, rightLimit, fOfA };
  }

  // Jump: one-sided limits exist but disagree
  if (Math.abs(leftLimit - rightLimit) > 0.001) {
    return { isContinuous: false, type: 'jump', leftLimit, rightLimit, fOfA };
  }

  const limit = (leftLimit + rightLimit) / 2;

  // Removable: limit exists but f(a) is undefined or doesn't match
  if (fOfA === null || Math.abs(fOfA - limit) > 0.001) {
    return { isContinuous: false, type: 'removable', leftLimit, rightLimit, fOfA };
  }

  return { isContinuous: true, type: 'continuous', leftLimit, rightLimit, fOfA };
}

/**
 * Estimate the Lipschitz constant of f on [a, b] by sampling.
 * Computes max |f(x) - f(y)| / |x - y| over a grid of sample pairs.
 */
export function estimateLipschitz(
  f: (x: number) => number,
  a: number,
  b: number,
  samplePoints: number = 300,
): LipschitzEstimate {
  let maxRatio = 0;
  let worstPair: [number, number] = [a, b];

  const step = (b - a) / samplePoints;

  for (let i = 0; i <= samplePoints; i++) {
    const x = a + i * step;
    const fx = f(x);
    if (!isFinite(fx)) continue;

    for (let j = i + 1; j <= Math.min(i + 20, samplePoints); j++) {
      const y = a + j * step;
      const fy = f(y);
      if (!isFinite(fy)) continue;

      const dist = Math.abs(x - y);
      if (dist < 1e-15) continue;

      const ratio = Math.abs(fx - fy) / dist;
      if (ratio > maxRatio) {
        maxRatio = ratio;
        worstPair = [x, y];
      }
    }
  }

  // Consider it Lipschitz if the max ratio is finite and reasonable
  const isLipschitz = isFinite(maxRatio) && maxRatio < 1e6;

  return { isLipschitz, K: maxRatio, worstPair };
}

/**
 * Bisection root-finding: find c ∈ (a,b) with |f(c)| < tolerance.
 * Requires f(a) and f(b) have opposite signs (IVT precondition).
 * Returns the sequence of midpoints (for animation) and the final root.
 */
export function bisection(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance: number = 1e-8,
  maxSteps: number = 50,
): { root: number; steps: { a: number; b: number; mid: number; fMid: number }[] } {
  const steps: { a: number; b: number; mid: number; fMid: number }[] = [];

  let lo = a;
  let hi = b;
  let fLo = f(lo);

  for (let i = 0; i < maxSteps; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);

    steps.push({ a: lo, b: hi, mid, fMid });

    if (Math.abs(fMid) < tolerance || (hi - lo) / 2 < tolerance) {
      return { root: mid, steps };
    }

    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  return { root: (lo + hi) / 2, steps };
}

// ── Deterministic random ────────────────────────────────────

/**
 * Seeded pseudo-random number generator using a linear congruential generator.
 * Returns a function that produces values in [0, 1) deterministically.
 * Never use Math.random() in viz components — use this instead.
 */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // LCG parameters from Numerical Recipes
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0x100000000;
  };
}

// ── Completeness & Compactness (Topic 3) ─────────────────────

export interface NestedIntervalResult {
  intervals: { a: number; b: number }[];
  limit: number;
  converged: boolean;
  steps: number;
}

export interface CompactnessCheck {
  isCompact: boolean;
  isClosed: boolean;
  isBounded: boolean;
  failureReason: 'not-closed' | 'not-bounded' | null;
  escapingSubsequence?: number[];
}

export interface SublevelSet {
  level: number;
  isBounded: boolean;
  bounds: [number, number] | null;
}

/**
 * Run bisection on an interval [a, b] targeting a value where checkFn determines
 * which half to keep. Returns the full history of nested intervals.
 */
export function nestedIntervalBisection(
  a: number,
  b: number,
  checkFn: (mid: number) => 'left' | 'right',
  maxSteps: number = 30,
): NestedIntervalResult {
  const intervals: { a: number; b: number }[] = [{ a, b }];

  let lo = a;
  let hi = b;

  for (let i = 0; i < maxSteps; i++) {
    const mid = (lo + hi) / 2;
    const direction = checkFn(mid);

    if (direction === 'left') {
      hi = mid;
    } else {
      lo = mid;
    }

    intervals.push({ a: lo, b: hi });

    if (hi - lo < 1e-14) {
      return { intervals, limit: (lo + hi) / 2, converged: true, steps: i + 1 };
    }
  }

  return { intervals, limit: (lo + hi) / 2, converged: hi - lo < 1e-10, steps: maxSteps };
}

/**
 * Extract a convergent subsequence from a given sequence.
 * Strategy: partition values into buckets, find the densest bucket (most
 * values clustered together), then filter elements within that bucket that
 * stay close to the cluster center. This approximates Bolzano-Weierstrass —
 * finding a subsequence that converges to a cluster point.
 * Returns the subsequence, its indices, and the estimated limit.
 * Note: the extracted subsequence is not guaranteed to be monotone.
 */
export function extractConvergentSubsequence(
  sequence: number[],
  tolerance: number = 1e-6,
): { subsequence: number[]; indices: number[]; limit: number | null; converges: boolean } {
  if (sequence.length === 0) {
    return { subsequence: [], indices: [], limit: null, converges: false };
  }

  // Find the value that appears most densely: partition into buckets
  const min = Math.min(...sequence);
  const max = Math.max(...sequence);
  const range = max - min || 1;
  const bucketCount = Math.max(10, Math.floor(sequence.length / 3));
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  const bucketIndices: number[][] = Array.from({ length: bucketCount }, () => []);

  for (let i = 0; i < sequence.length; i++) {
    const idx = Math.min(
      bucketCount - 1,
      Math.floor(((sequence[i] - min) / range) * bucketCount),
    );
    buckets[idx].push(sequence[i]);
    bucketIndices[idx].push(i);
  }

  // Find densest bucket
  let bestBucket = 0;
  for (let i = 1; i < bucketCount; i++) {
    if (buckets[i].length > buckets[bestBucket].length) {
      bestBucket = i;
    }
  }

  // Extract a cluster subsequence from the densest bucket
  const candidates = bucketIndices[bestBucket];
  const subIndices: number[] = [candidates[0]];
  const sub: number[] = [sequence[candidates[0]]];

  for (let i = 1; i < candidates.length; i++) {
    const val = sequence[candidates[i]];
    if (Math.abs(val - sub[sub.length - 1]) < Math.abs(sub[sub.length - 1] - sub[0]) + tolerance) {
      subIndices.push(candidates[i]);
      sub.push(val);
    }
  }

  // Estimate limit as mean of last few elements
  const tail = sub.slice(-Math.max(3, Math.floor(sub.length / 2)));
  const limit = tail.reduce((s, v) => s + v, 0) / tail.length;

  // Check convergence: do the tail elements cluster?
  const maxDev = Math.max(...tail.map(v => Math.abs(v - limit)));
  const converges = maxDev < tolerance || (sub.length >= 3 && maxDev < range * 0.05);

  return { subsequence: sub, indices: subIndices, limit, converges };
}

/**
 * Check if a function is coercive on a given domain by sampling.
 * A function is coercive if f(x) → ∞ as |x| → ∞.
 * Returns whether sublevel sets appear bounded.
 */
export function checkCoercivity(
  f: (x: number) => number,
  sampleRange: [number, number],
  samplePoints: number = 200,
): { isCoercive: boolean; sublevelSets: SublevelSet[] } {
  const [lo, hi] = sampleRange;
  const step = (hi - lo) / samplePoints;

  // Sample function values
  const samples: { x: number; y: number }[] = [];
  for (let i = 0; i <= samplePoints; i++) {
    const x = lo + step * i;
    samples.push({ x, y: f(x) });
  }

  // Check coercivity: values at boundaries should be large
  // Clamp to at least 1 so boundary slices are never empty (avoids Math.min(...[]) = Infinity).
  const boundaryWidth = Math.max(1, Math.floor(samplePoints * 0.1));
  const leftValues = samples.slice(0, boundaryWidth).map(s => s.y);
  const rightValues = samples.slice(-boundaryWidth).map(s => s.y);
  const interiorValues = samples.slice(boundaryWidth, -boundaryWidth).map(s => s.y);

  const leftMin = Math.min(...leftValues);
  const rightMin = Math.min(...rightValues);
  const interiorMin = Math.min(...interiorValues);

  const isCoercive = leftMin > interiorMin && rightMin > interiorMin;

  // Compute sublevel sets at several levels
  const fMin = Math.min(...samples.map(s => s.y));
  const fMax = Math.max(...samples.map(s => s.y));
  const levels = [0.25, 0.5, 0.75].map(t => fMin + t * (fMax - fMin));

  const sublevelSets: SublevelSet[] = levels.map(level => {
    const inSet = samples.filter(s => s.y <= level);
    if (inSet.length === 0) {
      return { level, isBounded: true, bounds: null };
    }
    const xMin = Math.min(...inSet.map(s => s.x));
    const xMax = Math.max(...inSet.map(s => s.x));

    // Bounded if the sublevel set doesn't touch the sample boundaries
    const touchesLeft = xMin <= lo + step * 2;
    const touchesRight = xMax >= hi - step * 2;
    const isBounded = !touchesLeft && !touchesRight;

    return { level, isBounded, bounds: [xMin, xMax] as [number, number] };
  });

  return { isCoercive, sublevelSets };
}

// ── Uniform Convergence (Topic 4) ─────────────────────────────

export interface UniformConvergenceCheck {
  isUniform: boolean;
  supNorm: number;
  fitsInBand: boolean;
  epsilon: number;
  n: number;
}

export interface MTestResult {
  passes: boolean;
  partialMSum: number;
  tailBound: number;
  actualSupError: number;
}

export interface EquicontinuityCheck {
  isEquicontinuous: boolean;
  delta: number | null;
  epsilon: number;
  worstCaseF: number;
}

/**
 * Check uniform convergence of f_n to f at a given n and epsilon.
 * Evaluates ||f_n - f||_∞ on a dense grid over the domain.
 */
export function checkUniformConvergence(
  fn: (x: number) => number,
  limit: (x: number) => number,
  domain: [number, number],
  epsilon: number,
  gridSize: number = 500,
): UniformConvergenceCheck {
  const [a, b] = domain;
  const step = (b - a) / gridSize;
  let supNorm = 0;

  for (let i = 0; i <= gridSize; i++) {
    const x = a + step * i;
    const diff = Math.abs(fn(x) - limit(x));
    if (diff > supNorm) supNorm = diff;
  }

  return {
    isUniform: supNorm < epsilon,
    supNorm,
    fitsInBand: supNorm < epsilon,
    epsilon,
    n: 0, // Caller sets this contextually
  };
}

/**
 * Apply the Weierstrass M-test to a series of functions.
 * Computes partial M-sum, estimates tail bound, and measures actual error.
 *
 * The tail bound is estimated by summing M_k for k = n+1..maxK.
 * The actual sup error is ||S_maxK - S_n||_∞ on a dense grid.
 */
export function weierstrassMTest(
  term: (x: number, k: number) => number,
  Mk: (k: number) => number,
  domain: [number, number],
  n: number,
  maxK: number = 200,
  gridSize: number = 300,
): MTestResult {
  const [a, b] = domain;
  const step = (b - a) / gridSize;

  // Partial sum of M_k for k = 1..n
  let partialMSum = 0;
  for (let k = 1; k <= n; k++) partialMSum += Mk(k);

  // Tail bound: sum M_k for k = n+1..maxK
  let tailBound = 0;
  for (let k = n + 1; k <= maxK; k++) tailBound += Mk(k);

  // Check if full series M_k converges (sum to maxK as proxy)
  let totalMSum = partialMSum + tailBound;
  const passes = totalMSum < Infinity && Mk(maxK) < 1e-10;

  // Actual sup error: ||S_maxK - S_n||_∞
  let actualSupError = 0;
  for (let i = 0; i <= gridSize; i++) {
    const x = a + step * i;
    let tail = 0;
    for (let k = n + 1; k <= maxK; k++) tail += term(x, k);
    const absTail = Math.abs(tail);
    if (absTail > actualSupError) actualSupError = absTail;
  }

  return { passes, partialMSum, tailBound, actualSupError };
}

/**
 * Check equicontinuity of a family of functions at a point x0.
 * Tests whether a single delta controls |f(x) - f(x0)| < epsilon
 * for ALL functions in the family simultaneously.
 */
export function checkEquicontinuity(
  family: ((x: number) => number)[],
  x0: number,
  epsilon: number,
  domain: [number, number],
  gridSize: number = 300,
): EquicontinuityCheck {
  const [a, b] = domain;
  const step = (b - a) / gridSize;

  // For each function, find the smallest delta needed
  let worstDelta = Infinity;
  let worstCaseF = 0;

  for (let fi = 0; fi < family.length; fi++) {
    const f = family[fi];
    const fx0 = f(x0);
    let thisDelta = Infinity;

    // Scan outward from x0 to find where |f(x) - f(x0)| first exceeds epsilon
    for (let i = 0; i <= gridSize; i++) {
      const x = a + step * i;
      const dist = Math.abs(x - x0);
      if (dist < 1e-12) continue;
      if (Math.abs(f(x) - fx0) >= epsilon) {
        if (dist < thisDelta) thisDelta = dist;
      }
    }

    if (thisDelta < worstDelta) {
      worstDelta = thisDelta;
      worstCaseF = fi;
    }
  }

  const isEquicontinuous = worstDelta > step * 2; // Delta exists (not degenerate)
  return {
    isEquicontinuous,
    delta: isEquicontinuous ? worstDelta * 0.9 : null, // Slight safety margin
    epsilon,
    worstCaseF,
  };
}

/**
 * Extract a convergent subsequence from a family of functions
 * on a discrete grid — finite-dimensional approximation of
 * the Arzelà-Ascoli diagonal argument.
 *
 * 1. Evaluate all functions on a grid.
 * 2. At each grid point, sort by value and take a greedy
 *    subsequence that converges at that point.
 * 3. Diagonalize across grid points.
 */
export function extractUniformSubsequence(
  family: ((x: number) => number)[],
  domain: [number, number],
  gridSize: number = 50,
): { indices: number[]; limitApprox: (x: number) => number; supNormErrors: number[] } {
  const [a, b] = domain;
  const step = (b - a) / gridSize;
  const gridPoints: number[] = [];
  for (let i = 0; i <= gridSize; i++) gridPoints.push(a + step * i);

  // Evaluate all functions on the grid
  const values: number[][] = family.map(f => gridPoints.map(x => f(x)));

  // Start with all indices
  let currentIndices = family.map((_, i) => i);

  // Diagonal extraction: at each grid point, extract a subsequence
  // that converges at that point (sort by value, take monotone subsequence)
  for (let gi = 0; gi < gridPoints.length && currentIndices.length > 1; gi++) {
    // Sort current indices by their value at this grid point
    const sorted = [...currentIndices].sort(
      (a, b) => values[a][gi] - values[b][gi],
    );
    // Take every other index to get a sparser, more convergent subsequence
    // (crude finite approximation of Bolzano-Weierstrass extraction)
    if (sorted.length > 4) {
      currentIndices = sorted.filter((_, i) => i % 2 === 0);
    } else {
      currentIndices = sorted;
    }
  }

  // Build piecewise-linear limit approximation from the last function in subsequence
  const lastIdx = currentIndices[currentIndices.length - 1];
  const lastValues = values[lastIdx];

  const limitApprox = (x: number): number => {
    const t = (x - a) / (b - a);
    const gi = t * gridSize;
    const lo = Math.max(0, Math.min(gridSize - 1, Math.floor(gi)));
    const hi = lo + 1;
    if (hi > gridSize) return lastValues[lo];
    const frac = gi - lo;
    return lastValues[lo] * (1 - frac) + lastValues[hi] * frac;
  };

  // Compute sup-norm errors for each function in the subsequence
  const supNormErrors = currentIndices.map(idx => {
    let maxErr = 0;
    for (let gi = 0; gi <= gridSize; gi++) {
      const err = Math.abs(values[idx][gi] - lastValues[gi]);
      if (err > maxErr) maxErr = err;
    }
    return maxErr;
  });

  return { indices: currentIndices, limitApprox, supNormErrors };
}
