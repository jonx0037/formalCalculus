/**
 * Shared utility module for the Sequences, Series & Approximation track (Track 5).
 * Created by Topic 17 (series-convergence). Will be extended by Topics 18–20
 * (power series, Fourier series, approximation theory).
 *
 * Builds on limits.ts — importing generateSequence and computeEpsilonN, because
 * series convergence IS sequence convergence of the partial-sum sequence.
 *
 * All functions are pure and deterministic — no Math.random().
 */

// ── Interfaces ──────────────────────────────────────────────

export interface PartialSumResult {
  n: number;
  Sn: number;
  an: number;
  error: number | null;
}

export interface RatioTestDiagnostic {
  n: number;
  ratio: number;
}

export interface RootTestDiagnostic {
  n: number;
  root: number;
}

export interface ConvergenceVerdict {
  converges: boolean | null;
  diagnostic: number | null;
  label: string;
}

// ── Partial-sum computation ─────────────────────────────────

/**
 * Compute the first maxN partial sums of a series defined by its term function.
 *
 * The partial sum S_n = a_1 + a_2 + ... + a_n is accumulated incrementally.
 * If exactSum is provided, the error |S_n - S| is computed at each step.
 */
export function computePartialSums(
  term: (n: number) => number,
  maxN: number,
  exactSum?: number,
): PartialSumResult[] {
  const results: PartialSumResult[] = [];
  let Sn = 0;

  for (let n = 1; n <= maxN; n++) {
    const an = term(n);
    Sn += an;
    results.push({
      n,
      Sn,
      an,
      error: exactSum !== undefined ? Math.abs(Sn - exactSum) : null,
    });
  }

  return results;
}

// ── Convergence tests ───────────────────────────────────────

/**
 * Apply the divergence test (nth-term test): check if a_n → 0.
 *
 * If lim a_n ≠ 0, the series diverges. If a_n → 0, the test is inconclusive.
 * We check the last 20% of terms — if they don't approach zero, diverges.
 */
export function divergenceTest(
  term: (n: number) => number,
  maxN: number = 200,
): ConvergenceVerdict {
  const tailStart = Math.max(1, Math.floor(maxN * 0.8));
  const tailTerms: number[] = [];

  for (let n = tailStart; n <= maxN; n++) {
    tailTerms.push(Math.abs(term(n)));
  }

  if (tailTerms.length === 0) {
    return { converges: null, diagnostic: null, label: 'Inconclusive (no terms)' };
  }

  const avgTail = tailTerms.reduce((s, v) => s + v, 0) / tailTerms.length;

  // If the average of |a_n| in the tail is still > 0.01, terms don't approach 0
  if (avgTail > 0.01) {
    return {
      converges: false,
      diagnostic: avgTail,
      label: `Diverges: aₙ ↛ 0 (avg tail ≈ ${avgTail.toFixed(4)})`,
    };
  }

  return {
    converges: null,
    diagnostic: avgTail,
    label: `Inconclusive: aₙ → 0 (avg tail ≈ ${avgTail.toExponential(2)})`,
  };
}

/**
 * Apply the ratio test: compute |a_{n+1}/a_n| for n = 1..maxN.
 *
 * L < 1 → converges absolutely; L > 1 → diverges; L = 1 → inconclusive.
 * We estimate L from the average of the last 20% of diagnostic values.
 */
export function ratioTest(
  term: (n: number) => number,
  maxN: number = 200,
): { diagnostics: RatioTestDiagnostic[]; verdict: ConvergenceVerdict } {
  const diagnostics: RatioTestDiagnostic[] = [];

  for (let n = 1; n < maxN; n++) {
    const an = Math.abs(term(n));
    const an1 = Math.abs(term(n + 1));

    if (an > 1e-15) {
      diagnostics.push({ n, ratio: an1 / an });
    }
  }

  if (diagnostics.length < 5) {
    return {
      diagnostics,
      verdict: { converges: null, diagnostic: null, label: 'Inconclusive (insufficient data)' },
    };
  }

  // Estimate L from the tail
  const tailCount = Math.max(5, Math.floor(diagnostics.length * 0.2));
  const tail = diagnostics.slice(-tailCount);
  const L = tail.reduce((s, d) => s + d.ratio, 0) / tail.length;

  let verdict: ConvergenceVerdict;
  if (L < 0.99) {
    verdict = { converges: true, diagnostic: L, label: `Converges: L ≈ ${L.toFixed(4)} < 1` };
  } else if (L > 1.01) {
    verdict = { converges: false, diagnostic: L, label: `Diverges: L ≈ ${L.toFixed(4)} > 1` };
  } else {
    verdict = { converges: null, diagnostic: L, label: `Inconclusive: L ≈ ${L.toFixed(4)} ≈ 1` };
  }

  return { diagnostics, verdict };
}

