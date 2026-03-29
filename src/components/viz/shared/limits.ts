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
