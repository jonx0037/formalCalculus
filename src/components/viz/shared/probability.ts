/**
 * Shared utility module for the Probability Foundations track.
 * Created by Topic 35 (probability-and-union-bound); the first topic in Track 8.
 *
 * Provides:
 *  - SeededRNG (Mulberry32-based deterministic PRNG)
 *  - hoeffdingUpperBound: one-sided Hoeffding for a sum of bounded RVs
 *  - hoeffdingTwoSidedTail: two-sided Hoeffding for an i.i.d. sample mean on [0, 1]
 *  - chebyshevTail: Chebyshev's bound for the sample-mean tail
 *  - unionBoundDeviation: invert m · δ(t) = targetFwer for the per-event deviation
 *
 * All functions are pure and deterministic — no Math.random() at module scope.
 * Numerical agreement with `notebooks/probability-and-union-bound/35_probability_and_union_bound.ipynb`.
 */

// ── Seeded PRNG ────────────────────────────────────────────

/**
 * Mulberry32 — a 32-bit hash-based pseudorandom number generator. One word
 * of state, deterministic across runs, sufficient quality for visualization
 * Monte Carlo. Not cryptographic.
 *
 * Construct with an integer seed and call `.next()` for uniform draws on
 * [0, 1). `.nextInt(n)` and `.nextBernoulli(p)` are convenience wrappers.
 *
 * @example
 *   const rng = new SeededRNG(42);
 *   const u = rng.next();           // ≈ 0.376
 *   const b = rng.nextBernoulli(0.3); // true with probability 0.3
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    // |0 coerces to a 32-bit integer; any finite number works as a seed.
    this.state = seed | 0;
  }

  /** Uniform draw on [0, 1). */
  next(): number {
    let z = (this.state = (this.state + 0x6d2b79f5) | 0);
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [0, n). */
  nextInt(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** Bernoulli(p) — true with probability p. */
  nextBernoulli(p: number): boolean {
    return this.next() < p;
  }

  /** Box–Muller standard normal draw. */
  nextNormal(mean: number = 0, std: number = 1): number {
    // Avoid log(0).
    let u1 = 0;
    while (u1 === 0) u1 = this.next();
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z;
  }
}

// ── Concentration bounds ───────────────────────────────────

/** A range [a, b] for one of the bounded random variables in Hoeffding's setup. */
export interface BoundedRange {
  a: number;
  b: number;
}

/**
 * One-sided Hoeffding upper-tail bound:
 *
 *   P(S − E[S] ≥ t) ≤ exp(−2 t² / Σ (b_i − a_i)²)
 *
 * where S = Σ X_i and each X_i ∈ [a_i, b_i] almost surely. Returns 1 when t ≤ 0
 * (the inequality is vacuous) and when the denominator is non-positive.
 *
 * @param t — deviation threshold (one-sided)
 * @param ranges — array of [a_i, b_i] ranges
 */
export function hoeffdingUpperBound(t: number, ranges: BoundedRange[]): number {
  if (t <= 0) return 1;
  const denom = ranges.reduce((acc, r) => acc + (r.b - r.a) ** 2, 0);
  if (denom <= 0) return 1;
  return Math.exp((-2 * t * t) / denom);
}

/**
 * Two-sided Hoeffding tail bound for the sample mean of n i.i.d. random
 * variables bounded in [0, 1]:
 *
 *   P(|X̄_n − μ| ≥ ε) ≤ 2 exp(−2 n ε²)
 *
 * Caps the returned value at 1 (the inequality is vacuous near zero deviation).
 *
 * @param epsilon — deviation threshold
 * @param n — sample size
 */
export function hoeffdingTwoSidedTail(epsilon: number, n: number): number {
  if (epsilon <= 0 || n <= 0) return 1;
  return Math.min(2 * Math.exp(-2 * n * epsilon * epsilon), 1);
}

/**
 * Chebyshev's tail bound for a sample mean:
 *
 *   P(|X̄_n − μ| ≥ ε) ≤ σ² / (n ε²)
 *
 * Capped at 1. Returns 1 if ε ≤ 0 or n ≤ 0 or variance is non-finite.
 *
 * @param epsilon — deviation threshold
 * @param variance — population variance σ²
 * @param n — sample size
 */
export function chebyshevTail(epsilon: number, variance: number, n: number): number {
  if (epsilon <= 0 || n <= 0 || !Number.isFinite(variance) || variance < 0) return 1;
  return Math.min(variance / (n * epsilon * epsilon), 1);
}

/**
 * Solve for the per-event deviation t such that m · δ(t) = targetFwer. The
 * canonical "union bound + concentration" inversion (Theorem 8 / Example 6).
 *
 * Searches the supplied `tGrid` (assumed sorted ascending) for the smallest t
 * at which m · perEventTail(t) ≤ targetFwer. Returns Infinity if no t on the
 * grid satisfies the inequality (the grid is too coarse or too low).
 *
 * For the canonical Hoeffding-over-class case, pass
 *   perEventTail = (t) => hoeffdingTwoSidedTail(t, n)
 * and the result equals √(log(2m / δ) / (2n)).
 *
 * @param perEventTail — per-event tail function δ(t)
 * @param m — number of events
 * @param targetFwer — target family-wise error rate δ
 * @param tGrid — sorted ascending grid of candidate t values
 */
export function unionBoundDeviation(
  perEventTail: (t: number) => number,
  m: number,
  targetFwer: number,
  tGrid: number[],
): number {
  if (m <= 0 || targetFwer <= 0 || targetFwer >= 1 || tGrid.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  for (const t of tGrid) {
    if (m * perEventTail(t) <= targetFwer) return t;
  }
  return Number.POSITIVE_INFINITY;
}

// ── Numerical-stability helper ─────────────────────────────

/**
 * 1 − (1 − p)^m, evaluated stably for small p. Standard floating-point
 * subtractive cancellation makes the naïve expression lose precision when
 * `p` is small enough that `(1 − p)^m` is indistinguishable from 1; the
 * mathematically equivalent `−Math.expm1(m · Math.log1p(−p))` is stable.
 *
 * For `p ≥ 1` the formula collapses to 1 (event certain). For `p ≤ 0` it
 * collapses to 0 (event impossible).
 */
export function oneMinusOneMinusPToTheM(p: number, m: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return -Math.expm1(m * Math.log1p(-p));
}