/**
 * Apply the root test: compute |a_n|^{1/n} for n = 1..maxN.
 *
 * L < 1 → converges absolutely; L > 1 → diverges; L = 1 → inconclusive.
 */
export function rootTest(
  term: (n: number) => number,
  maxN: number = 200,
): { diagnostics: RootTestDiagnostic[]; verdict: ConvergenceVerdict } {
  const diagnostics: RootTestDiagnostic[] = [];

  for (let n = 1; n <= maxN; n++) {
    const absAn = Math.abs(term(n));
    if (absAn > 0) {
      diagnostics.push({ n, root: Math.pow(absAn, 1 / n) });
    }
  }

  if (diagnostics.length < 5) {
    return {
      diagnostics,
      verdict: { converges: null, diagnostic: null, label: 'Inconclusive (insufficient data)' },
    };
  }

  const tailCount = Math.max(5, Math.floor(diagnostics.length * 0.2));
  const tail = diagnostics.slice(-tailCount);
  const L = tail.reduce((s, d) => s + d.root, 0) / tail.length;

  let verdict: ConvergenceVerdict;
  if (L < 0.99) {
    verdict = { converges: true, diagnostic: L, label: `Converges: L ≈ ${L.toFixed(4)} < 1` };
  } else if (L > 1.01) {
    verdict = { converges: false, diagnostic: L, label: `Diverges: L ≈ ${L.toFixed(4)} > 1` };
  } else {
    verdict = { converges: null, diagnostic: L, label: `Inconclusive: L ≈ ${L.toFixed(4)} ≈ 1` };
  }

  return { diagnostics, verdict };
}

/**
 * Compute the integral test approximation using the trapezoidal rule.
 *
 * For f positive, continuous, and decreasing on [1, ∞):
 * ∫₁^N f(x)dx ≤ Σf(n) ≤ f(1) + ∫₁^N f(x)dx
 *
 * Returns both the integral estimate and partial sum so we can compare.
 */
export function integralTestApprox(
  f: (x: number) => number,
  maxN: number,
  steps: number = 1000,
): { integralValue: number; partialSum: number; ratio: number } {
  // Trapezoidal rule on [1, maxN]
  const h = (maxN - 1) / steps;
  let integral = 0.5 * (f(1) + f(maxN));
  for (let i = 1; i < steps; i++) {
    integral += f(1 + i * h);
  }
  integral *= h;

  // Partial sum
  let partialSum = 0;
  for (let n = 1; n <= maxN; n++) {
    partialSum += f(n);
  }

  const ratio = partialSum / (integral || 1);

  return { integralValue: integral, partialSum, ratio };
}

// ── Riemann rearrangement ───────────────────────────────────

/**
 * Construct a Riemann rearrangement of a conditionally convergent series
 * that converges to a specified target value.
 *
 * Algorithm: alternate between adding positive terms until the partial sum
 * exceeds the target, then adding negative terms until it drops below.
 * Because both the positive and negative subseries diverge to ±∞ (conditional
 * convergence), and the terms tend to 0, the overshoots shrink and the
 * rearranged partial sums converge to the target.
 */
export function riemannRearrangement(
  positiveTerms: (k: number) => number,
  negativeTerms: (k: number) => number,
  target: number,
  maxTerms: number,
): { terms: number[]; partialSums: number[] } {
  const terms: number[] = [];
  const partialSums: number[] = [];
  let sum = 0;
  let posIdx = 1;
  let negIdx = 1;

  for (let i = 0; i < maxTerms; i++) {
    if (sum <= target) {
      // Add positive terms until we exceed the target
      const t = positiveTerms(posIdx);
      posIdx++;
      terms.push(t);
      sum += t;
    } else {
      // Add negative terms until we drop below the target
      const t = -Math.abs(negativeTerms(negIdx));
      negIdx++;
      terms.push(t);
      sum += t;
    }
    partialSums.push(sum);
  }

  return { terms, partialSums };
}

// ── Benchmark series ────────────────────────────────────────

/**
 * Compute the geometric series sum 1/(1-r) or the partial sum (1-r^{n+1})/(1-r).
 * Returns null if |r| >= 1 (the infinite series diverges).
 */
export function geometricSeriesSum(
  r: number,
  n?: number,
): number | null {
  if (n !== undefined) {
    // Partial sum: (1 - r^{n+1}) / (1 - r) for r ≠ 1
    if (Math.abs(r - 1) < 1e-15) return n + 1;
    return (1 - Math.pow(r, n + 1)) / (1 - r);
  }

  // Infinite sum: converges only if |r| < 1
  if (Math.abs(r) >= 1) return null;
  return 1 / (1 - r);
}

