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