/**
 * Classify a p-series: Σ 1/n^p converges iff p > 1.
 */
export function pSeriesConverges(p: number): boolean {
  return p > 1;
}

// ── Power series utilities (Topic 18) ──────────────────────

/**
 * Compute the radius of convergence of a power series
 * given its coefficient function aₙ.
 * Uses the Cauchy-Hadamard formula: 1/R = limsup |aₙ|^{1/n}.
 * Falls back to ratio test if root test is inconclusive.
 */
export function radiusOfConvergence(
  coefficients: (n: number) => number,
  maxTerms: number = 200,
): { radius: number; method: 'root' | 'ratio'; diagnostics: number[] } {
  // Cauchy-Hadamard via root test on coefficients
  const rootDiags: number[] = [];
  for (let n = 1; n <= maxTerms; n++) {
    const absAn = Math.abs(coefficients(n));
    if (absAn > 0 && isFinite(absAn)) {
      rootDiags.push(Math.pow(absAn, 1 / n));
    } else if (absAn === 0) {
      rootDiags.push(0);
    } else {
      // Infinity coefficient → R = 0
      return { radius: 0, method: 'root', diagnostics: rootDiags };
    }
  }

  // Estimate limsup from the tail
  const tailCount = Math.max(10, Math.floor(rootDiags.length * 0.2));
  const tail = rootDiags.slice(-tailCount);

  if (tail.length === 0) {
    return { radius: Infinity, method: 'root', diagnostics: rootDiags };
  }

  // limsup: take the max of the tail as an approximation
  const limsup = Math.max(...tail);

  if (limsup < 1e-12) {
    return { radius: Infinity, method: 'root', diagnostics: rootDiags };
  }

  if (!isFinite(limsup) || limsup > 1e12) {
    return { radius: 0, method: 'root', diagnostics: rootDiags };
  }

  const rootRadius = 1 / limsup;

  // Check if root test gave a clear answer (not ≈ inconclusive)
  const spread = Math.max(...tail) - Math.min(...tail);
  if (spread < 0.1 * limsup) {
    return { radius: rootRadius, method: 'root', diagnostics: rootDiags };
  }

  // Fallback: ratio test on coefficients
  const ratioDiags: number[] = [];
  for (let n = 1; n < maxTerms; n++) {
    const absAn = Math.abs(coefficients(n));
    const absAn1 = Math.abs(coefficients(n + 1));
    if (absAn > 1e-15 && isFinite(absAn) && isFinite(absAn1)) {
      ratioDiags.push(absAn / absAn1);  // R = lim |aₙ/aₙ₊₁|
    }
  }

  if (ratioDiags.length < 10) {
    return { radius: rootRadius, method: 'root', diagnostics: rootDiags };
  }

  const ratioTail = ratioDiags.slice(-tailCount);
  const ratioAvg = ratioTail.reduce((s, v) => s + v, 0) / ratioTail.length;

  if (!isFinite(ratioAvg) || ratioAvg > 1e12) {
    return { radius: Infinity, method: 'ratio', diagnostics: ratioDiags };
  }
  if (ratioAvg < 1e-12) {
    return { radius: 0, method: 'ratio', diagnostics: ratioDiags };
  }

  return { radius: ratioAvg, method: 'ratio', diagnostics: ratioDiags };
}

/**
 * Evaluate a power series partial sum Sₙ(x) = Σ_{k=0}^{n} aₖ (x - c)^k.
 */
export function powerSeriesEvaluate(
  coefficients: (k: number) => number,
  center: number,
  x: number,
  n: number,
): number {
  const dx = x - center;
  let sum = 0;
  let power = 1; // (x-c)^0 = 1

  for (let k = 0; k <= n; k++) {
    const ak = coefficients(k);
    if (isFinite(ak) && isFinite(power)) {
      sum += ak * power;
    }
    power *= dx;
  }

  return sum;
}

/**
 * Compute the differentiated power series coefficients.
 * If aₙ are the original coefficients, returns bₙ = (n+1) aₙ₊₁.
 */
export function differentiateCoefficients(
  coefficients: (n: number) => number,
): (n: number) => number {
  return (n: number) => (n + 1) * coefficients(n + 1);
}

/**
 * Compute the integrated power series coefficients.
 * If aₙ are the original coefficients, returns bₙ = aₙ₋₁/n for n ≥ 1, b₀ = 0.
 */
export function integrateCoefficients(
  coefficients: (n: number) => number,
): (n: number) => number {
  return (n: number) => {
    if (n === 0) return 0;
    return coefficients(n - 1) / n;
  };
}

// ── Re-exports for convenience ──────────────────────────────

export { generateSequence, computeEpsilonN } from './limits';
